-- Test migration with new V2_description format
-- This demonstrates the new simpler naming convention

-- Add a simple comment table for testing
CREATE TABLE IF NOT EXISTS test_comments (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_test_comments_created_at ON test_comments(created_at);
