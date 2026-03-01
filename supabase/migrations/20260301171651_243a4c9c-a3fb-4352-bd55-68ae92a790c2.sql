
-- Revenue trend by month (aggregated, no PII)
CREATE OR REPLACE VIEW public.v_revenue_trend AS
SELECT
  date_trunc('month', created_at)::date AS month,
  COUNT(*) FILTER (WHERE status != 'cancelled') AS order_count,
  COALESCE(SUM(total_amount) FILTER (WHERE status != 'cancelled'), 0) AS revenue,
  COALESCE(SUM(deposit_paid) FILTER (WHERE status != 'cancelled'), 0) AS deposits
FROM orders
GROUP BY date_trunc('month', created_at)
ORDER BY month;

ALTER VIEW public.v_revenue_trend SET (security_invoker = on);
