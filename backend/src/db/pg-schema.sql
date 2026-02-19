CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  subscription_credits INTEGER DEFAULT 0,
  topup_credits INTEGER DEFAULT 0,
  auto_buy_enabled BOOLEAN DEFAULT FALSE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  billing_cycle_start TIMESTAMPTZ,
  billing_cycle_end TIMESTAMPTZ,
  total_credits_used_this_cycle INTEGER DEFAULT 0,
  total_credits_used_all_time INTEGER DEFAULT 0,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  credits_amount INTEGER NOT NULL,
  credit_source TEXT NOT NULL,
  model_used TEXT,
  model_id TEXT,
  preset_used TEXT,
  generation_id TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  balance_after INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS generations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  model_tier TEXT NOT NULL,
  model_id TEXT NOT NULL,
  prompt TEXT,
  input_type TEXT,
  input_url TEXT,
  output_url TEXT,
  status TEXT DEFAULT 'queued',
  credits_charged INTEGER NOT NULL,
  api_cost_usd REAL,
  generation_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON credit_transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_status ON generations(status);
