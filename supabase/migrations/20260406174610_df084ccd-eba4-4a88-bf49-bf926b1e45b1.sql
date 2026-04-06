
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free',
  subscription_status TEXT NOT NULL DEFAULT 'active',
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create scanned_jobs table
CREATE TABLE public.scanned_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_url TEXT,
  job_title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_location TEXT,
  posted_date TEXT,
  has_salary BOOLEAN,
  description TEXT,
  ghost_score INTEGER,
  rating TEXT,
  signals JSONB,
  application_status TEXT NOT NULL DEFAULT 'saved',
  notes TEXT,
  follow_up_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scanned_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scanned jobs"
  ON public.scanned_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scanned jobs"
  ON public.scanned_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scanned jobs"
  ON public.scanned_jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scanned jobs"
  ON public.scanned_jobs FOR DELETE
  USING (auth.uid() = user_id);

-- Create job_applications table
CREATE TABLE public.job_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.scanned_jobs(id) ON DELETE CASCADE,
  applied_date DATE,
  response_received BOOLEAN NOT NULL DEFAULT false,
  response_date DATE,
  outcome TEXT NOT NULL DEFAULT 'none',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own job applications"
  ON public.job_applications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.scanned_jobs
    WHERE scanned_jobs.id = job_applications.job_id
      AND scanned_jobs.user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own job applications"
  ON public.job_applications FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.scanned_jobs
    WHERE scanned_jobs.id = job_applications.job_id
      AND scanned_jobs.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own job applications"
  ON public.job_applications FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.scanned_jobs
    WHERE scanned_jobs.id = job_applications.job_id
      AND scanned_jobs.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own job applications"
  ON public.job_applications FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.scanned_jobs
    WHERE scanned_jobs.id = job_applications.job_id
      AND scanned_jobs.user_id = auth.uid()
  ));

-- Timestamp update function and triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scanned_jobs_updated_at
  BEFORE UPDATE ON public.scanned_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
