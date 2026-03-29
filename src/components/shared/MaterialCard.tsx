import { Link } from "react-router-dom";
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
    <Link to={`/materials/${id}`} className={cn("group block", className)}>
      <div className="overflow-hidden rounded-xl bg-card shadow-sm hover:shadow-lg transition-all duration-300">
        {/* Image */}
        <div className="aspect-[4/3] overflow-hidden relative">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-stone-200 to-stone-400 dark:from-stone-700 dark:to-stone-900">
              <span className="font-display text-xl font-bold text-stone-600 dark:text-stone-300 text-center px-4">{name}</span>
              <span className="text-xs text-stone-500 dark:text-stone-400 mt-1 uppercase tracking-wider">{category}</span>
            </div>
          )}
          {/* Category badge overlay */}
          <div className="absolute top-3 left-3">
            <span className="bg-background/90 backdrop-blur-sm text-foreground text-[10px] uppercase tracking-widest font-semibold px-3 py-1 rounded-full">
              {category}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="font-display text-lg font-semibold group-hover:text-accent transition-colors duration-200">
            {name}
          </h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
              {description}
            </p>
          )}
          <div className="mt-4 flex items-center text-accent text-sm font-medium">
            <span>View Details</span>
            <svg className="ml-1.5 w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
