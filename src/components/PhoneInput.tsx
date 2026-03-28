import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Formats a raw digit string into (XXX) XXX-XXXX
 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Returns raw digits from formatted phone */
export function unformatPhone(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

/** Validates a US phone number (exactly 10 digits) */
export function isValidUSPhone(value: string): boolean {
  return unformatPhone(value).length === 10;
}

interface PhoneInputProps extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  showError?: boolean;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, error, showError = true, className, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const digits = raw.replace(/\D/g, "").slice(0, 10);
      onChange(formatPhone(digits));
    };

    const digits = unformatPhone(value);
    const hasError = digits.length > 0 && digits.length < 10;

    return (
      <div>
        <Input
          ref={ref}
          type="tel"
          inputMode="numeric"
          placeholder="(555) 555-5555"
          value={value}
          onChange={handleChange}
          className={cn(hasError && "border-destructive", className)}
          {...props}
        />
        {showError && hasError && (
          <p className="text-destructive text-xs mt-1">
            {error || "Please enter a valid US phone number"}
          </p>
        )}
      </div>
    );
  }
);
PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
