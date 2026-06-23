import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type FloatingActionButtonProps = {
  label: string;
};

export function FloatingActionButton({ label }: FloatingActionButtonProps) {
  return (
    <Button className="fixed bottom-20 right-4 z-50 rounded-full px-5 shadow-soft md:hidden">
      <Plus className="h-4 w-4" />
      {label}
    </Button>
  );
}
