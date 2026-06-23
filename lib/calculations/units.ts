import type { Unit } from "@/types";

const unitGroups: Record<Unit, "weight" | "volume" | "unit"> = {
  g: "weight",
  kg: "weight",
  ml: "volume",
  l: "volume",
  un: "unit",
};

const factorsToBase: Record<Unit, number> = {
  g: 1,
  kg: 1000,
  ml: 1,
  l: 1000,
  un: 1,
};

export function canConvertUnit(fromUnit: Unit, toUnit: Unit) {
  return unitGroups[fromUnit] === unitGroups[toUnit];
}

export function convertUnit(quantity: number, fromUnit: Unit, toUnit: Unit) {
  if (!Number.isFinite(quantity)) {
    throw new Error("A quantidade precisa ser um número válido.");
  }

  if (!canConvertUnit(fromUnit, toUnit)) {
    throw new Error(`Não é possível converter de ${fromUnit} para ${toUnit}.`);
  }

  const quantityInBase = quantity * factorsToBase[fromUnit];
  return quantityInBase / factorsToBase[toUnit];
}
