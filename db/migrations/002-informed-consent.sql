CREATE TABLE IF NOT EXISTS public.consent_records (
 session_id TEXT PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
 version TEXT NOT NULL,
 statement TEXT NOT NULL,
 signature TEXT NOT NULL,
 signer_role TEXT NOT NULL CHECK (signer_role IN ('participant','guardian')),
 participant_agreed BOOLEAN NOT NULL CHECK (participant_agreed),
 signed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 expires_at TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 year')
);
CREATE INDEX IF NOT EXISTS consent_records_expiry_idx ON public.consent_records(expires_at);
