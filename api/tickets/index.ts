import { getTenantSql, json, error, corsPreflight, parseBody } from '../_lib/db';
import { requireAuth, canReviewRequests, insertAuditLog } from '../_lib/auth';
import { resolveEmployeeIdByLoginEmail } from '../_lib/employee-auth';
import { sendEmail, ticketCreatedEmail } from '../_lib/email';

export const config = { runtime: 'edge' };

export interface DbTicket {
  id: string;
  tenant_id: string;
  employee_id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  // joined fields
  employee_first_name?: string;
  employee_last_name?: string;
  employee_email?: string;
  department_name?: string;
}

export function mapTicket(row: DbTicket) {
  return {
    id:               row.id,
    tenantId:         row.tenant_id,
    employeeId:       row.employee_id,
    title:            row.title,
    description:      row.description,
    category:         row.category as 'hardware' | 'software' | 'access' | 'network' | 'other',
    priority:         row.priority as 'low' | 'medium' | 'high' | 'critical',
    status:           row.status as 'open' | 'in_progress' | 'resolved' | 'closed',
    assignedTo:       row.assigned_to ?? undefined,
    resolutionNotes:  row.resolution_notes ?? undefined,
    createdAt:        row.created_at,
    updatedAt:        row.updated_at,
    employeeName: row.employee_first_name && row.employee_last_name
      ? `${row.employee_first_name} ${row.employee_last_name}`
      : undefined,
    employeeEmail:    row.employee_email,
    departmentName:   row.department_name ?? undefined,
  };
}

const VALID_CATEGORIES = ['hardware', 'software', 'access', 'network', 'other'];
const VALID_PRIORITIES  = ['low', 'medium', 'high', 'critical'];

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);

  const sql = await getTenantSql(auth.tenantId!);

  try {
    // ── GET ──────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      if (canReviewRequests(auth.role)) {
        // Admins see all tickets for the tenant
        const rows = await sql`
          SELECT t.*,
            e.first_name AS employee_first_name,
            e.last_name  AS employee_last_name,
            e.email      AS employee_email,
            d.name       AS department_name
          FROM support_tickets t
          JOIN employees e ON e.id = t.employee_id
          LEFT JOIN departments d ON d.id = e.department_id
          WHERE t.tenant_id = ${auth.tenantId!}
          ORDER BY t.created_at DESC
        ` as DbTicket[];
        return json(rows.map(mapTicket));
      }

      if (auth.role === 'employee') {
        // Resolve employee id
        let employeeId = auth.employeeId;
        if (!employeeId) {
          const resolved = await resolveEmployeeIdByLoginEmail(sql, auth.tenantId!, auth.email);
          if (!resolved) return error('Employee record not found', 403);
          employeeId = resolved;
        }
        const rows = await sql`
          SELECT t.*,
            e.first_name AS employee_first_name,
            e.last_name  AS employee_last_name,
            e.email      AS employee_email,
            d.name       AS department_name
          FROM support_tickets t
          JOIN employees e ON e.id = t.employee_id
          LEFT JOIN departments d ON d.id = e.department_id
          WHERE t.tenant_id = ${auth.tenantId!} AND t.employee_id = ${employeeId}
          ORDER BY t.created_at DESC
        ` as DbTicket[];
        return json(rows.map(mapTicket));
      }

      return error('Forbidden', 403);
    }

    // ── POST ─────────────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      if (auth.role !== 'employee') {
        return error('Only employees can create support tickets', 403);
      }

      let employeeId = auth.employeeId;
      if (!employeeId) {
        const resolved = await resolveEmployeeIdByLoginEmail(sql, auth.tenantId!, auth.email);
        if (!resolved) return error('Employee record not found', 403);
        employeeId = resolved;
      }

      const body = await parseBody<Record<string, unknown>>(req);
      const title       = String(body.title ?? '').trim();
      const description = String(body.description ?? '').trim();
      const category    = String(body.category ?? '').trim();
      const priority    = String(body.priority ?? 'medium').trim();

      if (!title || !description || !category) {
        return error('title, description, and category are required', 400);
      }
      if (!VALID_CATEGORIES.includes(category)) return error('Invalid category', 400);
      if (!VALID_PRIORITIES.includes(priority))  return error('Invalid priority', 400);

      const rows = await sql`
        INSERT INTO support_tickets (tenant_id, employee_id, title, description, category, priority)
        VALUES (${auth.tenantId!}, ${employeeId}, ${title}, ${description}, ${category}, ${priority})
        RETURNING *
      ` as DbTicket[];

      const ticket = rows[0];

      // Audit log (non-blocking)
      void insertAuditLog({
        tenantId:    auth.tenantId,
        userId:      auth.sub,
        userName:    `${auth.firstName} ${auth.lastName}`,
        action:      'CREATE',
        entityType:  'support_ticket',
        entityId:    ticket.id,
        entityLabel: title,
        details:     description.slice(0, 200),
      }).catch(() => {});

      // Email notification to employee (non-blocking)
      const appUrl = process.env.APP_URL ?? process.env.VITE_API_URL ?? '';
      void sendEmail({
        to:      auth.email,
        subject: `🎫 Ticket received: ${title}`,
        html:    ticketCreatedEmail({
          employeeName: `${auth.firstName} ${auth.lastName}`,
          ticketId:     ticket.id,
          title,
          priority,
          category,
          appUrl,
        }),
      }).catch(() => {});

      return json(mapTicket(ticket), 201);
    }

    return error('Method not allowed', 405);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Request failed';
    if (message.includes('support_tickets') && message.includes('does not exist')) {
      return error('Database migration needed. Run database/schema/011_support_tickets.sql', 500);
    }
    return error(message, 500);
  }
}
