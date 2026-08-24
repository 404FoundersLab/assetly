import { getTenantSql } from './db';
import { embedText, toVectorLiteral } from './embeddings';
import type { HrPolicyDoc, LeaveTypeDoc } from './hr-policy-chat';

export type KnowledgeSourceType = 'hr_policy' | 'leave_policy';

export type KnowledgeHit = {
  sourceType: string;
  sourceId: string;
  sourceTitle: string;
  content: string;
};

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 40;
/** Bump this to force re-index when chunking rules change. */
const CHUNK_VERSION = 'v2-sections';

export function chunkText(text: string): string[] {
  const clean = text.replace(/\r\n/g, '\n').trim();
  if (!clean) return [];

  const headingParts = clean
    .split(/(?=(?:^|\n)\s*(?:\d+\.\s+[A-Z]|#{1,3}\s+|[A-Z][A-Za-z /&-]{2,40}\s+Policy\b))/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);

  const pieces: string[] = [];
  const sources = headingParts.length >= 2 ? headingParts : [clean];
  for (const section of sources) {
    if (section.length <= CHUNK_SIZE) {
      pieces.push(section);
      continue;
    }
    let start = 0;
    while (start < section.length) {
      let end = Math.min(start + CHUNK_SIZE, section.length);
      if (end < section.length) {
        const slice = section.slice(start, end);
        const lastBreak = Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf('\n'), slice.lastIndexOf('. '));
        if (lastBreak > CHUNK_SIZE * 0.35) end = start + lastBreak + 1;
      }
      const piece = section.slice(start, end).trim();
      if (piece) pieces.push(piece);
      if (end >= section.length) break;
      start = Math.max(0, end - CHUNK_OVERLAP);
    }
  }
  return pieces.length > 0 ? pieces : [clean];
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

type SourceDoc = {
  sourceType: KnowledgeSourceType;
  sourceId: string;
  sourceTitle: string;
  content: string;
};

function collectDocs(
  hrPolicies?: HrPolicyDoc[],
  leavePolicies?: LeaveTypeDoc[],
): SourceDoc[] {
  const docs: SourceDoc[] = [];
  for (const p of hrPolicies || []) {
    if (p.status && p.status !== 'active') continue;
    const content = [p.title, `Category: ${p.category}`, `Version: ${p.version}`, p.content]
      .filter(Boolean)
      .join('\n');
    if (!content.trim()) continue;
    docs.push({
      sourceType: 'hr_policy',
      sourceId: p.id,
      sourceTitle: p.title,
      content,
    });
  }
  for (const p of leavePolicies || []) {
    const content = `${p.name} (${p.code}): up to ${p.maxDays} days. ${p.description}`.trim();
    if (!content) continue;
    docs.push({
      sourceType: 'leave_policy',
      sourceId: p.id,
      sourceTitle: p.name,
      content,
    });
  }
  return docs;
}

export async function ingestKnowledge(
  tenantId: string,
  hrPolicies?: HrPolicyDoc[],
  leavePolicies?: LeaveTypeDoc[],
): Promise<{ indexed: number; skipped: number; chunks: number }> {
  if (!process.env.GEMINI_API_KEY) {
    return { indexed: 0, skipped: 0, chunks: 0 };
  }

  const docs = collectDocs(hrPolicies, leavePolicies);
  if (docs.length === 0) return { indexed: 0, skipped: 0, chunks: 0 };

  const sql = await getTenantSql(tenantId);
  let indexed = 0;
  let skipped = 0;
  let chunksWritten = 0;

  for (const doc of docs) {
    const contentHash = await sha256Hex(`${CHUNK_VERSION}:${doc.content}`);
    const existing = (await sql`
      SELECT content_hash
      FROM knowledge_chunks
      WHERE tenant_id = ${tenantId}
        AND source_type = ${doc.sourceType}
        AND source_id = ${doc.sourceId}
      LIMIT 1
    `) as { content_hash: string }[];

    if (existing[0]?.content_hash === contentHash) {
      skipped += 1;
      continue;
    }

    const pieces = chunkText(doc.content);
    if (pieces.length === 0) continue;

    await sql`
      DELETE FROM knowledge_chunks
      WHERE tenant_id = ${tenantId}
        AND source_type = ${doc.sourceType}
        AND source_id = ${doc.sourceId}
    `;

    for (let i = 0; i < pieces.length; i += 1) {
      const embedding = await embedText(pieces[i], 'RETRIEVAL_DOCUMENT');
      if (!embedding) continue;
      const id = crypto.randomUUID();
      const vectorLiteral = toVectorLiteral(embedding);
      await sql`
        INSERT INTO knowledge_chunks (
          id, tenant_id, source_type, source_id, source_title, chunk_index, content, content_hash, embedding
        ) VALUES (
          ${id}, ${tenantId}, ${doc.sourceType}, ${doc.sourceId}, ${doc.sourceTitle},
          ${i}, ${pieces[i]}, ${contentHash}, ${vectorLiteral}::vector
        )
      `;
      chunksWritten += 1;
    }
    indexed += 1;
  }

  return { indexed, skipped, chunks: chunksWritten };
}

export async function searchKnowledge(
  tenantId: string,
  query: string,
  limit = 5,
): Promise<KnowledgeHit[]> {
  const q = query.trim();
  if (!q) return [];

  let embedding: number[] | null = null;
  try {
    embedding = await embedText(q, 'RETRIEVAL_QUERY');
  } catch {
    return [];
  }
  if (!embedding) return [];

  const sql = await getTenantSql(tenantId);
  const vectorLiteral = toVectorLiteral(embedding);

  try {
    const rows = (await sql`
      SELECT source_type, source_id, source_title, content,
             1 - (embedding <=> ${vectorLiteral}::vector) AS score
      FROM knowledge_chunks
      WHERE tenant_id = ${tenantId}
      ORDER BY embedding <=> ${vectorLiteral}::vector
      LIMIT 12
    `) as {
      source_type: string;
      source_id: string;
      source_title: string;
      content: string;
      score: number;
    }[];

    const qLower = q.toLowerCase();
    const ranked = rows
      .map((r) => {
        const p = r.content.toLowerCase();
        let boost = 0;
        if (/wfh|work from home|remote|hybrid/.test(qLower)) {
          if (/\bwfh\b|work from home|hybrid|remote/.test(p)) boost += 0.2;
          if (/leave policy|annual paid leave|casual leave|sick leave/.test(p) && !/wfh|hybrid|remote/.test(p)) {
            boost -= 0.15;
          }
        }
        return { ...r, rank: (r.score ?? 0) + boost };
      })
      .filter((r) => r.rank > 0.22)
      .sort((a, b) => b.rank - a.rank)
      .slice(0, limit);

    return ranked.map((r) => ({
      sourceType: r.source_type,
      sourceId: r.source_id,
      sourceTitle: r.source_title,
      content: r.content,
    }));
  } catch {
    return [];
  }
}

export function formatRagContext(hits: KnowledgeHit[]): string {
  if (hits.length === 0) return '';
  const blocks = hits.map(
    (h, i) => `[${i + 1}] ${h.sourceTitle} (${h.sourceType})\n${h.content}`,
  );
  return `\n\nRETRIEVED COMPANY KNOWLEDGE:
Answer the user's question in 2-4 sentences using ONLY the relevant clause below.
If the document does not specify a number (e.g. WFH days per week), say that clearly — do not paste the whole manual.
Cite the policy title.

${blocks.join('\n\n')}`;
}
