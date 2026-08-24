import type { AssetRequest, AssetRequestStatus, AssetRequestType, AssetCategory } from '../../types';
import { apiFetch } from './client';

export interface CreateAssetRequestPayload {
  requestType: AssetRequestType;
  category: AssetCategory;
  description: string;
  neededBy?: string;
}

export async function fetchAssetRequests(): Promise<AssetRequest[]> {
  return apiFetch<AssetRequest[]>('/api/requests');
}

export async function createAssetRequest(payload: CreateAssetRequestPayload): Promise<AssetRequest> {
  return apiFetch<AssetRequest>('/api/requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function reviewAssetRequest(
  id: string,
  status: AssetRequestStatus,
  reviewNotes?: string,
  assetId?: string,
): Promise<AssetRequest> {
  return apiFetch<AssetRequest>(`/api/requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reviewNotes, assetId }),
  });
}
