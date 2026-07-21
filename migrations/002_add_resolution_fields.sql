ALTER TABLE tickets.tickets
ADD COLUMN IF NOT EXISTS resolution_summary TEXT,
ADD COLUMN IF NOT EXISTS resolution_actions TEXT;
