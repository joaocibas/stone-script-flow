
-- 1. Prevent double-reserving a slab: only one active reservation per slab
CREATE UNIQUE INDEX idx_one_active_reservation_per_slab
ON public.reservations (slab_id)
WHERE status = 'active';

-- 2. Function to expire overdue reservations and return slabs to available
CREATE OR REPLACE FUNCTION public.expire_overdue_reservations()
RETURNS TABLE(expired_count int, slabs_released int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_count int;
  v_slabs_released int;
BEGIN
  -- Mark overdue active reservations as expired
  WITH expired AS (
    UPDATE reservations
    SET status = 'expired'
    WHERE status = 'active'
      AND reserved_until < now()
    RETURNING slab_id
  )
  SELECT count(*) INTO v_expired_count FROM expired;

  -- Return those slabs to available status
  WITH released AS (
    UPDATE slabs
    SET status = 'available', updated_at = now()
    WHERE status = 'reserved'
      AND id NOT IN (
        SELECT slab_id FROM reservations WHERE status = 'active'
      )
    RETURNING id
  )
  SELECT count(*) INTO v_slabs_released FROM released;

  expired_count := v_expired_count;
  slabs_released := v_slabs_released;
  RETURN NEXT;
END;
$$;
