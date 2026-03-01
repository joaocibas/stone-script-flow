
-- Dashboard KPIs view (aggregated, no PII)
CREATE OR REPLACE VIEW public.v_dashboard_kpis AS
SELECT
  COALESCE(SUM(total_amount) FILTER (WHERE status != 'cancelled'), 0) AS total_revenue,
  COALESCE(AVG(total_amount) FILTER (WHERE status != 'cancelled'), 0) AS avg_project_value,
  COUNT(*) FILTER (WHERE status != 'cancelled') AS total_orders,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_orders,
  COALESCE(SUM(deposit_paid) FILTER (WHERE status != 'cancelled'), 0) AS total_deposits_collected
FROM orders;

-- Margin estimation view (internal, admin-only via RLS on pricing_rules)
CREATE OR REPLACE VIEW public.v_margin_estimation AS
SELECT
  m.name AS material_name,
  m.category,
  pr.price_per_sqft AS customer_rate,
  pr.labor_rate_per_sqft,
  bs_internal.value::numeric AS internal_cost_per_sqft,
  CASE
    WHEN bs_internal.value::numeric > 0
    THEN ROUND(((pr.price_per_sqft - bs_internal.value::numeric) / pr.price_per_sqft) * 100, 1)
    ELSE NULL
  END AS estimated_margin_pct,
  COUNT(o.id) AS order_count,
  COALESCE(SUM(o.total_amount), 0) AS total_revenue
FROM pricing_rules pr
JOIN materials m ON m.id = pr.material_id
CROSS JOIN business_settings bs_internal
LEFT JOIN slabs s ON s.material_id = m.id
LEFT JOIN orders o ON o.slab_id = s.id AND o.status != 'cancelled'
WHERE pr.is_active = true
  AND bs_internal.key = 'internal_price_per_sqft'
GROUP BY m.id, m.name, m.category, pr.price_per_sqft, pr.labor_rate_per_sqft, bs_internal.value;

-- Set security invoker on new views
ALTER VIEW public.v_dashboard_kpis SET (security_invoker = on);
ALTER VIEW public.v_margin_estimation SET (security_invoker = on);
