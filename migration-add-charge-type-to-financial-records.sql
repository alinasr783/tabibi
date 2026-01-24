-- Migration to add 'charge' type to financial_records table
-- This allows tracking patient dues separately from clinic expenses

ALTER TABLE public.financial_records DROP CONSTRAINT IF EXISTS financial_records_type_check;

ALTER TABLE public.financial_records 
  ADD CONSTRAINT financial_records_type_check 
  CHECK (type = ANY (ARRAY['income'::text, 'expense'::text, 'charge'::text]));
