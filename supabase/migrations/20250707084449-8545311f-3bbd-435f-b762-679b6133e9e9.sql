
-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- Create users table (extends Supabase auth)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usecases table
CREATE TABLE public.usecases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  department TEXT NOT NULL,
  task TEXT NOT NULL,
  generated_usecases JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workflow_submissions table
CREATE TABLE public.workflow_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  usecase TEXT NOT NULL,
  workflow_text TEXT NOT NULL,
  evaluation JSONB,
  score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create json_submissions table
CREATE TABLE public.json_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  usecase TEXT NOT NULL,
  workflow_json JSONB NOT NULL,
  evaluation JSONB,
  score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usecases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.json_submissions ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for usecases table
CREATE POLICY "Users can manage their own usecases" ON public.usecases
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all usecases" ON public.usecases
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for workflow_submissions table
CREATE POLICY "Users can manage their own workflow submissions" ON public.workflow_submissions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all workflow submissions" ON public.workflow_submissions
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for json_submissions table
CREATE POLICY "Users can manage their own json submissions" ON public.json_submissions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all json submissions" ON public.json_submissions
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'name',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
