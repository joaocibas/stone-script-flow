export type CustomServiceInput = {
  name: string;
  price: number;
};

type EstimatePricingShape = {
  labor_cost?: number | null;
  material_cost?: number | null;
  addons_cost?: number | null;
  subtotal?: number | null;
  tax?: number | null;
  total?: number | null;
  deposit_required?: number | null;
};

type ServiceLike = {
  id: string;
  category?: string | null;
  pricing_unit?: string | null;
  cost_value?: number | string | null;
};

type SlabServiceLike = {
  service_id: string;
  override_cost?: number | string | null;
  override_multiplier?: number | string | null;
};

type RecalculateEstimateOptions<T extends EstimatePricingShape> = {
  updates?: Partial<T>;
  pricingOverride?: Partial<Pick<EstimatePricingShape, "labor_cost" | "material_cost" | "addons_cost">>;
  customServices?: CustomServiceInput[];
  defaultTaxRate?: number;
  defaultDepositRatio?: number;
};

export type ServicePricingResult = {
  labor: number;
  addon: number;
  materialCost: number | null;
  rates: {
    laborRatePerSqft: number;
    laborFixed: number;
    addonTotal: number;
    slabUnitPrice: number;
    slabQuantity: number;
  };
};

export const roundMoney = (value: number) => Math.round(value * 100) / 100;

export function recalculateEstimate<T extends EstimatePricingShape>(
  base: T,
  {
    updates,
    pricingOverride,
    customServices = [],
    defaultTaxRate = 7,
    defaultDepositRatio = 0.5,
  }: RecalculateEstimateOptions<T> = {},
) {
  const merged = { ...base, ...(updates || {}) } as T;
  const labor_cost = roundMoney(Number(pricingOverride?.labor_cost ?? merged.labor_cost) || 0);
  const material_cost = roundMoney(Number(pricingOverride?.material_cost ?? merged.material_cost) || 0);
  const selectedServiceAddons = roundMoney(Number(pricingOverride?.addons_cost ?? merged.addons_cost) || 0);
  const customAddons = roundMoney(
    customServices.reduce((sum, service) => sum + (Number(service.price) || 0), 0),
  );
  const addons_cost = roundMoney(selectedServiceAddons + customAddons);
  const subtotal = roundMoney(labor_cost + material_cost + addons_cost);
  const tax = Number(merged.tax) || defaultTaxRate;
  const taxAmount = roundMoney(subtotal * (tax / 100));
  const total = roundMoney(subtotal + taxAmount);
  const depositWasUpdated = updates
    ? Object.prototype.hasOwnProperty.call(updates, "deposit_required")
    : false;
  const deposit_required = depositWasUpdated || Number(merged.deposit_required) > 0
    ? roundMoney(Number(merged.deposit_required) || 0)
    : roundMoney(total * defaultDepositRatio);

  return {
    ...merged,
    labor_cost,
    material_cost,
    addons_cost,
    subtotal,
    tax,
    total,
    deposit_required,
  } as T;
}

export function computeSelectedServicePricing({
  selectedServiceIds,
  services,
  slabServices,
  sqft = 0,
  numCutouts = 0,
  lengthInches = 0,
  widthInches = 0,
  slabUnitPrice = null,
  slabQuantity = 1,
}: {
  selectedServiceIds?: Iterable<string>;
  services?: ServiceLike[] | null;
  slabServices?: SlabServiceLike[] | null;
  sqft?: number | null;
  numCutouts?: number | null;
  lengthInches?: number | null;
  widthInches?: number | null;
  slabUnitPrice?: number | null;
  slabQuantity?: number | null;
}): ServicePricingResult | null {
  const serviceList = services || [];
  const activeIds = new Set(selectedServiceIds || []);

  if (serviceList.length === 0 && slabUnitPrice == null) {
    return null;
  }

  const overrides = new Map<string, { cost: number | null; multiplier: number }>();
  for (const slabService of slabServices || []) {
    overrides.set(slabService.service_id, {
      cost: slabService.override_cost != null ? Number(slabService.override_cost) : null,
      multiplier: slabService.override_multiplier != null ? Number(slabService.override_multiplier) : 1,
    });
  }

  const safeSqft = Number(sqft) || 0;
  const safeCutouts = Number(numCutouts) || 0;
  const safeLength = Number(lengthInches) || 0;
  const safeWidth = Number(widthInches) || 0;
  const perimeterLinFt = safeLength && safeWidth ? (2 * (safeLength + safeWidth)) / 12 : 0;

  const getServiceCost = (service: ServiceLike) => {
    const override = overrides.get(service.id);
    const unitCost = override?.cost != null ? override.cost : Number(service.cost_value) || 0;
    const multiplier = override?.multiplier ?? 1;

    switch (service.pricing_unit) {
      case "per_sqft":
        return unitCost * safeSqft * multiplier;
      case "per_linear_ft":
        return unitCost * perimeterLinFt * multiplier;
      case "per_cutout":
        return unitCost * safeCutouts * multiplier;
      default:
        return unitCost * multiplier;
    }
  };

  let laborRatePerSqft = 0;
  let laborFixed = 0;
  let addonTotal = 0;

  for (const service of serviceList) {
    if (!activeIds.has(service.id)) continue;

    const serviceCost = getServiceCost(service);

    if (service.category === "labor") {
      if (service.pricing_unit === "per_sqft") {
        const override = overrides.get(service.id);
        const unitCost = override?.cost != null ? override.cost : Number(service.cost_value) || 0;
        const multiplier = override?.multiplier ?? 1;
        laborRatePerSqft += unitCost * multiplier;
      } else {
        laborFixed += serviceCost;
      }
      continue;
    }

    addonTotal += serviceCost;
  }

  const safeSlabUnitPrice = slabUnitPrice != null ? Number(slabUnitPrice) || 0 : null;
  const safeSlabQuantity = Number(slabQuantity) || 1;

  return {
    labor: roundMoney((laborRatePerSqft * safeSqft) + laborFixed),
    addon: roundMoney(addonTotal),
    materialCost: safeSlabUnitPrice == null ? null : roundMoney(safeSlabUnitPrice * safeSlabQuantity),
    rates: {
      laborRatePerSqft: roundMoney(laborRatePerSqft),
      laborFixed: roundMoney(laborFixed),
      addonTotal: roundMoney(addonTotal),
      slabUnitPrice: safeSlabUnitPrice ?? 0,
      slabQuantity: safeSlabQuantity,
    },
  };
}

export function getEstimateRemainingBalance(
  total?: number | null,
  depositRequired?: number | null,
  paymentsReceived?: number | null,
) {
  return roundMoney((Number(total) || 0) - (Number(depositRequired) || 0) - (Number(paymentsReceived) || 0));
}