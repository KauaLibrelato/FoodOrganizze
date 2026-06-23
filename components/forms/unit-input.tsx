import type { Unit } from "@/types";

type UnitInputProps = {
  value?: Unit;
  onChange?: (value: Unit) => void;
};

const units: Unit[] = ["g", "kg", "ml", "l", "un"];

export function UnitInput({ value = "g", onChange }: UnitInputProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange?.(event.target.value as Unit)}
      className="h-11 rounded-xl border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {units.map((unit) => (
        <option key={unit} value={unit}>
          {unit}
        </option>
      ))}
    </select>
  );
}
