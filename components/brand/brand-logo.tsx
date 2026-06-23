import { BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
};

export function BrandLogo({ className, imageClassName }: BrandLogoProps) {
  return (
    <div className={cn("flex items-center", className)}>
      {/* SVG local de marca: usar img evita loader/otimizacao para arquivo vetorial. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={BRAND_NAME}
        className={cn("h-auto w-full object-contain", imageClassName)}
        src={BRAND_LOGO_SRC}
      />
    </div>
  );
}
