import { apiFetch } from './client';

export async function ingestChatKnowledge(payload: {
  hrPolicies: Array<{
    id: string;
    title: string;
    category: string;
    version: string;
    effectiveDate?: string;
    content: string;
    status?: string;
  }>;
  leavePolicies: Array<{
    id: string;
    name: string;
    code: string;
    maxDays: number;
    description: string;
  }>;
}): Promise<{ indexed: number; skipped: number; chunks: number }> {
  return apiFetch('/api/chat/ingest', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
