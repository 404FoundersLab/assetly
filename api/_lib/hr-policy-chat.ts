/** HR policy Q&A helpers for the free-tier Gemini chatbot. */

export type HrPolicyDoc = {
  id: string;
  title: string;
  category: string;
  version: string;
  effectiveDate?: string;
  content: string;
  status?: string;
};

export type LeaveTypeDoc = {
  id: string;
  name: string;
  code: string;
  maxDays: number;
  description: string;
};

export function activePolicies(docs: HrPolicyDoc[] | undefined): HrPolicyDoc[] {
  return (docs || []).filter((p) => !p.status || p.status === 'active');
}

function scoreText(haystack: string, query: string): number {
  const h = haystack.toLowerCase();
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length > 1);
  if (tokens.length === 0) return 0;
  let score = 0;
  for (const t of tokens) {
    if (h.includes(t)) score += t.length > 3 ? 3 : 1;
  }
  return score;
}

export function searchHrPolicies(docs: HrPolicyDoc[] | undefined, query: string, limit = 3) {
  const active = activePolicies(docs);
  const q = (query || '').trim();
  if (!q) {
    return {
      policies: active.slice(0, limit).map((p) => ({
        id: p.id,
        title: p.title,
        category: p.category,
        version: p.version,
        effectiveDate: p.effectiveDate,
        excerpt: p.content.slice(0, 600),
      })),
    };
  }

  const ranked = active
    .map((p) => ({
      policy: p,
      score: scoreText(`${p.title} ${p.category} ${p.content}`, q),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    policies: ranked.map(({ policy: p }) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      version: p.version,
      effectiveDate: p.effectiveDate,
      excerpt: p.content.slice(0, 1200),
    })),
  };
}

export function getHrPolicy(docs: HrPolicyDoc[] | undefined, idOrTitle: string) {
  const active = activePolicies(docs);
  const key = (idOrTitle || '').trim().toLowerCase();
  const found =
    active.find((p) => p.id.toLowerCase() === key) ||
    active.find((p) => p.title.toLowerCase() === key) ||
    active.find((p) => p.title.toLowerCase().includes(key));

  if (!found) return { error: `No active policy matched "${idOrTitle}".` };
  return {
    policy: {
      id: found.id,
      title: found.title,
      category: found.category,
      version: found.version,
      effectiveDate: found.effectiveDate,
      content: found.content,
      portalPath: '/hr/policies',
    },
  };
}

export function listLeaveTypes(docs: LeaveTypeDoc[] | undefined) {
  return {
    leaveTypes: (docs || []).map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      maxDays: p.maxDays,
      description: p.description,
    })),
  };
}

/** Keyword fallback when Gemini key is missing. */
export function mockHrAnswer(
  message: string,
  companyPolicies: HrPolicyDoc[] | undefined,
  leavePolicies: LeaveTypeDoc[] | undefined,
): string | null {
  const text = message.toLowerCase();
  const hrIntent =
    text.includes('leave') ||
    text.includes('policy') ||
    text.includes('wfh') ||
    text.includes('remote') ||
    text.includes('maternity') ||
    text.includes('paternity') ||
    text.includes('sick') ||
    text.includes('casual') ||
    text.includes('annual') ||
    text.includes('harassment') ||
    text.includes('expense') ||
    text.includes('conduct') ||
    text.includes('vacation') ||
    text.includes('time off') ||
    text.includes('time-off');

  if (!hrIntent) return null;

  if (
    text.includes('leave type') ||
    text.includes('how many days') ||
    (text.includes('leave') && (text.includes('types') || text.includes('quota') || text.includes('allowance')))
  ) {
    const types = listLeaveTypes(leavePolicies).leaveTypes;
    if (types.length === 0) {
      return 'Leave type allowances are not loaded yet. Open [Leave Management](/hr/leaves) or ask HR.';
    }
    const lines = types.map((t) => `- **${t.name}** (${t.code}): ${t.maxDays} days — ${t.description}`);
    return (
      `Here are the leave allowances from the portal:\n\n${lines.join('\n')}\n\n` +
      `For full rules (carry-forward, certificates, notice), see the **Leave & Time-Off Policy** in [HR Policies](/hr/policies).`
    );
  }

  const { policies } = searchHrPolicies(companyPolicies, message, 2);
  if (policies.length === 0) {
    return (
      `I couldn't find a matching HR policy for that. Browse published documents in [HR Policies](/hr/policies) ` +
      `or ask about leave types, WFH, expenses, or code of conduct.`
    );
  }

  const blocks = policies.map(
    (p) =>
      `### ${p.title} (v${p.version})\n${p.excerpt}${p.excerpt.length >= 600 ? '…' : ''}\n` +
      `_Source: portal policy · [Open policies](/hr/policies)_`,
  );

  return (
    `Based on the **active HR policies** in the portal:\n\n${blocks.join('\n\n')}\n\n` +
    `I only answer from documents published in the HR portal — if something isn't covered, please check with HR.`
  );
}
