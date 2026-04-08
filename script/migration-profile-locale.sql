-- 1) Ensure preferred_locale exists and is clean/normalized.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_locale TEXT;

UPDATE public.profiles
SET preferred_locale = split_part(
  split_part(lower(COALESCE(preferred_locale, 'fr')), ';', 1),
  '-',
  1
);

UPDATE public.profiles
SET preferred_locale = 'fr'
WHERE preferred_locale NOT IN ('fr', 'en', 'es', 'de');

ALTER TABLE public.profiles
ALTER COLUMN preferred_locale SET DEFAULT 'fr';

ALTER TABLE public.profiles
ALTER COLUMN preferred_locale SET NOT NULL;

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_preferred_locale_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_preferred_locale_check
CHECK (preferred_locale IN ('fr', 'en', 'es', 'de'));

-- 2) Persist locale from auth metadata when profile is auto-created.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
	extracted_name TEXT;
	extracted_avatar TEXT;
	extracted_locale TEXT;
	normalized_locale TEXT;
BEGIN
	extracted_name := COALESCE(
		NEW.raw_user_meta_data->>'full_name',
		NEW.raw_user_meta_data->>'name',
		split_part(NEW.email, '@', 1)
	);

	extracted_avatar := COALESCE(
		NEW.raw_user_meta_data->>'avatar_url',
		NEW.raw_user_meta_data->>'picture'
	);

	extracted_locale := COALESCE(
		NEW.raw_user_meta_data->>'preferred_locale',
		NEW.raw_user_meta_data->>'locale',
		NEW.raw_user_meta_data->>'language'
	);

	normalized_locale := split_part(
		split_part(lower(COALESCE(extracted_locale, 'fr')), ';', 1),
		'-',
		1
	);

	IF normalized_locale NOT IN ('fr', 'en', 'es', 'de') THEN
		normalized_locale := 'fr';
	END IF;

	INSERT INTO public.profiles (
		id,
		email,
		full_name,
		avatar_url,
		role,
		has_accepted_terms,
		preferred_locale
	)
	VALUES (
		NEW.id,
		NEW.email,
		extracted_name,
		extracted_avatar,
		'user',
		COALESCE((NEW.raw_user_meta_data->>'has_accepted_terms')::boolean, false),
		normalized_locale
	)
	ON CONFLICT (id) DO UPDATE SET
		email = EXCLUDED.email,
		full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
		avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
		updated_at = NOW();

	RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Ensure the auth trigger is present and points to the updated function.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
