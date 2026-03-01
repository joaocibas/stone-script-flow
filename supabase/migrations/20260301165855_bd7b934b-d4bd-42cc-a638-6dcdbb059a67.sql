
-- Fix security definer warnings by explicitly setting SECURITY INVOKER
ALTER VIEW public.v_funnel_metrics SET (security_invoker = on);
ALTER VIEW public.v_revenue_by_material SET (security_invoker = on);
ALTER VIEW public.v_sla_summary SET (security_invoker = on);
ALTER VIEW public.v_icp_signals SET (security_invoker = on);
ALTER VIEW public.v_pricing_validation SET (security_invoker = on);
ALTER VIEW public.v_reservation_patterns SET (security_invoker = on);
ALTER VIEW public.v_scheduling_patterns SET (security_invoker = on);
