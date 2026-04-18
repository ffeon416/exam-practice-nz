-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- School enquiries from the /schools contact form
CREATE TABLE IF NOT EXISTS school_enquiries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  school TEXT NOT NULL,
  role TEXT,
  students TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- General contact form messages from /contact
CREATE TABLE IF NOT EXISTS contact_messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  type TEXT DEFAULT 'general',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (service role key bypasses this)
ALTER TABLE school_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
