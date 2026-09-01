import { getTenantSql, json, error, corsPreflight, parseBody } from '../_lib/db';
import {
  requireAuth,
  canReviewRequests,
  canSearchAssets,
  type AuthUser,
} from '../_lib/auth';
import { resolveEmployeeIdByLoginEmail } from '../_lib/employee-auth';
import {
  getHrPolicy,
  listLeaveTypes,
  mockHrAnswer,
  searchHrPolicies,
  type HrPolicyDoc,
  type LeaveTypeDoc,
} from '../_lib/hr-policy-chat';
import { formatRagContext, searchKnowledge, type KnowledgeHit } from '../_lib/rag';
import { answerFromPolicyPassages, pickRelevantPassages } from '../_lib/policy-extract';

export const config = { runtime: 'edge' };

/** Free-tier friendly default (2.0-flash often has limit: 0 on free tier). */
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const GEMINI_FALLBACK_MODELS = [
  GEMINI_MODEL,
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.7-flash',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
].filter((m, i, arr) => arr.indexOf(m) === i);

function isRetryableGeminiStatus(status: number, errText: string): boolean {
  return (
    status === 429 ||
    status === 404 ||
    status === 503 ||
    /RESOURCE_EXHAUSTED|quota|UNAVAILABLE|high demand|try again later/i.test(errText)
  );
}

function policyFallbackText(
  userMessage: string,
  hrPolicies: HrPolicyDoc[] | undefined,
  leavePolicies: LeaveTypeDoc[] | undefined,
  ragHits: KnowledgeHit[],
  reason: 'busy' | 'quota' | 'empty',
): string {
  const note =
    reason === 'busy'
      ? '_Note: Gemini is busy right now, so this answer used your indexed company policies instead._'
      : reason === 'quota'
        ? '_Note: Gemini free-tier quota was exceeded, so this answer used portal policy search instead._'
        : '';

  if (ragHits.length > 0 || (hrPolicies && hrPolicies.length > 0)) {
    const corpus = [
      ...ragHits.map((h) => h.content),
      ...(hrPolicies || []).filter((p) => !p.status || p.status === 'active').map((p) => p.content),
    ];
    const passages = pickRelevantPassages(corpus, userMessage, 2);
    const title = ragHits[0]?.sourceTitle || hrPolicies?.[0]?.title || 'HR policy';
    const precise = answerFromPolicyPassages(userMessage, title, passages);
    if (precise) return note ? `${precise}\n\n${note}` : precise;
  }

  const hrAnswer = mockHrAnswer(userMessage, hrPolicies, leavePolicies);
  if (hrAnswer) return note ? `${hrAnswer}\n\n${note}` : hrAnswer;

  const keyword = searchHrPolicies(hrPolicies, userMessage, 2);
  if (keyword.policies.length > 0) {
    const body = keyword.policies
      .map((p) => `**${p.title}** (v${p.version})\n${p.excerpt}`)
      .join('\n\n');
    return `${body}${note ? `\n\n${note}` : ''}`;
  }

  if (reason === 'busy') {
    return 'Gemini is experiencing high demand right now. Please try again in a minute, or open [HR Policies](/hr/policies) to read the document directly.';
  }
  if (reason === 'quota') {
    return 'Gemini free-tier quota is exhausted right now. Wait a minute and try again, or ask an HR policy question — I can still answer from documents in [HR Policies](/hr/policies) without AI.';
  }
  return 'I could not find a matching policy for that. Browse [HR Policies](/hr/policies) or rephrase the question.';
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function resolveEmployeeId(auth: AuthUser): Promise<string | null> {
  const sql = await getTenantSql(auth.tenantId!);

  if (auth.employeeId && isUuid(auth.employeeId)) {
    return auth.employeeId;
  }

  try {
    return await resolveEmployeeIdByLoginEmail(sql, auth.tenantId!, auth.email);
  } catch {
    return null;
  }
}

// Database Tool Helpers
async function listMyRequests(employeeId: string, tenantId: string) {
  const sql = await getTenantSql(tenantId);
  const rows = await sql`
    SELECT id, request_type as "requestType", category, description, needed_by as "neededBy", status, created_at as "createdAt"
    FROM asset_requests
    WHERE tenant_id = ${tenantId} AND employee_id = ${employeeId}
    ORDER BY created_at DESC
  `;
  return { requests: rows };
}

async function listMyAssets(employeeId: string, tenantId: string) {
  const sql = await getTenantSql(tenantId);
  const rows = await sql`
    SELECT id, name, asset_tag as "assetTag", category, status, serial_number as "serialNumber"
    FROM assets
    WHERE tenant_id = ${tenantId} AND assigned_employee_id = ${employeeId}
  `;
  return { assets: rows };
}

async function submitDeviceRequest(employeeId: string, tenantId: string, args: { requestType: string; category: string; description: string; neededBy?: string }) {
  const sql = await getTenantSql(tenantId);
  const neededBy = args.neededBy || null;
  const rows = (await sql`
    INSERT INTO asset_requests (
      tenant_id, employee_id, request_type, category, description, needed_by, status
    ) VALUES (
      ${tenantId}, ${employeeId}, ${args.requestType}, ${args.category}, ${args.description}, ${neededBy}, 'submitted'
    )
    RETURNING id, request_type as "requestType", category, description, needed_by as "neededBy", status, created_at as "createdAt"
  `) as any[];
  return { success: true, request: rows[0] };
}

async function listAllRequests(tenantId: string) {
  const sql = await getTenantSql(tenantId);
  const rows = await sql`
    SELECT r.id, r.request_type as "requestType", r.category, r.description, r.needed_by as "neededBy", r.status, r.created_at as "createdAt",
           e.first_name || ' ' || e.last_name as "employeeName", e.email as "employeeEmail"
    FROM asset_requests r
    JOIN employees e ON e.id = r.employee_id
    WHERE r.tenant_id = ${tenantId}
    ORDER BY r.created_at DESC
    LIMIT 20
  `;
  return { requests: rows };
}

async function searchAssets(tenantId: string, args: { query?: string; category?: string; status?: string }) {
  const sql = await getTenantSql(tenantId);
  let rows;
  const category = args.category || null;
  const status = args.status || null;
  const textQuery = args.query ? `%${args.query}%` : null;

  if (textQuery && category && status) {
    rows = await sql`
      SELECT id, name, asset_tag as "assetTag", category, status, serial_number as "serialNumber"
      FROM assets
      WHERE tenant_id = ${tenantId} AND category = ${category} AND status = ${status}
        AND (name ILIKE ${textQuery} OR asset_tag ILIKE ${textQuery} OR serial_number ILIKE ${textQuery})
      LIMIT 15
    `;
  } else if (category && status) {
    rows = await sql`
      SELECT id, name, asset_tag as "assetTag", category, status, serial_number as "serialNumber"
      FROM assets
      WHERE tenant_id = ${tenantId} AND category = ${category} AND status = ${status}
      LIMIT 15
    `;
  } else if (textQuery) {
    rows = await sql`
      SELECT id, name, asset_tag as "assetTag", category, status, serial_number as "serialNumber"
      FROM assets
      WHERE tenant_id = ${tenantId} 
        AND (name ILIKE ${textQuery} OR asset_tag ILIKE ${textQuery} OR serial_number ILIKE ${textQuery})
      LIMIT 15
    `;
  } else {
    rows = await sql`
      SELECT id, name, asset_tag as "assetTag", category, status, serial_number as "serialNumber"
      FROM assets
      WHERE tenant_id = ${tenantId}
      LIMIT 15
    `;
  }
  return { assets: rows };
}

async function executeTool(
  name: string,
  args: any,
  role: string,
  employeeId: string | null,
  tenantId: string,
  hrPolicies: HrPolicyDoc[] | undefined,
  leavePolicies: LeaveTypeDoc[] | undefined,
  ragHits: KnowledgeHit[] = [],
) {
  try {
    if (name === 'list_my_requests') {
      if (!employeeId) return { error: 'No employee record found.' };
      return await listMyRequests(employeeId, tenantId);
    }
    if (name === 'list_my_assets') {
      if (!employeeId) return { error: 'No employee record found.' };
      return await listMyAssets(employeeId, tenantId);
    }
    if (name === 'submit_device_request') {
      if (!employeeId) return { error: 'No employee record found.' };
      return await submitDeviceRequest(employeeId, tenantId, args);
    }
    if (name === 'list_all_requests') {
      if (!canReviewRequests(role)) return { error: 'Unauthorized' };
      return await listAllRequests(tenantId);
    }
    if (name === 'search_assets') {
      if (!canSearchAssets(role)) return { error: 'Unauthorized' };
      return await searchAssets(tenantId, args);
    }
    if (name === 'search_knowledge') {
      if (ragHits.length > 0) {
        return {
          chunks: ragHits.map((h) => ({
            title: h.sourceTitle,
            sourceType: h.sourceType,
            excerpt: h.content,
          })),
        };
      }
      const hits = await searchKnowledge(tenantId, args?.query || '', 5);
      return {
        chunks: hits.map((h) => ({
          title: h.sourceTitle,
          sourceType: h.sourceType,
          excerpt: h.content,
        })),
      };
    }
    if (name === 'search_hr_policies') {
      return searchHrPolicies(hrPolicies, args?.query || '', 3);
    }
    if (name === 'get_hr_policy') {
      return getHrPolicy(hrPolicies, args?.idOrTitle || '');
    }
    if (name === 'list_leave_types') {
      return listLeaveTypes(leavePolicies);
    }
    return { error: `Tool ${name} not found.` };
  } catch (err: any) {
    return { error: err.message || 'Tool execution failed' };
  }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();
  if (req.method !== 'POST') return error('Method not allowed', 405);

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId! && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);
  if (auth instanceof Response) return auth;

  const employeeId = await resolveEmployeeId(auth);
  const apiKey = process.env.GEMINI_API_KEY;
  let userMessage = '';
  let hrPolicies: HrPolicyDoc[] | undefined;
  let leavePolicies: LeaveTypeDoc[] | undefined;
  let ragHits: KnowledgeHit[] = [];

  try {
    const body = await parseBody<{
      message: string;
      history?: any[];
      currentPath?: string;
      hrPolicies?: HrPolicyDoc[];
      leavePolicies?: LeaveTypeDoc[];
    }>(req);
    userMessage = body.message;
    const history = body.history || [];
    const currentPath = body.currentPath || '/';
    hrPolicies = body.hrPolicies;
    leavePolicies = body.leavePolicies;
    const isHrContext = currentPath.startsWith('/hr');

    if (!userMessage) return error('message is required', 400);

    // Fallback: If no Gemini API Key is configured, return mock responses
    if (!apiKey) {
      return handleMockMode(userMessage, auth, employeeId, currentPath, hrPolicies, leavePolicies);
    }

    interface GeminiPart {
      text?: string;
      functionCall?: {
        name: string;
        args: any;
      };
      functionResponse?: {
        name: string;
        response: any;
      };
    }

    interface GeminiContent {
      role: 'user' | 'model';
      parts: GeminiPart[];
    }

    // Construct history for Gemini API
    // Gemini API history expects format: { role: 'user'|'model', parts: [{ text: string }] }
    const contents: GeminiContent[] = history.map((h: any) => ({
      role: (h.role === 'ai' ? 'model' : 'user') as 'model' | 'user',
      parts: [{ text: h.text }]
    }));
    contents.push({ role: 'user', parts: [{ text: userMessage }] });

    try {
      ragHits = await searchKnowledge(auth.tenantId!, userMessage, 5);
    } catch {
      ragHits = [];
    }

    const ragContext = formatRagContext(ragHits);

    const hrPolicyInstructions = `
HR POLICY & LEAVE Q&A (use free-tier tools — do not invent rules):
- Prefer RETRIEVED COMPANY KNOWLEDGE and search_knowledge for policy / leave / WFH questions.
- You may also call search_hr_policies, get_hr_policy, or list_leave_types.
- Answer ONLY from retrieved chunks or tool results. If nothing relevant, say you don't know and point to /hr/policies.
- Always cite policy title. Mention employees can open [HR Policies](/hr/policies).
- Chatting is NOT policy acknowledgement. Do not approve leave requests; guide users to /hr/leaves to apply.
- Keep answers concise to stay within free-tier token limits.${ragContext}`;

    const systemInstructionText = auth.role === 'employee'
      ? `You are Assetly AI, a virtual assistant for employee self-service.
You are helping the employee who is currently viewing the page: ${currentPath}.
You can help employees query their assigned hardware/assets or view their submitted device requests.
You can also submit new requests on their behalf.
When they request a device, replacement, or accessory, use the 'submit_device_request' tool.
${hrPolicyInstructions}
Provide clear, conversational answers. Keep formatting clean.

CRITICAL JSON FORMATTING RULES:
If you are displaying a list of assets or requests (either retrieved from a tool or query), you MUST append a JSON block at the end of your response, wrapped in a single \`\`\`json ... \`\`\` code block, representing the raw data in this schema:
For assets: {"type": "assets", "items": [{"id": "...", "name": "...", "assetTag": "...", "category": "...", "status": "...", "serialNumber": "..."}]}
For requests: {"type": "requests", "items": [{"id": "...", "category": "...", "requestType": "...", "description": "...", "status": "...", "createdAt": "..."}]}`
      : `You are Assetly Copilot for IT Administrators and HR.
You are helping the user who is currently viewing the page: ${currentPath}.
You can search assets in the inventory or review submitted device requests.
When queried about requests, list them. If asked about assets, use search_assets.
${hrPolicyInstructions}
${isHrContext ? 'The user is in the HR module — prefer HR policy / leave tools when relevant.' : ''}

CRITICAL JSON FORMATTING RULES:
If you are displaying a list of assets or requests (either retrieved from a tool or query), you MUST append a JSON block at the end of your response, wrapped in a single \`\`\`json ... \`\`\` code block, representing the raw data in this schema:
For assets: {"type": "assets", "items": [{"id": "...", "name": "...", "assetTag": "...", "category": "...", "status": "...", "serialNumber": "..."}]}
For requests: {"type": "requests", "items": [{"id": "...", "category": "...", "requestType": "...", "description": "...", "status": "...", "createdAt": "...", "employeeName": "..."}]}`;

    const systemInstruction = {
      parts: [{ text: systemInstructionText }]
    };

    const tools = [
      {
        functionDeclarations: [
          {
            name: 'list_my_requests',
            description: 'Get a list of the active and historical device requests submitted by the logged in employee.'
          },
          {
            name: 'list_my_assets',
            description: 'Get a list of the hardware assets currently assigned to the logged in employee.'
          },
          {
            name: 'submit_device_request',
            description: 'Submit a new request for hardware, replacements, or accessories for the employee.',
            parameters: {
              type: 'OBJECT',
              properties: {
                requestType: {
                  type: 'STRING',
                  description: 'The type of request: must be one of "new", "replacement", or "accessory".',
                },
                category: {
                  type: 'STRING',
                  description: 'The category of device: e.g. "laptop", "monitor", "mouse", "keyboard", "mobile", "other".',
                },
                description: {
                  type: 'STRING',
                  description: 'The justification or explanation of what is needed and why.',
                },
                neededBy: {
                  type: 'STRING',
                  description: 'Optional. The date needed by in YYYY-MM-DD format.',
                }
              },
              required: ['requestType', 'category', 'description']
            }
          },
          {
            name: 'list_all_requests',
            description: 'IT Admins only: Retrieve a list of all submitted device requests across the organization.'
          },
          {
            name: 'search_assets',
            description: 'IT Admins only: Search for hardware assets in the system database.',
            parameters: {
              type: 'OBJECT',
              properties: {
                query: { type: 'STRING', description: 'Search keywords (asset tag, name, or serial number).' },
                category: { type: 'STRING', description: 'Filter by category (e.g. laptop, desktop, mobile).' },
                status: { type: 'STRING', description: 'Filter by status (e.g. deployed, in_stock, in_repair).' }
              }
            }
          },
          {
            name: 'search_knowledge',
            description: 'Semantic RAG search over indexed company HR and leave policies. Use for policy, leave, WFH, conduct, or similar questions.',
            parameters: {
              type: 'OBJECT',
              properties: {
                query: {
                  type: 'STRING',
                  description: 'The employee question or key phrases to search.',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'search_hr_policies',
            description: 'Keyword fallback search of HR policies from the portal payload. Use if search_knowledge returns nothing.',
            parameters: {
              type: 'OBJECT',
              properties: {
                query: {
                  type: 'STRING',
                  description: 'Keywords from the employee question, e.g. "sick leave medical certificate", "WFH days", "expense limits".',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_hr_policy',
            description: 'Fetch the full text of one active HR policy by id or title.',
            parameters: {
              type: 'OBJECT',
              properties: {
                idOrTitle: {
                  type: 'STRING',
                  description: 'Policy id (e.g. cpol-005) or title fragment (e.g. Leave & Time-Off).',
                },
              },
              required: ['idOrTitle'],
            },
          },
          {
            name: 'list_leave_types',
            description: 'List leave type allowances (Annual, Sick, Casual, Maternity, Paternity) with max days from the HR leave policies tab.',
          },
        ]
      }
    ];

    let finalResponseText = '';
    let currentContents = [...contents];
    const maxLoops = 3;
    let activeModel = GEMINI_FALLBACK_MODELS[0];
    let modelIndex = 0;

    const callGemini = async (model: string, payload: unknown) => {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey!,
          },
          body: JSON.stringify(payload),
        },
      );
      const errText = res.ok ? '' : await res.text();
      return { res, errText };
    };

    for (let loop = 0; loop < maxLoops; loop++) {
      const payload: Record<string, unknown> = {
        contents: currentContents,
        systemInstruction,
      };
      // When RAG already retrieved policy chunks, skip tools so Gemini writes an answer
      // instead of calling a function and returning empty text.
      if (ragHits.length === 0) {
        payload.tools = tools;
      }

      let { res, errText } = await callGemini(activeModel, payload);

      while (!res.ok && isRetryableGeminiStatus(res.status, errText) && modelIndex < GEMINI_FALLBACK_MODELS.length - 1) {
        modelIndex += 1;
        activeModel = GEMINI_FALLBACK_MODELS[modelIndex];
        ({ res, errText } = await callGemini(activeModel, payload));
      }

      if (!res.ok) {
        if (isRetryableGeminiStatus(res.status, errText)) {
          const busy = res.status === 503 || /UNAVAILABLE|high demand/i.test(errText);
          return json({
            text: policyFallbackText(userMessage, hrPolicies, leavePolicies, ragHits, busy ? 'busy' : 'quota'),
          });
        }
        throw new Error(`Gemini API error: ${errText}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const responseData = (await res.json()) as any;
      const candidate = responseData.candidates?.[0];
      const modelContent = candidate?.content;

      if (!modelContent) {
        finalResponseText = "I encountered an error trying to process that request.";
        break;
      }

      currentContents.push({
        ...modelContent,
        role: 'model',
      });

      const partWithFunctionCall = modelContent.parts?.find((p: any) => p.functionCall);
      if (partWithFunctionCall && partWithFunctionCall.functionCall) {
        const { name, args } = partWithFunctionCall.functionCall;
        const toolResult = await executeTool(
          name,
          args,
          auth.role,
          employeeId,
          auth.tenantId!,
          hrPolicies,
          leavePolicies,
          ragHits,
        );

        currentContents.push({
          role: 'user',
          parts: [{
            functionResponse: {
              name,
              response: toolResult && typeof toolResult === 'object' ? toolResult : { result: toolResult },
            },
          }],
        });
      } else {
        const textParts = (modelContent.parts || [])
          .map((p: { text?: string }) => p.text)
          .filter(Boolean) as string[];
        finalResponseText = textParts.join('\n').trim();
        break;
      }
    }

    if (!finalResponseText.trim()) {
      return json({
        text: policyFallbackText(userMessage, hrPolicies, leavePolicies, ragHits, 'empty'),
      });
    }

    return json({ text: finalResponseText });
  } catch (err: any) {
    const msg = String(err?.message || 'Unknown error');
    if (/429|503|RESOURCE_EXHAUSTED|quota|UNAVAILABLE|high demand/i.test(msg)) {
      const busy = /503|UNAVAILABLE|high demand/i.test(msg);
      return json({
        text: policyFallbackText(userMessage, hrPolicies, leavePolicies, ragHits, busy ? 'busy' : 'quota'),
      });
    }
    return json({ text: `AI integration error: ${msg}` });
  }
}

// Mock-mode fallback for when no GEMINI_API_KEY is configured
async function handleMockMode(
  message: string,
  auth: AuthUser,
  employeeId: string | null,
  currentPath: string,
  hrPolicies?: HrPolicyDoc[],
  leavePolicies?: LeaveTypeDoc[],
) {
  const text = message.toLowerCase();

  const hrAnswer = mockHrAnswer(message, hrPolicies, leavePolicies);
  if (hrAnswer) {
    return json({ text: hrAnswer });
  }

  let textResponse = '';
  
  if (text.includes('status') || text.includes('request')) {
    if (auth.role === 'employee' && employeeId) {
      const data = await listMyRequests(employeeId, auth.tenantId!);
      if ((data.requests as any[]).length === 0) {
        textResponse = `You don't have any submitted device requests at the moment. You can submit one in the Request form above!`;
      } else {
        textResponse = `Here are your recent device requests:\n\n\`\`\`json\n${JSON.stringify({ type: 'requests', items: data.requests })}\n\`\`\``;
      }
    } else {
      const data = await listAllRequests(auth.tenantId!);
      textResponse = `Here are the organization's device requests (IT Admin view):\n\n\`\`\`json\n${JSON.stringify({ type: 'requests', items: data.requests })}\n\`\`\``;
    }
  } else if (text.includes('asset') || text.includes('device') || text.includes('laptop') || text.includes('hardware')) {
    if (auth.role === 'employee' && employeeId) {
      const data = await listMyAssets(employeeId, auth.tenantId!);
      if ((data.assets as any[]).length === 0) {
        textResponse = `You don't have any corporate hardware assets assigned to you at the moment.`;
      } else {
        textResponse = `Here are the corporate assets assigned to you:\n\n\`\`\`json\n${JSON.stringify({ type: 'assets', items: data.assets })}\n\`\`\``;
      }
    } else {
      textResponse = `As an Administrator, you can view the Asset inventory in the [Assets list](/assets) or search devices using standard dashboard tools. Configure the \`GEMINI_API_KEY\` in your \`.env\` file to enable natural language AI search!`;
    }
  } else if (text.includes('page') || text.includes('where am i')) {
    textResponse = `You are currently viewing the **${currentPath}** route of the Assetly application. Let me know if you need help navigating or finding information related to this page!`;
  } else {
    textResponse = `Hello **${auth.firstName}**! I'm the **Assetly AI Assistant**.\n\n` +
      `To activate full natural language capabilities, please add a \`GEMINI_API_KEY\` to your \`.env\` file (free Gemini tier works).\n\n` +
      `Currently, I am operating in **mock responder mode**. Try asking me:\n` +
      `- *"How many sick leave days do I get?"*\n` +
      `- *"What is the remote work policy?"*\n` +
      `- *"Show my active requests"*`;
  }

  return json({ text: textResponse });
}
