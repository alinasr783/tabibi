ALTER TABLE public.patient_plans
ADD COLUMN IF NOT EXISTS advanced_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.financial_records
ADD COLUMN IF NOT EXISTS visit_id bigint;

ALTER TABLE public.financial_records
ADD COLUMN IF NOT EXISTS reference_key text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'financial_records_visit_id_fkey'
  ) THEN
    ALTER TABLE public.financial_records
    ADD CONSTRAINT financial_records_visit_id_fkey
    FOREIGN KEY (visit_id) REFERENCES public.visits(id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS financial_records_clinic_reference_key_uidx
ON public.financial_records (clinic_id, reference_key)
WHERE reference_key IS NOT NULL;
