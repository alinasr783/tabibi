CREATE OR REPLACE FUNCTION public.get_affiliate_commission_rate(affiliate_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clinics uuid[];
  active_count integer;
BEGIN
  SELECT array_agg(r.clinic_id) INTO clinics
  FROM public.affiliate_referrals r
  WHERE r.affiliate_user_id = get_affiliate_commission_rate.affiliate_user_id;

  IF clinics IS NULL THEN
    RETURN 0.20;
  END IF;

  SELECT count(*) INTO active_count
  FROM public.subscriptions s
  WHERE s.status = 'active'
    AND s.clinic_id = ANY (clinics);

  IF active_count >= 20 THEN
    RETURN 0.30;
  ELSIF active_count >= 5 THEN
    RETURN 0.25;
  END IF;

  RETURN 0.20;
END;
$$;

REVOKE ALL ON FUNCTION public.get_affiliate_commission_rate(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_affiliate_commission_rate(uuid) TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'affiliate_commissions') THEN
    UPDATE public.affiliate_commissions c
    SET
      commission_rate = public.get_affiliate_commission_rate(c.affiliate_user_id),
      commission_amount = c.base_amount * public.get_affiliate_commission_rate(c.affiliate_user_id)
    WHERE c.status = 'pending'
      AND c.available_at > now();
  END IF;
END
$$;

