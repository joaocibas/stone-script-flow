import { roundMoney } from "@/components/admin/orders/estimateCalculations";

export interface SlabLineItem {
  price: number;
  quantity: number;
}

export interface ServiceLineItem {
  price: number;
  sqft: number;
}

export interface CustomServiceItem {
  name: string;
  price: number;
}

export interface OrderTotals {
  slabTotal: number;
  laborTotal: number;
  customTotal: number;
  subtotal: number;
  tax: number;
  total: number;
  depositRequired: number;
  remainingBalance: number;
}

export function calculateOrderTotal({
  slabs = [],
  services = [],
  customServices = [],
  taxRate = 7,
  depositRatio = 0.5,
  paymentsReceived = 0,
  depositOverride,
}: {
  slabs?: SlabLineItem[];
  services?: ServiceLineItem[];
  customServices?: CustomServiceItem[];
  taxRate?: number;
  depositRatio?: number;
  paymentsReceived?: number;
  depositOverride?: number;
}): OrderTotals {
  const slabTotal = roundMoney(slabs.reduce((s, i) => s + i.price * i.quantity, 0));
  const laborTotal = roundMoney(services.reduce((s, i) => s + i.price * i.sqft, 0));
  const customTotal = roundMoney(customServices.reduce((s, i) => s + (Number(i.price) || 0), 0));
  const subtotal = roundMoney(slabTotal + laborTotal + customTotal);
  const tax = roundMoney(subtotal * (taxRate / 100));
  const total = roundMoney(subtotal + tax);
  const depositRequired = depositOverride != null ? roundMoney(depositOverride) : roundMoney(total * depositRatio);
  const remainingBalance = roundMoney(total - depositRequired - paymentsReceived);

  return { slabTotal, laborTotal, customTotal, subtotal, tax, total, depositRequired, remainingBalance };
}
