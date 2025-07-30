-- Add missing columns to fix TypeScript errors

-- Add missing columns to contact_group_members table
ALTER TABLE contact_group_members 
ADD COLUMN IF NOT EXISTS added_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add missing columns to campaigns table (if not exists)
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS target_criteria JSONB DEFAULT '[]'::jsonb;

-- Create ussd_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS ussd_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  application_id UUID REFERENCES mspace_ussd_applications(id),
  phone_number TEXT NOT NULL,
  current_node_id TEXT NOT NULL,
  input_path TEXT[] DEFAULT '{}',
  navigation_path TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID NOT NULL
);

-- Enable RLS for ussd_sessions
ALTER TABLE ussd_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for ussd_sessions
CREATE POLICY "Users can view their own USSD sessions" 
ON ussd_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own USSD sessions" 
ON ussd_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own USSD sessions" 
ON ussd_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create records table if it doesn't exist  
CREATE TABLE IF NOT EXISTS records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES data_models(id),
  data JSONB NOT NULL DEFAULT '{}',
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for records
ALTER TABLE records ENABLE ROW LEVEL SECURITY;

-- Create policies for records
CREATE POLICY "Users can manage their own records" 
ON records 
FOR ALL 
USING (auth.uid() = user_id);