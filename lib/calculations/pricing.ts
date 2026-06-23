export type SalePriceOptions = {
  packagingCost?: number;
  laborCost?: number;
  energyCostPercentage?: number;
  cardFeePercentage?: number;
  profitMarginPercentage?: number;
};

export function calculateSalePrice(baseCost: number, options: SalePriceOptions = {}) {
  if (baseCost < 0) {
    throw new Error("O custo base não pode ser negativo.");
  }

  const packagingCost = options.packagingCost ?? 0;
  const laborCost = options.laborCost ?? 0;
  const profitMarginPercentage = options.profitMarginPercentage ?? 0;
  const energyCostPercentage = options.energyCostPercentage ?? 0;
  const cardFeePercentage = options.cardFeePercentage ?? 0;

  if (
    packagingCost < 0 ||
    laborCost < 0 ||
    profitMarginPercentage < 0 ||
    energyCostPercentage < 0 ||
    cardFeePercentage < 0
  ) {
    throw new Error("Custos, taxas e margem não podem ser negativos.");
  }

  const energyCost = baseCost * (energyCostPercentage / 100);
  const costBeforeFees = baseCost + packagingCost + laborCost + energyCost;
  const desiredProfit = costBeforeFees * (profitMarginPercentage / 100);
  const cardFeeRate = cardFeePercentage / 100;
  const minimumPrice = costBeforeFees;

  if (cardFeeRate >= 1) {
    throw new Error("A taxa da maquininha precisa ser menor que 100%.");
  }

  const suggestedPrice = (costBeforeFees + desiredProfit) / (1 - cardFeeRate);
  const totalCost = costBeforeFees + suggestedPrice * cardFeeRate;
  const estimatedProfit = suggestedPrice - totalCost;
  const realMarginPercentage = suggestedPrice > 0 ? (estimatedProfit / suggestedPrice) * 100 : 0;

  return {
    suggestedPrice,
    estimatedProfit,
    realMarginPercentage,
    totalCost,
    minimumPrice,
  };
}
