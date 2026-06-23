import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  title: string;
  value: string;
  detail?: string;
  icon?: React.ReactNode;
  tone?: "rose" | "cream" | "green" | "amber";
  className?: string;
};

const toneClasses = {
  rose: "bg-blush-50 text-brand-700",
  cream: "bg-cream-100 text-cocoa-600",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
};

export function StatCard({ title, value, detail, icon, tone = "rose", className }: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex-row items-start justify-between pb-2">
        <CardTitle className="text-sm text-cocoa-500">{title}</CardTitle>
        {icon ? (
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", toneClasses[tone])}>
            {icon}
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-cocoa-800">{value}</p>
        {detail ? <p className="mt-1 text-sm leading-6 text-cocoa-500">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}
