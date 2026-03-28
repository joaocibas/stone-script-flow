import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
] as const;

const STATE_NAMES: Record<string, string> = {
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",
  CO:"Colorado",CT:"Connecticut",DE:"Delaware",FL:"Florida",GA:"Georgia",
  HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",
  KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",
  MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",
  NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",
  NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",
  OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",
  SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",
  VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",
};

export interface AddressValue {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export const emptyAddress: AddressValue = { street: "", city: "", state: "", zip: "" };

/** Validate ZIP: 5 digits or 5+4 */
export function isValidZip(zip: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(zip.trim());
}

/** Format ZIP as user types */
function formatZip(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/** City validation: letters, spaces, hyphens, periods */
function isValidCity(city: string): boolean {
  return /^[a-zA-Z\s.\-']+$/.test(city.trim());
}

/** Convert AddressValue to single string */
export function addressToString(addr: AddressValue): string {
  const parts = [addr.street, addr.city, addr.state, addr.zip].filter(Boolean);
  return parts.join(", ");
}

/** Parse single address string into AddressValue (best-effort) */
export function parseAddress(str: string): AddressValue {
  if (!str) return emptyAddress;
  const parts = str.split(",").map((s) => s.trim());
  if (parts.length >= 4) {
    return { street: parts[0], city: parts[1], state: parts[2], zip: parts[3] };
  }
  if (parts.length === 3) {
    return { street: parts[0], city: parts[1], state: "", zip: parts[2] };
  }
  return { street: str, city: "", state: "", zip: "" };
}

interface AddressInputProps {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  errors?: Partial<Record<keyof AddressValue, string>>;
  showErrors?: boolean;
  required?: boolean;
}

const AddressInput: React.FC<AddressInputProps> = ({
  value, onChange, errors: externalErrors, showErrors = true, required = true,
}) => {
  const touched = React.useRef<Partial<Record<keyof AddressValue, boolean>>>({});

  const update = (field: keyof AddressValue, val: string) => {
    touched.current[field] = true;
    if (field === "zip") val = formatZip(val);
    onChange({ ...value, [field]: val });
  };

  // Compute inline errors
  const errors: Partial<Record<keyof AddressValue, string>> = { ...externalErrors };
  if (touched.current.street && value.street.trim().length > 0 && value.street.trim().length < 5) {
    errors.street = errors.street || "Street address must be at least 5 characters";
  }
  if (touched.current.city && value.city.trim().length > 0 && !isValidCity(value.city)) {
    errors.city = errors.city || "City must contain only letters";
  }
  if (touched.current.zip && value.zip.length > 0 && !isValidZip(value.zip)) {
    errors.zip = errors.zip || "Please enter a valid ZIP code (e.g. 12345)";
  }

  return (
    <div className="space-y-3">
      {/* Street */}
      <div>
        <Label className="text-sm">Street Address {required && "*"}</Label>
        <Input
          placeholder="123 Main St"
          value={value.street}
          onChange={(e) => update("street", e.target.value)}
          className={errors.street ? "border-destructive" : ""}
        />
        {showErrors && errors.street && <p className="text-destructive text-xs mt-1">{errors.street}</p>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* City */}
        <div className="col-span-2 sm:col-span-1">
          <Label className="text-sm">City {required && "*"}</Label>
          <Input
            placeholder="Austin"
            value={value.city}
            onChange={(e) => update("city", e.target.value)}
            className={errors.city ? "border-destructive" : ""}
          />
          {showErrors && errors.city && <p className="text-destructive text-xs mt-1">{errors.city}</p>}
        </div>

        {/* State */}
        <div>
          <Label className="text-sm">State {required && "*"}</Label>
          <Select value={value.state} onValueChange={(v) => update("state", v)}>
            <SelectTrigger className={!value.state && touched.current.state ? "border-destructive" : ""}>
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((st) => (
                <SelectItem key={st} value={st}>{st} — {STATE_NAMES[st]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showErrors && errors.state && <p className="text-destructive text-xs mt-1">{errors.state}</p>}
        </div>

        {/* ZIP */}
        <div>
          <Label className="text-sm">ZIP Code {required && "*"}</Label>
          <Input
            inputMode="numeric"
            placeholder="12345"
            value={value.zip}
            onChange={(e) => update("zip", e.target.value)}
            className={errors.zip ? "border-destructive" : ""}
          />
          {showErrors && errors.zip && <p className="text-destructive text-xs mt-1">{errors.zip}</p>}
        </div>
      </div>

      {/* Country (locked) */}
      <div>
        <Label className="text-sm">Country</Label>
        <Input value="United States" disabled className="bg-muted" />
      </div>
    </div>
  );
};

export { AddressInput, US_STATES, STATE_NAMES };
