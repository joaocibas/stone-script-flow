export const DEFAULT_EDGE_PROFILE = "EasyEdge";

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export function resolveEdgeProfile(...candidates: Array<string | null | undefined>) {
  for (const candidate of candidates) {
    const normalized = candidate?.trim();
    if (normalized) return normalized;
  }

  return DEFAULT_EDGE_PROFILE;
}

export function derivePricingSummary({
  total,
  depositRequired,
  depositPaid = 0,
  taxRate = 7,
}: {
  total?: number | null;
  depositRequired?: number | null;
  depositPaid?: number | null;
  taxRate?: number | null;
}) {
  const normalizedTaxRate = Number(taxRate) || 7;
  const normalizedTotal = roundMoney(Number(total) || 0);
  const subtotal = normalizedTaxRate > 0
    ? roundMoney(normalizedTotal / (1 + normalizedTaxRate / 100))
    : normalizedTotal;
  const taxAmount = roundMoney(normalizedTotal - subtotal);
  const normalizedDeposit = depositRequired != null
    ? roundMoney(Number(depositRequired) || 0)
    : roundMoney(normalizedTotal * 0.5);
  const normalizedPaid = roundMoney(Number(depositPaid) || 0);
  const remainingBalance = roundMoney(normalizedTotal - normalizedDeposit - normalizedPaid);

  return {
    subtotal,
    taxRate: normalizedTaxRate,
    taxAmount,
    total: normalizedTotal,
    depositRequired: normalizedDeposit,
    remainingBalance,
  };
}
