export interface OrderSlabLineItem {
  price: number;
  quantity: number;
}

export interface OrderLaborLineItem {
  price: number;
  sqft: number;
}

export interface OrderAddonLineItem {
  price: number;
}

export interface OrderCustomServiceItem {
  name: string;
  price: number;
}

export interface OrderData {
  slabs?: OrderSlabLineItem[];
  services?: OrderLaborLineItem[];
  serviceAddons?: OrderAddonLineItem[];
  customServices?: OrderCustomServiceItem[];
  taxRate?: number;
  depositRatio?: number;
  paymentsReceived?: number;
  depositOverride?: number;
}

export interface OrderTotals {
  slabTotal: number;
  laborTotal: number;
  servicesTotal: number;
  customTotal: number;
  addonsTotal: number;
  subtotal: number;
  tax: number;
  total: number;
  depositRequired: number;
  remainingBalance: number;
}

export const roundMoney = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

export function calculateOrderTotal({
  slabs = [],
  services = [],
  serviceAddons = [],
  customServices = [],
  taxRate = 7,
  depositRatio = 0.5,
  paymentsReceived = 0,
  depositOverride,
}: OrderData): OrderTotals {
  const slabTotal = roundMoney(slabs.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0));
  const laborTotal = roundMoney(services.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.sqft) || 0), 0));
  const servicesTotal = roundMoney(serviceAddons.reduce((sum, item) => sum + (Number(item.price) || 0), 0));
  const customTotal = roundMoney(customServices.reduce((sum, item) => sum + (Number(item.price) || 0), 0));
  const addonsTotal = roundMoney(servicesTotal + customTotal);
  const subtotal = roundMoney(slabTotal + laborTotal + addonsTotal);
  const tax = roundMoney(subtotal * ((Number(taxRate) || 0) / 100));
  const total = roundMoney(subtotal + tax);
  const depositRequired = depositOverride != null
    ? roundMoney(Number(depositOverride) || 0)
    : roundMoney(total * (Number(depositRatio) || 0));
  const remainingBalance = roundMoney(total - depositRequired - (Number(paymentsReceived) || 0));

  return {
    slabTotal,
    laborTotal,
    servicesTotal,
    customTotal,
    addonsTotal,
    subtotal,
    tax,
    total,
    depositRequired,
    remainingBalance,
  };
}