/** Free Gemini embeddings (text-embedding-004, 768-d). Same GEMINI_API_KEY as chat. */

export const GEMINI_EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'text-embedding-004';

export function toVectorLiteral(values: number[]): string {
  return `[${values.join(',')}]`;
}

export async function embedText(
  text: string,
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY',
): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const trimmed = text.trim().slice(0, 8000);
  if (!trimmed) return null;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:embedContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        model: `models/${GEMINI_EMBED_MODEL}`,
        content: { parts: [{ text: trimmed }] },
        taskType,
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Embedding failed (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as { embedding?: { values?: number[] } };
  const values = data.embedding?.values;
  if (!values?.length) return null;
  return values;
}
