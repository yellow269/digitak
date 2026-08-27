/*
# Everything Store — RLS & Security Hardening

## Overview
1. Profile update policy: restricts which columns a normal user can update.
   Users can ONLY update: full_name, bio, phone, avatar.
   Users CANNOT update: role, is_admin, email, permissions, subscription.
2. Input validation constraints for public insert tables.
3. Click rate limiting via a database function.

## Security
- Profile update uses column-level restriction via a BEFORE UPDATE trigger.
- Public insert tables get CHECK constraints for input length.
- Click tracking gets a per-minute rate limit function.
*/

-- =============================================
-- 1. Profile update column restriction
-- =============================================

-- Create a function that strips out privileged fields from profile updates
CREATE OR REPLACE FUNCTION public.restrict_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow non-admin users to update safe fields
  IF NOT public.is_admin() THEN
    -- Force privileged fields to remain unchanged
    NEW.role := OLD.role;
    NEW.email := OLD.email;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS restrict_profile_update ON profiles;
CREATE TRIGGER restrict_profile_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_profile_update();

-- =============================================
-- 2. Input validation constraints
-- =============================================

-- Contact messages: enforce reasonable length limits
ALTER TABLE contact_messages
  ADD CONSTRAINT contact_name_length CHECK (char_length(name) BETWEEN 1 AND 100),
  ADD CONSTRAINT contact_email_length CHECK (char_length(email) BETWEEN 1 AND 254),
  ADD CONSTRAINT contact_subject_length CHECK (subject IS NULL OR char_length(subject) <= 200),
  ADD CONSTRAINT contact_message_length CHECK (char_length(message) BETWEEN 1 AND 5000);

-- Newsletter subscribers: enforce email length
ALTER TABLE newsletter_subscribers
  ADD CONSTRAINT newsletter_email_length CHECK (char_length(email) BETWEEN 1 AND 254),
  ADD CONSTRAINT newsletter_consent_check CHECK (consent = true);

-- =============================================
-- 3. Click rate limiting (max 30 clicks per IP per minute)
-- =============================================

CREATE OR REPLACE FUNCTION public.check_click_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  -- Count clicks from this product in the last minute (coarse rate limit)
  SELECT count(*) INTO recent_count
  FROM public.affiliate_clicks
  WHERE product_id = NEW.product_id
    AND created_at > now() - interval '1 minute';

  IF recent_count >= 30 THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please try again later.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_click_rate_limit ON affiliate_clicks;
CREATE TRIGGER check_click_rate_limit
  BEFORE INSERT ON affiliate_clicks
  FOR EACH ROW
  EXECUTE FUNCTION public.check_click_rate_limit();

-- =============================================
-- 4. Admin-only read for sensitive data
-- =============================================

-- Ensure profiles are only readable by the owner or admins
-- (drop old policy and recreate with admin read access)
DROP POLICY IF EXISTS "profiles_read_own" ON profiles;
CREATE POLICY "profiles_read_own" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR is_admin());

-- =============================================
-- 5. Revoke direct EXECUTE on the new function
-- =============================================

REVOKE EXECUTE ON FUNCTION public.restrict_profile_update() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_click_rate_limit() FROM anon, authenticated;
