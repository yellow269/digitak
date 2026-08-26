-- Set jptechsolutions269@gmail.com as admin
-- This migration ensures the site owner has admin access.

-- If the profile exists, update role to admin
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'jptechsolutions269@gmail.com';

-- If the profile doesn't exist yet (user hasn't signed up or trigger missed),
-- insert it linked to their auth.users row
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'jptechsolutions269@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE email = 'jptechsolutions269@gmail.com'
  );
