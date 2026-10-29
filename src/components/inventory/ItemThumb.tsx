import { useState } from "react";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface ItemThumbProps {
  src?: string | null;
  alt: string;
  className?: string;
}

/** Small square item image with a neutral fallback (also used when the image fails to load). */
export function ItemThumb({ src, alt, className }: ItemThumbProps) {
  const [failed, setFailed] = useState(false);
  const showImage = !!src && !failed;

  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface-sunken",
        className
      )}
    >
      {showImage ? (
        <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <Package className="h-3.5 w-3.5 text-muted-foreground/60" strokeWidth={1.75} />
      )}
    </div>
  );
}
