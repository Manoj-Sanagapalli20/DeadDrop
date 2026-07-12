-- DeadDrop Database Migration: Agent 03 (Freshness) & Agent 05 (Anti-Collusion)
-- Copy and paste this script directly into the Supabase SQL Query Editor.

-- 1. Add category and stale classification metadata to vaults
ALTER TABLE public.vaults ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'credentials';
ALTER TABLE public.vaults ADD COLUMN IF NOT EXISTS is_stale BOOLEAN DEFAULT FALSE;

-- 2. Create trustee access logs table for collusion checks
CREATE TABLE IF NOT EXISTS public.trustee_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vault_id UUID REFERENCES public.vaults(id) ON DELETE CASCADE,
    trustee_id UUID REFERENCES public.trustees(id) ON DELETE CASCADE,
    ip_address TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Trustee Access Logs
ALTER TABLE public.trustee_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view trustee access logs for their vaults" 
    ON public.trustee_access_logs FOR SELECT 
    USING (
        vault_id IN (
            SELECT id FROM public.vaults WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Public insert for trustee logs logging" 
    ON public.trustee_access_logs FOR INSERT 
    WITH CHECK (true);
