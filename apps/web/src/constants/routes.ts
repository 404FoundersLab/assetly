/** Operational IT spend module (asset valuation, budgets, expense approvals). */
export const IT_SPEND_PATH = '/it-spend';

export type ItSpendTab = 'valuation' | 'budget' | 'expenses';

export const IT_SPEND_TABS: Record<ItSpendTab, number> = {
  valuation: 0,
  budget: 1,
  expenses: 2,
};

export function itSpendUrl(tab?: ItSpendTab): string {
  return tab ? `${IT_SPEND_PATH}?tab=${tab}` : IT_SPEND_PATH;
}
