/**
 * Lightweight email helper using the Resend API (edge-compatible, zero deps).
 * Set RESEND_API_KEY in environment variables to enable.
 * If the key is absent, emails are silently skipped (non-blocking).
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS   = process.env.EMAIL_FROM ?? 'Assetly <noreply@assetly.com>';

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!RESEND_API_KEY) return; // silently skip when not configured

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: Array.isArray(payload.to) ? payload.to : [payload.to],
        subject: payload.subject,
        html: payload.html,
      }),
    });
  } catch {
    /* non-blocking — log silently */
  }
}

// ── Email templates ────────────────────────────────────────────────────────────

export function ticketCreatedEmail(opts: {
  employeeName: string;
  ticketId: string;
  title: string;
  priority: string;
  category: string;
  appUrl: string;
}): string {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f9fafb;border-radius:12px;">
      <h2 style="margin:0 0 8px;color:#1e293b;">🎫 New Support Ticket</h2>
      <p style="color:#64748b;margin:0 0 24px;">Hi ${opts.employeeName}, your ticket has been received and will be reviewed by IT shortly.</p>
      <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr><td style="padding:10px 16px;color:#64748b;border-bottom:1px solid #e2e8f0;font-size:13px;">Ticket ID</td><td style="padding:10px 16px;font-weight:600;border-bottom:1px solid #e2e8f0;font-size:13px;">#${opts.ticketId.slice(0,8).toUpperCase()}</td></tr>
        <tr><td style="padding:10px 16px;color:#64748b;border-bottom:1px solid #e2e8f0;font-size:13px;">Title</td><td style="padding:10px 16px;font-weight:600;border-bottom:1px solid #e2e8f0;font-size:13px;">${opts.title}</td></tr>
        <tr><td style="padding:10px 16px;color:#64748b;border-bottom:1px solid #e2e8f0;font-size:13px;">Category</td><td style="padding:10px 16px;font-weight:600;border-bottom:1px solid #e2e8f0;font-size:13px;">${opts.category}</td></tr>
        <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Priority</td><td style="padding:10px 16px;font-weight:600;font-size:13px;">${opts.priority}</td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">You'll receive an update when the status changes. — Assetly IT</p>
    </div>
  `;
}

export function ticketStatusChangedEmail(opts: {
  employeeName: string;
  ticketId: string;
  title: string;
  newStatus: string;
  resolutionNotes?: string;
  appUrl: string;
}): string {
  const statusLabel: Record<string, string> = {
    open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed',
  };
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f9fafb;border-radius:12px;">
      <h2 style="margin:0 0 8px;color:#1e293b;">🔄 Ticket Status Updated</h2>
      <p style="color:#64748b;margin:0 0 24px;">Hi ${opts.employeeName}, your ticket <strong>#${opts.ticketId.slice(0,8).toUpperCase()}</strong> — <em>${opts.title}</em> — has been updated.</p>
      <p style="font-size:15px;margin:0 0 16px;">New status: <strong style="color:#0ea5e9;">${statusLabel[opts.newStatus] ?? opts.newStatus}</strong></p>
      ${opts.resolutionNotes ? `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;font-size:13px;color:#334155;"><strong>Notes from IT:</strong><br/>${opts.resolutionNotes}</div>` : ''}
      <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">— Assetly IT</p>
    </div>
  `;
}
