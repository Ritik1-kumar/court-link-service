-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read all profiles" ON profiles;

-- Drop and recreate the trigger function to handle all metadata
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS 
$$
BEGIN
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
    COALESCE(NEW.raw_user_meta_data->'bank_details', '{}'::jsonb),
    COALESCE((NEW.raw_user_meta_data->>'vat_reclaim')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'terms_accepted')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'marketing_consent')::boolean, false)
  );
  RETURN NEW;
END;
$$
LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Recreate policies with proper permissions

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

  -- Allow all authenticated users to read all profiles
CREATE POLICY "Allow authenticated users to read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);