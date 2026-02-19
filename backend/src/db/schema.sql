CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  subscription_credits INTEGER DEFAULT 0,
  topup_credits INTEGER DEFAULT 0,
  auto_buy_enabled INTEGER DEFAULT 0,
  billing_cycle_start TEXT,
  billing_cycle_end TEXT,
  total_credits_used_this_cycle INTEGER DEFAULT 0,
  total_credits_used_all_time INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  credits_amount INTEGER NOT NULL,
  credit_source TEXT NOT NULL,
  model_used TEXT,
  model_id TEXT,
  preset_used TEXT,
  generation_id TEXT,
  timestamp TEXT DEFAULT (datetime('now')),
  balance_after INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS generations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
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
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON credit_transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_status ON generations(status);
