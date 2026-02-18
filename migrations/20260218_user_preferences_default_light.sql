-- Make light mode the default theme for new accounts
ALTER TABLE public.user_preferences
ALTER COLUMN theme_mode SET DEFAULT 'light';

-- Treat the previous default (system) as "not customized" when untouched
UPDATE public.user_preferences
SET theme_mode = 'light'
WHERE theme_mode = 'system'
  AND updated_at = created_at;

