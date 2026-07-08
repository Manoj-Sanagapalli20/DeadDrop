-- DeadDrop Master PostgreSQL Database Schema File
-- Copy and paste this script directly into the Supabase SQL Query Editor to build all tables.

-- Enable UUID extension if not present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Vaults Table (Each vault belongs to an authenticated user)
CREATE TABLE IF NOT EXISTS public.vaults (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    encrypted_file_path TEXT, -- S3 URL/Path
    iv TEXT, -- Hex representation of the 12-byte encryption IV
    timer_days INTEGER DEFAULT 30,
    safety_score INTEGER DEFAULT 30,
    instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_checkin_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    grace_period_ends_at TIMESTAMP WITH TIME ZONE -- Calculated when check-in window is missed
);

-- Enable Row Level Security (RLS) on Vaults
ALTER TABLE public.vaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own vaults" 
    ON public.vaults FOR INSERT 
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can view their own vaults" 
    ON public.vaults FOR SELECT 
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can update their own vaults" 
    ON public.vaults FOR UPDATE 
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own vaults" 
    ON public.vaults FOR DELETE 
    USING (auth.uid() = owner_id);


-- 2. Trustees Table (Stores details and keys shards for each trustee)
CREATE TABLE IF NOT EXISTS public.trustees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vault_id UUID REFERENCES public.vaults(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    shard TEXT NOT NULL, -- Hex representation of the Shamir key share
    shard_index INTEGER NOT NULL, -- 1, 2, or 3
    status TEXT DEFAULT 'Online' NOT NULL, -- Online | Unresponsive | Triggered
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Trustees
ALTER TABLE public.trustees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage trustees for their vaults" 
    ON public.trustees FOR ALL 
    USING (
        vault_id IN (
            SELECT id FROM public.vaults WHERE owner_id = auth.uid()
        )
    );

-- Allow public access for trustee decrypt operations using single-use keys
CREATE POLICY "Public select for trustee verification" 
    ON public.trustees FOR SELECT 
    USING (true);


-- 3. Check-In Logs Table (Tracks historical keystroke telemetry)
CREATE TABLE IF NOT EXISTS public.checkin_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vault_id UUID REFERENCES public.vaults(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    input_text TEXT,
    typing_velocity INTEGER, -- Characters per minute (CPM)
    cognitive_drift NUMERIC(4,3), -- 0.000 to 1.000 baseline deviation
    sentiment_score NUMERIC(4,3), -- 0.000 to 1.000 safety sentiment score
    status TEXT DEFAULT 'Nominal' NOT NULL -- Nominal | Suspicious | Failed
);

-- Enable RLS on Check-In Logs
ALTER TABLE public.checkin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage check-in logs for their vaults" 
    ON public.checkin_logs FOR ALL 
    USING (
        vault_id IN (
            SELECT id FROM public.vaults WHERE owner_id = auth.uid()
        )
    );


-- 4. Escalation Logs Table (Tracks notifications sent by AG-08)
CREATE TABLE IF NOT EXISTS public.escalation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vault_id UUID REFERENCES public.vaults(id) ON DELETE CASCADE,
    tier INTEGER NOT NULL, -- 1 (Email), 2 (SMS), 3 (WhatsApp/Call)
    channel TEXT NOT NULL, -- Email | SMS | WhatsApp | Voice
    recipient TEXT NOT NULL,
    dispatched_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'Dispatched' NOT NULL -- Dispatched | Delivered | Bounced | Cancelled
);

-- Enable RLS on Escalation Logs
ALTER TABLE public.escalation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view escalation logs for their vaults" 
    ON public.escalation_logs FOR SELECT 
    USING (
        vault_id IN (
            SELECT id FROM public.vaults WHERE owner_id = auth.uid()
        )
    );
