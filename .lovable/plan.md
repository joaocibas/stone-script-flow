

# Countertops Altar Stones — System Architecture & Data Structure Plan

## Overview
A modular web platform for a Florida-based countertop company with two fully separated layers: a **customer-facing storefront** and a **secure admin dashboard**. All business-configurable values (pricing, buffers, deposits, slab dimensions, overage %, reservation windows) are stored in the database and editable via admin settings — **nothing is hardcoded**.

---

## Architecture Layers

### 1. Customer-Facing Layer
What customers see and interact with:
- **Browse Materials & Slabs** — View available countertop materials (granite, quartz, marble, etc.) with photos, colors, and dimensions
- **Get Instant Quotes** — Enter countertop dimensions, select material, and receive an estimated price (calculated server-side, only the final estimate is returned — no pricing logic or formulas exposed)
- **Reserve a Slab** — Place a hold on a specific slab by paying a deposit (amount and reservation duration are admin-configurable)
- **Book a Consultation** — Request a measurement appointment for the Sarasota service area
- **Order Tracking** — View order status after placing a deposit

### 2. Admin Layer
Protected dashboard for business operations:
- **Inventory Management** — Add, edit, archive slabs; track stock with photos, dimensions, material type, and lot numbers
- **Pricing Engine** — Set per-material pricing (per sq ft), labor rates, edge profiles, cutout costs, overage percentages, and buffer amounts — all stored as editable settings
- **Business Settings** — Configure deposit amounts, reservation hold days, service area zip codes, company info, tax rates
- **Order & Reservation Management** — View customer reservations, approve/reject orders, update statuses
- **Customer Management** — View customer profiles and order history

### 3. Server-Side Logic (Supabase Edge Functions + RLS)
All sensitive business logic runs server-side:
- **Quote Calculator** — Edge function that takes dimensions + material ID, fetches pricing settings from DB, calculates total (with overage, buffers, labor), and returns only the final price
- **Reservation Logic** — Edge function to create holds, auto-expire after configurable days
- **Role-Based Access** — `user_roles` table with RLS policies; admin routes fully protected; pricing/cost tables invisible to customer role

---

## Data Structure

### Core Tables

| Table | Purpose |
|-------|---------|
| `materials` | Material types (granite, quartz, etc.) with display info |
| `slabs` | Individual slab inventory — dimensions, lot #, photos, status (available/reserved/sold) |
| `business_settings` | Key-value store for all configurable values (deposit_amount, reservation_days, overage_pct, tax_rate, etc.) |
| `pricing_rules` | Per-material pricing: price per sq ft, labor rate, edge costs — **admin-only, never exposed to customers** |
| `quotes` | Customer quote requests with calculated totals |
| `reservations` | Slab holds with expiration dates |
| `orders` | Confirmed orders with status tracking |
| `appointments` | Consultation/measurement bookings |
| `customers` | Customer profiles linked to auth |
| `user_roles` | Role assignments (admin, customer) with RLS security definer function |
| `service_areas` | Zip codes / regions the company serves |

### Key Design Principles
- **`business_settings`** is a flexible key-value table so new configurable values can be added without schema changes
- **`pricing_rules`** has RLS policies that block all customer access — quotes are calculated via edge functions only
- **Slab status** transitions (available → reserved → sold) are enforced server-side
- **Reservation expiry** is handled by checking `reserved_until` timestamps, with optional scheduled cleanup

---

## Authentication & Roles
- **Customer accounts** — sign up / log in to get quotes, reserve slabs, and track orders
- **Admin accounts** — separate role with full dashboard access
- Roles stored in `user_roles` table (never on profiles), with `has_role()` security definer function for RLS policies

---

## Security Boundaries
- Pricing formulas, cost breakdowns, and margin data **never leave the server**
- Customer-facing API responses contain only: material display info, final quoted price, slab availability
- All admin endpoints protected by role-based RLS
- Edge functions handle all calculations so no business logic runs client-side

---

## Tech Stack
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (Lovable Cloud) — Postgres DB, Auth, Edge Functions, RLS
- **Payments** (future): Stripe integration for deposits

