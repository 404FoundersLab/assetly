import type { SupportTicket, TicketStatus, TicketCategory, TicketPriority } from '../../types';
import { apiFetch } from './client';

export interface CreateTicketPayload {
  title:       string;
  description: string;
  category:    TicketCategory;
  priority:    TicketPriority;
}

export interface UpdateTicketPayload {
  status?:          TicketStatus;
  resolutionNotes?: string;
  assignedTo?:      string;
}

export async function fetchTickets(): Promise<SupportTicket[]> {
  return apiFetch<SupportTicket[]>('/api/tickets');
}

export async function createTicket(payload: CreateTicketPayload): Promise<SupportTicket> {
  return apiFetch<SupportTicket>('/api/tickets', {
    method: 'POST',
    body:   JSON.stringify(payload),
  });
}

export async function updateTicket(id: string, patch: UpdateTicketPayload): Promise<SupportTicket> {
  return apiFetch<SupportTicket>(`/api/tickets/${id}`, {
    method: 'PATCH',
    body:   JSON.stringify(patch),
  });
}
