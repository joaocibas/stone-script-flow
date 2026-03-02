
-- Add best option fields to slabs table
ALTER TABLE public.slabs
  ADD COLUMN best_option_preset TEXT NULL,
  ADD COLUMN usable_sqft_override NUMERIC NULL,
  ADD COLUMN overage_pct_override NUMERIC NULL,
  ADD COLUMN best_option_notes TEXT NULL;
