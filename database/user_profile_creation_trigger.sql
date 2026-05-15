-- Drop and recreate the trigger function with better error handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS 
$$
DECLARE
  v_bank_details JSONB;
BEGIN
  -- Extract bank_details, ensuring it's valid JSONB
  v_bank_details := COALESCE(NEW.raw_user_meta_data->'bank_details', '{}'::jsonb);
  
  -- Log for debugging (optional, can be removed in production)
  RAISE NOTICE 'Creating profile for user: %, role: %, bank_details: %', 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'role', 'applicant'),
    v_bank_details;
  
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    phone,
    role,
    bank_details,
    vat_reclaim,
    terms_accepted,
    marketing_consent
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'applicant'),
    v_bank_details,
    COALESCE((NEW.raw_user_meta_data->>'vat_reclaim')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'terms_accepted')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'marketing_consent')::boolean, false)
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$
LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();