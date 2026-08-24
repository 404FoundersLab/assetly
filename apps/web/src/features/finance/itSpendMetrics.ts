import type { Asset } from '../../types';
import type { ExpenseClaim } from '../../store/expensesSlice';

const YEARLY_BUDGETS: Record<number, number> = {
  2026: 80000,
  2025: 75000,
  2024: 60000,
  2023: 50000,
  2022: 45000,
};
const DEFAULT_BUDGET = 50000;

export interface ItSpendSummary {
  assetCount: number;
  totalPurchaseCost: number;
  totalCurrentValue: number;
  totalRepairCost: number;
  totalDepreciation: number;
  totalTco: number;
  depreciationPct: number;
  pendingExpenseCount: number;
  pendingExpenseAmount: number;
  currentYear: number;
  currentYearBudget: number;
  currentYearSpend: number;
  currentYearUtilization: number;
}

export function computeItSpendSummary(assets: Asset[], expenses: ExpenseClaim[]): ItSpendSummary {
  const totalPurchaseCost = assets.reduce((sum, a) => sum + a.purchaseCost, 0);
  const totalCurrentValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
  const totalRepairCost = assets.reduce((sum, a) => sum + (a.repairCost ?? 0), 0);
  const totalDepreciation = totalPurchaseCost - totalCurrentValue;
  const depreciationPct = totalPurchaseCost > 0 ? Math.round((totalDepreciation / totalPurchaseCost) * 100) : 0;

  const pending = expenses.filter((e) => e.status === 'submitted');
  const pendingExpenseCount = pending.length;
  const pendingExpenseAmount = pending.reduce((sum, e) => sum + e.amount, 0);

  const currentYear = new Date().getFullYear();
  let currentYearSpend = 0;
  assets.forEach((a) => {
    if (!a.purchaseDate) return;
    const year = new Date(a.purchaseDate).getFullYear();
    if (year === currentYear) {
      currentYearSpend += a.purchaseCost + (a.repairCost ?? 0);
    }
  });

  const currentYearBudget = YEARLY_BUDGETS[currentYear] ?? DEFAULT_BUDGET;
  const currentYearUtilization =
    currentYearBudget > 0 ? Math.min(100, Math.round((currentYearSpend / currentYearBudget) * 100)) : 0;

  return {
    assetCount: assets.length,
    totalPurchaseCost,
    totalCurrentValue,
    totalRepairCost,
    totalDepreciation,
    totalTco: totalPurchaseCost + totalRepairCost,
    depreciationPct,
    pendingExpenseCount,
    pendingExpenseAmount,
    currentYear,
    currentYearBudget,
    currentYearSpend,
    currentYearUtilization,
  };
}

export function assetFinancials(asset: Asset) {
  const repairCost = asset.repairCost ?? 0;
  const depreciation = asset.purchaseCost - asset.currentValue;
  const depreciationPct =
    asset.purchaseCost > 0 ? Math.round((depreciation / asset.purchaseCost) * 100) : 0;

  return {
    repairCost,
    depreciation,
    depreciationPct,
    totalCostOfOwnership: asset.purchaseCost + repairCost,
  };
}
