import { corsPreflight, error, getTenantSql, json, parseBody } from '../_lib/db';
import { requireAuth } from '../_lib/auth';

export const config = { runtime: 'edge' };

export interface DbProductOpportunity {
  tenant_id: string;
  id: string;
  name: string;
  category: string;
  target_customers: string;
  competitors: string;
  difficulty: string;
  mvp_time: string;
  suggested_price: string;
  shortlist_rank: number | null;
  shortlist_price: string | null;
  rationale: string | null;
  problem_statement: string | null;
  differentiator: string | null;
  validation_status: string;
  customer_evidence: string | null;
  mvp_scope: string | null;
  investment_estimate: string | null;
  revenue_potential: string | null;
  sales_difficulty: string | null;
  team_fit: string | null;
  next_step: string | null;
  work_status: string;
  work_started_at: string | null;
  created_at: string;
  updated_at: string;
}

export function mapOpportunity(row: DbProductOpportunity) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    targetCustomers: row.target_customers || '',
    competitors: row.competitors || '',
    difficulty: row.difficulty || 'Easy',
    mvpTime: row.mvp_time || '',
    suggestedPrice: row.suggested_price || '',
    shortlistRank: row.shortlist_rank !== null ? Number(row.shortlist_rank) : undefined,
    shortlistPrice: row.shortlist_price ?? undefined,
    rationale: row.rationale ?? undefined,
    problemStatement: row.problem_statement ?? undefined,
    differentiator: row.differentiator ?? undefined,
    validationStatus: row.validation_status as any,
    customerEvidence: row.customer_evidence ?? undefined,
    mvpScope: row.mvp_scope ?? undefined,
    investmentEstimate: row.investment_estimate ?? undefined,
    revenuePotential: row.revenue_potential ?? undefined,
    salesDifficulty: row.sales_difficulty ?? undefined,
    teamFit: row.team_fit ?? undefined,
    nextStep: row.next_step ?? undefined,
    workStatus: row.work_status as any,
    workStartedAt: row.work_started_at ?? undefined,
  };
}

async function ensureOpportunitiesTable(sql: any): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS product_opportunities (
      tenant_id UUID NOT NULL,
      id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      target_customers TEXT NOT NULL DEFAULT '',
      competitors TEXT NOT NULL DEFAULT '',
      difficulty TEXT NOT NULL DEFAULT 'Easy',
      mvp_time TEXT NOT NULL DEFAULT '',
      suggested_price TEXT NOT NULL DEFAULT '',
      shortlist_rank INTEGER,
      shortlist_price TEXT,
      rationale TEXT,
      problem_statement TEXT,
      differentiator TEXT,
      validation_status TEXT NOT NULL DEFAULT 'not_validated',
      customer_evidence TEXT,
      mvp_scope TEXT,
      investment_estimate TEXT,
      revenue_potential TEXT,
      sales_difficulty TEXT,
      team_fit TEXT,
      next_step TEXT,
      work_status TEXT NOT NULL DEFAULT 'not_started',
      work_started_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (tenant_id, id)
    );
  `;
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  if (!auth.tenantId && auth.role !== 'platform_admin') return error('Tenant ID is required', 400);

  const sql = await getTenantSql(auth.tenantId!);
  await ensureOpportunitiesTable(sql);

  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT * FROM product_opportunities
        WHERE tenant_id = ${auth.tenantId!}
        ORDER BY created_at ASC
      ` as DbProductOpportunity[];
      return json(rows.map(mapOpportunity));
    }

    if (req.method === 'POST') {
      const body = await parseBody<any>(req);
      if (Array.isArray(body)) {
        for (const item of body) {
          const id = item.id || `opp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          await sql`
            INSERT INTO product_opportunities (
              tenant_id, id, name, category, target_customers, competitors,
              difficulty, mvp_time, suggested_price, shortlist_rank, shortlist_price,
              rationale, problem_statement, differentiator, validation_status,
              customer_evidence, mvp_scope, investment_estimate, revenue_potential,
              sales_difficulty, team_fit, next_step, work_status, work_started_at
            ) VALUES (
              ${auth.tenantId!}, ${id}, ${item.name || ''}, ${item.category || 'General'},
              ${item.targetCustomers || ''}, ${item.competitors || ''},
              ${item.difficulty || 'Easy'}, ${item.mvpTime || ''}, ${item.suggestedPrice || ''},
              ${item.shortlistRank ?? null}, ${item.shortlistPrice ?? null},
              ${item.rationale ?? null}, ${item.problemStatement ?? null},
              ${item.differentiator ?? null}, ${item.validationStatus || 'not_validated'},
              ${item.customerEvidence ?? null}, ${item.mvpScope ?? null},
              ${item.investmentEstimate ?? null}, ${item.revenuePotential ?? null},
              ${item.salesDifficulty ?? null}, ${item.teamFit ?? null},
              ${item.nextStep ?? null}, ${item.workStatus || 'not_started'},
              ${item.workStartedAt ? new Date(item.workStartedAt).toISOString() : null}
            )
            ON CONFLICT (tenant_id, id) DO NOTHING
          `;
        }
        return json({ success: true, count: body.length }, 201);
      }

      const name = String(body.name ?? '').trim();
      if (!name) return error('Opportunity name is required', 400);

      const id = body.id ? String(body.id).trim() : `opp-${Date.now()}`;
      const category = String(body.category ?? 'General').trim();

      const rows = await sql`
        INSERT INTO product_opportunities (
          tenant_id, id, name, category, target_customers, competitors,
          difficulty, mvp_time, suggested_price, shortlist_rank, shortlist_price,
          rationale, problem_statement, differentiator, validation_status,
          customer_evidence, mvp_scope, investment_estimate, revenue_potential,
          sales_difficulty, team_fit, next_step, work_status, work_started_at
        ) VALUES (
          ${auth.tenantId!}, ${id}, ${name}, ${category},
          ${body.targetCustomers || ''}, ${body.competitors || ''},
          ${body.difficulty || 'Easy'}, ${body.mvpTime || ''}, ${body.suggestedPrice || ''},
          ${body.shortlistRank ?? null}, ${body.shortlistPrice ?? null},
          ${body.rationale ?? null}, ${body.problemStatement ?? null},
          ${body.differentiator ?? null}, ${body.validationStatus || 'not_validated'},
          ${body.customerEvidence ?? null}, ${body.mvpScope ?? null},
          ${body.investmentEstimate ?? null}, ${body.revenuePotential ?? null},
          ${body.salesDifficulty ?? null}, ${body.teamFit ?? null},
          ${body.nextStep ?? null}, ${body.workStatus || 'not_started'},
          ${body.workStartedAt ? new Date(body.workStartedAt).toISOString() : null}
        )
        ON CONFLICT (tenant_id, id) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          target_customers = EXCLUDED.target_customers,
          competitors = EXCLUDED.competitors,
          difficulty = EXCLUDED.difficulty,
          mvp_time = EXCLUDED.mvp_time,
          suggested_price = EXCLUDED.suggested_price,
          shortlist_rank = EXCLUDED.shortlist_rank,
          shortlist_price = EXCLUDED.shortlist_price,
          rationale = EXCLUDED.rationale,
          problem_statement = EXCLUDED.problem_statement,
          differentiator = EXCLUDED.differentiator,
          validation_status = EXCLUDED.validation_status,
          customer_evidence = EXCLUDED.customer_evidence,
          mvp_scope = EXCLUDED.mvp_scope,
          investment_estimate = EXCLUDED.investment_estimate,
          revenue_potential = EXCLUDED.revenue_potential,
          sales_difficulty = EXCLUDED.sales_difficulty,
          team_fit = EXCLUDED.team_fit,
          next_step = EXCLUDED.next_step,
          work_status = EXCLUDED.work_status,
          updated_at = NOW()
        RETURNING *
      ` as DbProductOpportunity[];

      return json(mapOpportunity(rows[0]), 201);
    }

    if (req.method === 'PUT') {
      const body = await parseBody<any>(req);
      const id = String(body.id ?? '').trim();
      if (!id) return error('Opportunity ID is required', 400);

      const rows = await sql`
        UPDATE product_opportunities SET
          name = COALESCE(${body.name}, name),
          category = COALESCE(${body.category}, category),
          target_customers = COALESCE(${body.targetCustomers}, target_customers),
          competitors = COALESCE(${body.competitors}, competitors),
          difficulty = COALESCE(${body.difficulty}, difficulty),
          mvp_time = COALESCE(${body.mvpTime}, mvp_time),
          suggested_price = COALESCE(${body.suggestedPrice}, suggested_price),
          shortlist_rank = ${body.shortlistRank ?? null},
          shortlist_price = ${body.shortlistPrice ?? null},
          rationale = ${body.rationale ?? null},
          problem_statement = ${body.problemStatement ?? null},
          differentiator = ${body.differentiator ?? null},
          validation_status = COALESCE(${body.validationStatus}, validation_status),
          customer_evidence = ${body.customerEvidence ?? null},
          mvp_scope = ${body.mvpScope ?? null},
          investment_estimate = ${body.investmentEstimate ?? null},
          revenue_potential = ${body.revenuePotential ?? null},
          sales_difficulty = ${body.salesDifficulty ?? null},
          team_fit = ${body.teamFit ?? null},
          next_step = ${body.nextStep ?? null},
          work_status = COALESCE(${body.workStatus}, work_status),
          updated_at = NOW()
        WHERE tenant_id = ${auth.tenantId!} AND id = ${id}
        RETURNING *
      ` as DbProductOpportunity[];

      if (rows.length === 0) return error('Opportunity not found', 404);
      return json(mapOpportunity(rows[0]));
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      let id = url.searchParams.get('id');
      if (!id) {
        const body = await parseBody<{ id?: string }>(req);
        id = body?.id ?? null;
      }
      if (!id) return error('Opportunity ID is required', 400);

      await sql`
        DELETE FROM product_opportunities
        WHERE tenant_id = ${auth.tenantId!} AND id = ${id}
      `;

      await sql`
        DELETE FROM product_opportunity_assignments
        WHERE tenant_id = ${auth.tenantId!} AND opportunity_id = ${id}
      `;

      return json({ success: true, id });
    }

    return error('Method not allowed', 405);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Request failed';
    return error(message, 500);
  }
}

