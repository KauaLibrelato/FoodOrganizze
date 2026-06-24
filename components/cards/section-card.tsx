import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SectionCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  id?: string;
};

export function SectionCard({ title, description, children, className, contentClassName, id }: SectionCardProps) {
  return (
    <Card id={id} className={cn("flex flex-col scroll-mt-20", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className={cn("min-h-0", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
