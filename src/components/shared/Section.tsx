import { cn } from "@/lib/utils";

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function Section({ children, className, id }: SectionProps) {
  return (
    <section id={id} className={cn("py-16 md:py-24", className)}>
      <div className="container">{children}</div>
    </section>
  );
}

export function SectionHeader({ title, subtitle, className }: { title: string; subtitle?: string; className?: string }) {
  return (
    <div className={cn("text-center mb-10 md:mb-14", className)}>
      <h2 className="font-display text-3xl md:text-4xl font-semibold text-balance">{title}</h2>
      {subtitle && <p className="text-muted-foreground mt-3 max-w-xl mx-auto">{subtitle}</p>}
    </div>
  );
}
