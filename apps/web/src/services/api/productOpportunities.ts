import { apiFetch } from './client';
import type { ProductOpportunity, ProductOpportunityAssignment } from '../../features/tasks/productIdeasData';

const OPPORTUNITIES_ENDPOINT = '/api/product-opportunities';
const ASSIGNMENTS_ENDPOINT = '/api/product-opportunities/assignments';

export function fetchProductOpportunities(): Promise<ProductOpportunity[]> {
  return apiFetch<ProductOpportunity[]>(OPPORTUNITIES_ENDPOINT);
}

export function createProductOpportunity(opportunity: Partial<ProductOpportunity>): Promise<ProductOpportunity> {
  return apiFetch<ProductOpportunity>(OPPORTUNITIES_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(opportunity),
  });
}

export function batchCreateProductOpportunities(opportunities: ProductOpportunity[]): Promise<{ success: boolean; count: number }> {
  return apiFetch<{ success: boolean; count: number }>(OPPORTUNITIES_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(opportunities),
  });
}

export function updateProductOpportunity(opportunity: ProductOpportunity): Promise<ProductOpportunity> {
  return apiFetch<ProductOpportunity>(OPPORTUNITIES_ENDPOINT, {
    method: 'PUT',
    body: JSON.stringify(opportunity),
  });
}

export function deleteProductOpportunity(id: string): Promise<{ success: boolean; id: string }> {
  return apiFetch<{ success: boolean; id: string }>(`${OPPORTUNITIES_ENDPOINT}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function fetchProductOpportunityAssignments(): Promise<ProductOpportunityAssignment[]> {
  return apiFetch<ProductOpportunityAssignment[]>(ASSIGNMENTS_ENDPOINT);
}

export function saveProductOpportunityAssignments(input: {
  opportunityId: string;
  assigneeIds: string[];
  workStatus: ProductOpportunityAssignment['workStatus'];
  nextStep: string;
}): Promise<ProductOpportunityAssignment[]> {
  return apiFetch<ProductOpportunityAssignment[]>(ASSIGNMENTS_ENDPOINT, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}
