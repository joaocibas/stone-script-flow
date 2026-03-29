import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SlabCardProps {
  id: string;
  name: string;
  materialName: string;
  materialCategory?: string | null;
  description?: string | null;
  lengthInches: number;
  widthInches: number;
  thickness: string;
  status: string;
  lotNumber?: string | null;
  imageUrl?: string | null;
  className?: string;
}

const statusColors: Record<string, string> = {
  available: "bg-sage text-white",
  reserved: "bg-accent text-accent-foreground",
  sold: "bg-muted text-muted-foreground",
};

export function SlabCard({ id, name, materialName, materialCategory, description, lengthInches, widthInches, thickness, status, lotNumber, imageUrl, className }: SlabCardProps) {
  const displayName = name || "Unnamed Slab";
  const categoryLabel = materialCategory || materialName;

  return (
    <Link to={`/slabs/${id}`}>
      <Card className={cn("group min-w-0 overflow-hidden border-0 shadow-sm hover:shadow-md transition-all", className)}>
        <div className="aspect-square bg-muted overflow-hidden relative">
          {imageUrl ? (
            <img src={imageUrl} alt={`${displayName} slab`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-stone-200 to-stone-400 dark:from-stone-700 dark:to-stone-900">
              <span className="font-display text-lg font-bold text-stone-600 dark:text-stone-300 text-center px-4">{displayName}</span>
              <span className="text-xs text-stone-500 dark:text-stone-400 mt-1 uppercase tracking-wider">{categoryLabel}</span>
            </div>
          )}
          {/* Status badge */}
          <Badge className={cn("absolute top-2 right-2 text-xs capitalize", statusColors[status] || "bg-muted")}>
            {status}
          </Badge>
          {/* Material group badge */}
          <Badge variant="secondary" className="absolute top-2 left-2 text-[10px] uppercase tracking-wider backdrop-blur-sm bg-secondary/80">
            {categoryLabel}
          </Badge>
          {/* Slab name overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 pt-8">
            <h3 className="font-display text-base font-semibold text-white drop-shadow-sm">
              {displayName}
            </h3>
          </div>
        </div>
        <CardContent className="p-4">
          {materialName && materialName !== categoryLabel && (
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-1 truncate">{materialName}</p>
          )}
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-1.5">{description}</p>
          )}
          <p className="text-sm text-muted-foreground">
            {lengthInches}" × {widthInches}" · {thickness}
          </p>
          {lotNumber && (
            <p className="text-xs text-muted-foreground mt-0.5">Lot #{lotNumber}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
