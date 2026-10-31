import { apiFetch } from './client';
import type { ProductOpportunityAssignment } from '../../features/tasks/productIdeasData';

const ASSIGNMENTS_ENDPOINT = '/api/product-opportunities/assignments';

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