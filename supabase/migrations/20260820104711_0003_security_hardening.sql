/*
# DigitalVault SA — Security Hardening

## Overview
Fixes security advisor warnings:
1. Revoke EXECUTE on `handle_new_user()` and `is_admin()` from anon and authenticated roles — these are internal helper functions not meant to be called directly via the REST API. `handle_new_user` is only called by a trigger on `auth.users`; `is_admin` is only called inside RLS policies.
2. Set `search_path` on `set_updated_at()` trigger function to lock it down.

## Security
- No new tables or columns.
- Functions remain functional for their intended internal use (triggers and RLS policies) but are no longer callable via the public REST API by anon or authenticated roles.
*/

-- Lock down set_updated_at search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Revoke direct execution on helper functions from anon and authenticated
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, authenticated;
