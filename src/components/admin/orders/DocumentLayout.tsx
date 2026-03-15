import { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";

interface DocumentHeaderProps {
  documentTitle: string;
  documentNumber: string;
  date: string;
  status?: string;
  actions?: ReactNode;
}

export function DocumentHeader({ documentTitle, documentNumber, date, status, actions }: DocumentHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-4 border-b-2 border-accent/40">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">{documentTitle}</p>
        <p className="text-lg font-bold text-foreground font-serif">{documentNumber}</p>
        {status && (
          <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
            {status}
          </span>
        )}
      </div>
      <div className="flex flex-col items-start sm:items-end gap-2">
        <p className="text-sm text-muted-foreground">{date}</p>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

interface InfoBlockProps {
  title: string;
  items: { label: string; value: string }[];
}

export function InfoBlock({ title, items }: InfoBlockProps) {
  const filtered = items.filter((i) => i.value);
  if (filtered.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
      {filtered.map((item) => (
        <p key={item.label} className="text-sm">
          <span className="text-muted-foreground">{item.label}: </span>
          <span className="font-medium text-foreground">{item.value}</span>
        </p>
      ))}
    </div>
  );
}

interface SummaryRowProps {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
}

export function SummaryRow({ label, value, bold, accent }: SummaryRowProps) {
  return (
    <div className={`flex justify-between py-1.5 ${bold ? "font-semibold text-foreground" : "text-sm text-muted-foreground"} ${accent ? "text-accent font-bold text-base" : ""}`}>
      <span>{label}</span>
      <span className={bold || accent ? "font-bold" : "font-medium text-foreground"}>{value}</span>
    </div>
  );
}

interface SummaryBoxProps {
  rows: SummaryRowProps[];
  className?: string;
}

export function SummaryBox({ rows, className = "" }: SummaryBoxProps) {
  return (
    <div className={`border rounded-md p-4 bg-muted/30 space-y-0 ${className}`}>
      {rows.map((row, i) => (
        <div key={row.label}>
          {i > 0 && row.bold && <Separator className="my-1.5" />}
          <SummaryRow {...row} />
        </div>
      ))}
    </div>
  );
}

interface DocumentSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function DocumentSection({ title, children, className = "" }: DocumentSectionProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {title && (
        <h3 className="text-xs font-semibold uppercase tracking-widest text-accent border-b border-accent/20 pb-1.5">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

interface DisclaimerBlockProps {
  text: string;
  title?: string;
}

export function DisclaimerBlock({ text, title = "Terms & Conditions" }: DisclaimerBlockProps) {
  if (!text) return null;
  return (
    <div className="border-l-2 border-accent/40 pl-4 py-2 bg-muted/20 rounded-r-md">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{text}</p>
    </div>
  );
}
