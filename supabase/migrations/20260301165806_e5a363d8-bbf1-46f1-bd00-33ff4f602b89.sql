
-- Aggregated anonymized views for AI analytics

-- 1. Funnel metrics (quote → reservation → order conversion)
CREATE OR REPLACE VIEW public.v_funnel_metrics AS
SELECT
  COUNT(*) FILTER (WHERE true) AS total_quotes,
  COUNT(*) FILTER (WHERE status = 'calculated') AS calculated_quotes,
  COUNT(DISTINCT q.customer_id) AS unique_customers_quoted,
  (SELECT COUNT(*) FROM reservations) AS total_reservations,
  (SELECT COUNT(*) FROM reservations WHERE status = 'converted') AS converted_reservations,
  (SELECT COUNT(*) FROM orders) AS total_orders,
  (SELECT COUNT(*) FROM orders WHERE status = 'completed') AS completed_orders
FROM quotes q;

-- 2. Revenue by material (anonymized)
CREATE OR REPLACE VIEW public.v_revenue_by_material AS
SELECT
  m.name AS material_name,
  m.category,
  COUNT(o.id) AS order_count,
  COALESCE(SUM(o.total_amount), 0) AS total_revenue,
  COALESCE(AVG(o.total_amount), 0) AS avg_order_value,
  COUNT(DISTINCT o.customer_id) AS unique_customers
FROM materials m
LEFT JOIN slabs s ON s.material_id = m.id
LEFT JOIN orders o ON o.slab_id = s.id AND o.status != 'cancelled'
GROUP BY m.id, m.name, m.category;

-- 3. SLA summary (anonymized)
CREATE OR REPLACE VIEW public.v_sla_summary AS
SELECT
  COUNT(*) AS total_alerts,
  COUNT(*) FILTER (WHERE acknowledged = true) AS acknowledged_alerts,
  COUNT(*) FILTER (WHERE acknowledged = false) AS unacknowledged_alerts,
  breach_type,
  MIN(breached_at) AS earliest_breach,
  MAX(breached_at) AS latest_breach
FROM sla_alerts
GROUP BY breach_type;

-- 4. ICP signals (anonymized customer patterns)
CREATE OR REPLACE VIEW public.v_icp_signals AS
SELECT
  COUNT(*) AS total_customers,
  COUNT(*) FILTER (WHERE o.id IS NOT NULL) AS customers_with_orders,
  AVG(order_totals.total_spent) AS avg_lifetime_value,
  AVG(order_totals.order_count) AS avg_orders_per_customer,
  COUNT(DISTINCT sa.zip_code) AS active_zip_codes
FROM customers c
LEFT JOIN (
  SELECT customer_id, COUNT(*) AS order_count, SUM(total_amount) AS total_spent
  FROM orders WHERE status != 'cancelled'
  GROUP BY customer_id
) order_totals ON order_totals.customer_id = c.id
LEFT JOIN orders o ON o.customer_id = c.id
LEFT JOIN service_areas sa ON sa.is_active = true;

-- 5. Pricing validation view
CREATE OR REPLACE VIEW public.v_pricing_validation AS
SELECT
  m.name AS material_name,
  m.category,
  pr.price_per_sqft,
  pr.labor_rate_per_sqft,
  pr.edge_profile_cost,
  pr.cutout_cost,
  COUNT(q.id) AS quote_count,
  AVG(q.calculated_sqft) AS avg_sqft_quoted,
  AVG(q.estimated_total) AS avg_quote_total,
  MIN(q.range_min) AS min_range,
  MAX(q.range_max) AS max_range
FROM pricing_rules pr
JOIN materials m ON m.id = pr.material_id
LEFT JOIN quotes q ON q.material_id = m.id AND q.status = 'calculated'
WHERE pr.is_active = true
GROUP BY m.id, m.name, m.category, pr.price_per_sqft, pr.labor_rate_per_sqft, pr.edge_profile_cost, pr.cutout_cost;

-- 6. Reservation conflict patterns
CREATE OR REPLACE VIEW public.v_reservation_patterns AS
SELECT
  COUNT(*) AS total_reservations,
  COUNT(*) FILTER (WHERE status = 'active') AS active_reservations,
  COUNT(*) FILTER (WHERE status = 'expired') AS expired_reservations,
  COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_reservations,
  COUNT(*) FILTER (WHERE status = 'converted') AS converted_reservations,
  AVG(EXTRACT(EPOCH FROM (reserved_until - reserved_at)) / 3600) AS avg_hold_hours,
  AVG(deposit_amount) AS avg_deposit
FROM reservations;

-- 7. Appointment/scheduling patterns
CREATE OR REPLACE VIEW public.v_scheduling_patterns AS
SELECT
  COUNT(*) AS total_appointments,
  COUNT(*) FILTER (WHERE status = 'requested') AS requested,
  COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed,
  COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
  COUNT(DISTINCT zip_code) AS unique_zip_codes
FROM appointments;

-- Admin AI Reports table
CREATE TABLE public.admin_ai_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type text NOT NULL,
  period text NOT NULL DEFAULT 'snapshot',
  result_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_used text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_ai_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can access AI reports"
ON public.admin_ai_reports
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add AI report frequency setting
INSERT INTO public.business_settings (key, value, description)
VALUES ('ai_report_frequency', 'weekly', 'How often AI analytics reports run automatically (daily, weekly, manual)')
ON CONFLICT DO NOTHING;
