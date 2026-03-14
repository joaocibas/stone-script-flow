import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SlabCardProps {
  id: string;
  name: string;
  materialName: string;
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

export function SlabCard({ id, name, materialName, description, lengthInches, widthInches, thickness, status, lotNumber, imageUrl, className }: SlabCardProps) {
  const displayName = name || "Unnamed Slab";

  return (
    <Link to={`/slabs/${id}`}>
      <Card className={cn("group overflow-hidden border-0 shadow-sm hover:shadow-md transition-all", className)}>
        <div className="aspect-square bg-muted overflow-hidden relative">
          {imageUrl ? (
            <img src={imageUrl} alt={displayName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary">
              <span className="text-muted-foreground text-sm">No photo</span>
            </div>
          )}
          {/* Status badge */}
          <Badge className={cn("absolute top-2 right-2 text-xs capitalize", statusColors[status] || "bg-muted")}>
            {status}
          </Badge>
          {/* Material group badge */}
          <Badge variant="secondary" className="absolute top-2 left-2 text-[10px] uppercase tracking-wider backdrop-blur-sm bg-secondary/80">
            {materialName}
          </Badge>
          {/* Slab name overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 pt-8">
            <h3 className="font-display text-base font-semibold text-white drop-shadow-sm">{displayName}</h3>
          </div>
        </div>
        <CardContent className="p-4">
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
