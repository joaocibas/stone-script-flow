import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SlabCardProps {
  id: string;
  materialName: string;
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

export function SlabCard({ id, materialName, lengthInches, widthInches, thickness, status, lotNumber, imageUrl, className }: SlabCardProps) {
  return (
    <Link to={`/slabs/${id}`}>
      <Card className={cn("group overflow-hidden border-0 shadow-sm hover:shadow-md transition-all", className)}>
        <div className="aspect-square bg-muted overflow-hidden relative">
          {imageUrl ? (
            <img src={imageUrl} alt={`${materialName} slab`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary">
              <span className="text-muted-foreground text-sm">No photo</span>
            </div>
          )}
          <Badge className={cn("absolute top-2 right-2 text-xs capitalize", statusColors[status] || "bg-muted")}>
            {status}
          </Badge>
        </div>
        <CardContent className="p-4">
          <h3 className="font-display text-base font-semibold">{materialName}</h3>
          <p className="text-sm text-muted-foreground mt-1">
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
