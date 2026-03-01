
# Countertops Altar Stones — Full System Architecture

## Overview
A modular, full-stack web platform for a Florida-based countertop company (Sarasota area). Two fully separated layers — **customer storefront** and **admin dashboard** — with all business values database-driven and editable via admin. No hardcoded pricing, rates, or business logic on the client.

---

## Module 1: Front-End Layer

### Customer Storefront
| Page | Purpose |
|------|---------|
| `/` | Landing page — hero, featured materials, CTA for quote |
| `/materials` | Browse material categories (granite, quartz, marble, etc.) |
| `/materials/:id` | Material detail — colors, slabs available, starting price range |
| `/slabs` | Slab gallery with filters (material, size, color, availability) |
| `/slabs/:id` | Slab detail — dimensions, photos, reserve CTA |
| `/quote` | Instant quote form — dimensions, material, edge, cutouts |
| `/book` | Appointment booking form for measurement consultations |
| `/login` | Customer login/signup |
| `/dashboard` | Customer portal — quotes, reservations, orders, appointments |
| `/track/:id` | Order tracking page |

### Admin Dashboard (`/admin/*`)
| Page | Purpose |
|------|---------|
| `/admin` | Overview dashboard — KPIs, recent activity |
| `/admin/inventory` | Slab & material CRUD management |
| `/admin/pricing` | Pricing engine — per-material rates, labor, edges, cutouts |
| `/admin/orders` | Order & reservation management |
| `/admin/appointments` | Appointment calendar & management |
| `/admin/customers` | CRM & customer profiles |
| `/admin/pipeline` | Sales pipeline (lead → quote → reservation → order → complete) |
| `/admin/billing` | Stripe billing, invoices, deposit tracking |
| `/admin/analytics` | Business analytics & reports |
| `/admin/ai` | AI Strategic Control Center |
| `/admin/settings` | Global business configuration |
| `/admin/legal` | Legal documents & compliance management |

### Shared Components
- `<AppLayout>` — customer layout with nav, footer
- `<AdminLayout>` — sidebar nav, breadcrumbs, role guard
- `<AuthGuard>` — route protection by role (customer/admin)
- `<MaterialCard>`, `<SlabCard>` — reusable display cards
- `<QuoteForm>`, `<BookingForm>` — multi-step forms

---

## Module 2: Estimator Engine

### Purpose
Server-side quote calculation — no pricing logic exposed to the client.

### Architecture
```
Client (form) → Edge Function "calculate-quote" → DB (pricing_rules + business_settings) → Response (total only)
```

### Edge Function: `calculate-quote`
**Input:** material_id, length_inches, width_inches, edge_profile, num_cutouts
**Process:**
1. Fetch `pricing_rules` for material_id
2. Fetch `business_settings` (overage_pct, tax_rate, buffer)
3. Calculate:
   - `area_sqft = (length × width) / 144`
   - `material_cost = area_sqft × (1 + overage_pct/100) × price_per_sqft`
   - `labor_cost = area_sqft × labor_rate_per_sqft`
   - `edge_cost = edge_profile_cost` (if selected)
   - `cutout_total = num_cutouts × cutout_cost`
   - `subtotal = material_cost + labor_cost + edge_cost + cutout_total`
   - `tax = subtotal × tax_rate/100`
   - `total = subtotal + tax`
4. Store in `quotes` table
5. Return only: `{ estimated_total, quote_id }`

### DB Tables Used
- `pricing_rules` (admin-only RLS)
- `business_settings` (overage_pct, tax_rate)
- `quotes` (stored result)

---

## Module 3: Slab Product Management

### Purpose
Full inventory lifecycle for individual stone slabs.

### Features
- **CRUD** — Add/edit/archive slabs with photos, dimensions, lot numbers
- **Status Machine:** `available → reserved → sold → archived`
- **Bulk Import** — CSV upload for batch slab entry
- **Photo Management** — Multiple images per slab via storage bucket
- **Filtering** — By material, status, size range, color

### DB Tables
- `slabs` — individual inventory items
- `materials` — parent material types
- **Storage bucket:** `slab-images` for photo uploads

### New Table: `slab_colors`
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | PK |
| name | text | Color name (e.g., "Bianco Carrara") |
| hex_code | text | Display color |
| is_active | boolean | Toggleable |

### Slab Table Addition
- Add `color_id` FK to `slabs` table
- Add `price_group` text for admin categorization

---

## Module 4: Deposit & Reservation System

### Purpose
Allow customers to hold slabs with a configurable deposit.

### Flow
```
Customer selects slab → Edge Function "create-reservation" → Stripe payment intent → On success: slab status → "reserved", reservation created with expiry
```

### Edge Function: `create-reservation`
1. Verify slab is `available`
2. Fetch `business_settings` (deposit_amount, reservation_days)
3. Create Stripe PaymentIntent for deposit_amount
4. On payment confirmation:
   - Insert into `reservations` (reserved_until = now + reservation_days)
   - Update slab status to `reserved`
5. Return confirmation

### Edge Function: `expire-reservations` (scheduled/cron)
- Query reservations where `reserved_until < now()` AND `status = 'active'`
- Set reservation status → `expired`
- Set slab status → `available`

### DB Tables
- `reservations`
- `slabs` (status updates)
- `business_settings` (deposit_amount, reservation_days)

---

## Module 5: Scheduling System

### Purpose
Appointment booking for in-home measurements and consultations.

### Features
- **Public Booking Form** — name, email, phone, address, zip, preferred date/time, notes
- **Service Area Validation** — check zip code against `service_areas`
- **Admin Calendar View** — daily/weekly view of upcoming appointments
- **Status Management** — requested → confirmed → completed/cancelled
- **Email Notifications** (future) — confirmation and reminders

### New Table: `availability_slots`
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | PK |
| day_of_week | int | 0-6 (Sun-Sat) |
| start_time | time | Slot start |
| end_time | time | Slot end |
| is_active | boolean | Toggleable |

### New Table: `blocked_dates`
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | PK |
| date | date | Blocked date |
| reason | text | Holiday, vacation, etc. |

---

## Module 6: CRM & Sales Pipeline

### Purpose
Track customer lifecycle from lead to completed project.

### Pipeline Stages
```
Lead → Quoted → Reserved → Ordered → In Progress → Installed → Completed
```

### New Table: `pipeline_entries`
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | PK |
| customer_id | uuid | FK → customers |
| stage | enum | Pipeline stage |
| quote_id | uuid | FK → quotes (nullable) |
| reservation_id | uuid | FK → reservations (nullable) |
| order_id | uuid | FK → orders (nullable) |
| assigned_to | text | Sales rep name |
| notes | text | Internal notes |
| value | numeric | Estimated deal value |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### Pipeline Stage Enum
```sql
CREATE TYPE pipeline_stage AS ENUM ('lead', 'quoted', 'reserved', 'ordered', 'in_progress', 'installed', 'completed', 'lost');
```

### Features
- **Kanban Board** — drag-and-drop pipeline view
- **Customer Timeline** — all interactions (quotes, reservations, orders, appointments)
- **Notes & Tags** — internal CRM notes per customer
- **Filters** — by stage, date range, assigned rep, value

---

## Module 7: Billing Engine (Stripe)

### Purpose
Handle deposits, payments, invoicing via Stripe.

### Integration Points
| Action | Stripe API | Trigger |
|--------|-----------|---------|
| Slab deposit | PaymentIntent | Customer reserves slab |
| Order payment | PaymentIntent | Order confirmed |
| Invoice generation | Invoice API | Admin creates invoice |
| Refund | Refund API | Admin cancels reservation |

### Edge Functions
- `create-payment-intent` — deposit or order payment
- `stripe-webhook` — handle payment confirmations, refunds
- `create-invoice` — generate Stripe invoice for customer

### New Table: `payments`
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | PK |
| customer_id | uuid | FK → customers |
| order_id | uuid | FK → orders (nullable) |
| reservation_id | uuid | FK → reservations (nullable) |
| stripe_payment_id | text | Stripe reference |
| amount | numeric | Payment amount |
| type | enum | deposit, payment, refund |
| status | enum | pending, succeeded, failed, refunded |
| created_at | timestamptz | |

---

## Module 8: Tracking & Analytics

### Purpose
Business intelligence dashboard for the admin.

### Metrics
- **Revenue** — daily/weekly/monthly totals, by material type
- **Inventory** — slabs by status, low stock alerts
- **Pipeline** — conversion rates per stage, average deal time
- **Quotes** — quote-to-order conversion rate
- **Appointments** — booking volume, completion rate
- **Customer** — new vs returning, lifetime value

### Implementation
- **DB Views** for pre-aggregated metrics (materialized where needed)
- **Recharts** for client-side visualization
- **Date range filters** on all dashboards

### New DB Views
```sql
-- Revenue summary
CREATE VIEW admin_revenue_summary AS ...
-- Inventory status counts
CREATE VIEW admin_inventory_summary AS ...
-- Pipeline conversion funnel
CREATE VIEW admin_pipeline_funnel AS ...
```
(Views secured by admin-only RLS via wrapping in security definer functions)

---

## Module 9: AI Strategic Control Center

### Purpose
AI-powered business insights and automation for admins.

### Features (powered by Lovable AI Gateway)
- **Demand Forecasting** — predict material demand based on quote/order history
- **Pricing Suggestions** — analyze competitor data and suggest optimal pricing
- **Customer Insights** — sentiment analysis on notes, churn prediction
- **Inventory Alerts** — smart reorder suggestions based on sales velocity
- **Quote Optimization** — suggest upsells based on customer profile

### Architecture
```
Admin triggers analysis → Edge Function → Lovable AI Gateway (gemini-2.5-flash) → Structured response → Display in dashboard
```

### Edge Function: `ai-insights`
- Accepts: `{ type: "demand_forecast" | "pricing_suggestion" | "customer_insight" | "inventory_alert" }`
- Fetches relevant data from DB
- Sends structured prompt to AI Gateway
- Returns parsed insights

### No new tables needed — reads from existing data, results displayed ephemerally or cached in `business_settings` with `internal_` prefix (admin-only).

---

## Module 10: Global Configuration Panel

### Purpose
Single admin page to manage all business-configurable values.

### Settings Categories
| Category | Keys | Purpose |
|----------|------|---------|
| **Pricing** | overage_pct, tax_rate, default_labor_rate | Global pricing modifiers |
| **Reservations** | deposit_amount, reservation_days | Reservation rules |
| **Company** | company_name, company_phone, company_email, company_address | Company info |
| **Service Area** | service_area_description | + managed via `service_areas` table |
| **Scheduling** | booking_lead_days, max_daily_appointments | Appointment rules |
| **Legal** | terms_url, privacy_url, warranty_days | Legal document links |

### Implementation
- All values in `business_settings` key-value table
- Admin form with grouped sections
- Changes take effect immediately (no deploy needed)
- Audit trail via `updated_at` timestamps

---

## Module 11: Legal & Protection Layer

### Purpose
Manage legal documents, warranties, and compliance.

### New Table: `legal_documents`
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | PK |
| type | enum | terms, privacy, warranty, contract |
| title | text | Document title |
| content | text | Full document content (markdown) |
| version | int | Version number |
| is_active | boolean | Current active version |
| created_at | timestamptz | |

### New Table: `customer_agreements`
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | PK |
| customer_id | uuid | FK → customers |
| document_id | uuid | FK → legal_documents |
| agreed_at | timestamptz | When customer accepted |
| ip_address | text | IP at time of agreement |

### Features
- **Document Management** — admin creates/versions legal docs
- **Customer Consent Tracking** — records when customers accept terms
- **Warranty Tracking** — linked to orders, configurable duration
- **Contract Generation** (future) — auto-generate project contracts

---

## Security Summary

| Layer | Protection |
|-------|-----------|
| Pricing data | Admin-only RLS, edge function calculates, returns total only |
| Customer data | User can only see own records |
| Admin routes | `has_role(auth.uid(), 'admin')` on all admin tables |
| Payments | Stripe handles PCI compliance, edge functions manage intents |
| Legal agreements | Immutable once created (no UPDATE/DELETE for customers) |
| AI insights | Admin-only, data never leaves server |

---

## Tech Stack
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui + Recharts + Framer Motion
- **Backend**: Lovable Cloud — Postgres DB, Auth, Edge Functions, RLS
- **Payments**: Stripe (deposits, orders, invoices, refunds)
- **AI**: Lovable AI Gateway (gemini-2.5-flash for insights)
- **Storage**: Lovable Cloud storage (slab photos, legal documents)
