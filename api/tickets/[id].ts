import { getTenantSql, json, error, corsPreflight, parseBody } from '../_lib/db';
import { requireAuth, canReviewRequests, insertAuditLog } from '../_lib/auth';
import { sendEmail, ticketStatusChangedEmail } from '../_lib/email';
import { mapTicket, type DbTicket } from './index';

export const config = { runtime: 'edge' };

const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

export default async function handler(req: Request, { params }: { params: { id: string } }) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);

  const ticketId = params?.id ?? new URL(req.url).pathname.split('/').pop() ?? '';
  if (!ticketId) return error('Ticket ID is required', 400);

  const sql = await getTenantSql(auth.tenantId!);

  try {
    // ── PATCH — update status / assign / resolution notes (admin only) ──────
    if (req.method === 'PATCH') {
      if (!canReviewRequests(auth.role)) {
        return error('Only IT admins can update tickets', 403);
      }

      // Verify ticket belongs to tenant
      const existing = await sql`
        SELECT t.*, e.email AS employee_email,
          e.first_name AS employee_first_name, e.last_name AS employee_last_name
        FROM support_tickets t
        JOIN employees e ON e.id = t.employee_id
        WHERE t.id = ${ticketId} AND t.tenant_id = ${auth.tenantId!}
        LIMIT 1
      ` as (DbTicket & { employee_email: string; employee_first_name: string; employee_last_name: string })[];

      if (!existing.length) return error('Ticket not found', 404);

      const body = await parseBody<Record<string, unknown>>(req);
      const status          = body.status          ? String(body.status).trim()          : undefined;
      const resolutionNotes = body.resolutionNotes  ? String(body.resolutionNotes).trim()  : undefined;
      const assignedTo      = body.assignedTo       ? String(body.assignedTo).trim()       : undefined;

      if (status && !VALID_STATUSES.includes(status)) return error('Invalid status', 400);

      const rows = await sql`
        UPDATE support_tickets
        SET
          status           = COALESCE(${status ?? null}, status),
          resolution_notes = COALESCE(${resolutionNotes ?? null}, resolution_notes),
          assigned_to      = COALESCE(${assignedTo ?? null}, assigned_to),
          updated_at       = NOW()
        WHERE id = ${ticketId} AND tenant_id = ${auth.tenantId!}
        RETURNING *
      ` as DbTicket[];

      const updated = rows[0];

      // Audit (non-blocking)
      void insertAuditLog({
        tenantId:   auth.tenantId,
        userId:     auth.sub,
        userName:   `${auth.firstName} ${auth.lastName}`,
        action:     'UPDATE',
        entityType: 'support_ticket',
        entityId:   ticketId,
        entityLabel: existing[0].title,
        details:    status ? `Status → ${status}` : 'Updated ticket',
      }).catch(() => {});

      // Email employee if status changed (non-blocking)
      if (status && status !== existing[0].status) {
        const appUrl = process.env.APP_URL ?? '';
        void sendEmail({
          to:      existing[0].employee_email,
          subject: `🔄 Ticket updated: ${existing[0].title}`,
          html:    ticketStatusChangedEmail({
            employeeName:    `${existing[0].employee_first_name} ${existing[0].employee_last_name}`,
            ticketId:        ticketId,
            title:           existing[0].title,
            newStatus:       status,
            resolutionNotes: resolutionNotes ?? updated.resolution_notes ?? undefined,
            appUrl,
          }),
        }).catch(() => {});
      }

      return json(mapTicket(updated));
    }

    return error('Method not allowed', 405);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Request failed';
    return error(message, 500);
  }
}
