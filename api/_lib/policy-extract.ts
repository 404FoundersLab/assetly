/** Split policy manuals into heading-sized sections and answer from the best match. */

const SECTION_SPLIT = /(?=(?:^|\n)\s*(?:\d+\.\s+|[A-Z][A-Za-z /&-]{2,40}\s+Policy\b|#{1,3}\s+))/g;

export function splitPolicySections(text: string): string[] {
  const clean = (text || '').replace(/\r\n/g, '\n').trim();
  if (!clean) return [];
  const parts = clean
    .split(SECTION_SPLIT)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
  return parts.length >= 2 ? parts : [clean];
}

function queryTokens(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/work\s*from\s*home/g, 'wfh')
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length > 1 && !['how', 'many', 'the', 'are', 'is', 'in', 'a', 'an', 'of', 'for', 'am', 'i', 'to', 'under'].includes(t));
}

export function scorePassage(passage: string, query: string): number {
  const p = passage.toLowerCase().replace(/work\s*from\s*home/g, 'wfh');
  const tokens = queryTokens(query);
  let score = 0;
  for (const t of tokens) {
    if (p.includes(t)) score += t.length > 3 ? 3 : 1;
  }
  if (/\bwfh\b|hybrid|remote/.test(p) && /wfh|remote|hybrid|home/.test(query.toLowerCase())) score += 8;
  if (/leave|sick|casual|annual|maternity/.test(p) && !/wfh|remote|hybrid|home/.test(query.toLowerCase())) {
    /* leave docs are fine for leave questions */
  } else if (/leave policy|annual paid leave|casual leave/.test(p) && /wfh|remote|hybrid|home/.test(query.toLowerCase())) {
    score -= 6;
  }
  return score;
}

export function pickRelevantPassages(texts: string[], query: string, limit = 2): string[] {
  const sections = texts.flatMap((t) => splitPolicySections(t));
  return sections
    .map((s) => ({ s, score: scorePassage(s, query) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.s.trim());
}

function findWeeklyWfhDays(text: string): string | null {
  const patterns = [
    /(\d+)\s*(?:wfh|work[\s-]*from[\s-]*home)?\s*days?\s*(?:per|a|\/)\s*week/i,
    /(?:wfh|work[\s-]*from[\s-]*home|remote)\s*(?:up to|upto|allowed)?\s*(\d+)\s*days?\s*(?:per|a|\/)\s*week/i,
    /(\d+)\s*days?\s*(?:wfh|remote|work[\s-]*from[\s-]*home)\s*(?:per|a|\/)\s*week/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

/** Precise extractive answer when Gemini is unavailable or returns empty. */
export function answerFromPolicyPassages(
  query: string,
  sourceTitle: string,
  passages: string[],
): string | null {
  if (passages.length === 0) return null;
  const joined = passages.join('\n\n');
  const q = query.toLowerCase();
  const wantsWeeklyWfh =
    (q.includes('wfh') || q.includes('work from') || q.includes('remote') || q.includes('hybrid') || q.includes('home')) &&
    (q.includes('week') || q.includes('days') || q.includes('how many') || q.includes('allowed'));

  if (wantsWeeklyWfh) {
    const days = findWeeklyWfhDays(joined);
    const quoted = passages[0].slice(0, 900);
    if (days) {
      return (
        `**${days} WFH day(s) per week** according to **${sourceTitle}**.\n\n` +
        `${quoted}\n\n` +
        `_Source: ${sourceTitle} · [HR Policies](/hr/policies)_`
      );
    }
    return (
      `The **Work From Home / hybrid policy does not specify a fixed number of WFH days per week.** ` +
      `It requires manager approval and sets working-hour / connectivity rules instead.\n\n` +
      `${quoted}\n\n` +
      `Please confirm the weekly pattern with your manager. Full document: [HR Policies](/hr/policies).`
    );
  }

  return (
    `From **${sourceTitle}**:\n\n${passages[0].slice(0, 900)}\n\n` +
    `_Source: ${sourceTitle} · [HR Policies](/hr/policies)_`
  );
}
