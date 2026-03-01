import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MaterialCardProps {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  imageUrl?: string | null;
  className?: string;
}

export function MaterialCard({ id, name, category, description, imageUrl, className }: MaterialCardProps) {
  return (
    <Link to={`/materials/${id}`}>
      <Card className={cn("group overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300", className)}>
        <div className="aspect-[4/3] bg-muted overflow-hidden">
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary">
              <span className="text-muted-foreground text-sm">No image</span>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <p className="text-xs uppercase tracking-wider text-accent font-medium mb-1">{category}</p>
          <h3 className="font-display text-lg font-semibold">{name}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
