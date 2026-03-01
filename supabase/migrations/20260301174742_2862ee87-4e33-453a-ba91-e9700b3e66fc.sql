
-- Add missing business settings for full configurability
INSERT INTO public.business_settings (key, value, description) VALUES
  -- Default slab dimensions
  ('default_slab_length_inches', '120', 'Default slab length in inches for new inventory entries'),
  ('default_slab_width_inches', '60', 'Default slab width in inches for new inventory entries'),
  ('default_slab_thickness', '3cm', 'Default slab thickness for new inventory entries'),
  -- Email template settings
  ('email_sender_name', 'Altar Stones Countertops', 'Display name on outgoing emails'),
  ('email_support_address', 'info@altarstones.com', 'Support/reply-to email address'),
  ('email_warranty_address', 'warranty@altarstones.com', 'Warranty claims email address'),
  ('email_privacy_address', 'privacy@altarstones.com', 'Privacy inquiries email address'),
  -- Feature toggles
  ('feature_online_booking', 'true', 'Enable/disable online consultation booking'),
  ('feature_slab_reservation', 'true', 'Enable/disable slab deposit & reservation flow'),
  ('feature_instant_quote', 'true', 'Enable/disable the online estimator tool'),
  ('feature_customer_portal', 'true', 'Enable/disable customer login & dashboard'),
  ('feature_ai_insights', 'true', 'Enable/disable AI analytics for admin dashboard'),
  ('feature_cookie_consent', 'true', 'Show cookie consent banner to visitors')
ON CONFLICT DO NOTHING;
