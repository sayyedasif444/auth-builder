-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_super_user BOOLEAN DEFAULT FALSE,
    realm_id INTEGER REFERENCES realms(id) ON DELETE SET NULL,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_per_realm_client UNIQUE(realm_id, client_id, email)
);

-- Create tokens table for custom token management
CREATE TABLE IF NOT EXISTS tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    refresh_expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    is_active BOOLEAN DEFAULT TRUE,
    is_super_user BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_realm_id ON users(realm_id);
CREATE INDEX IF NOT EXISTS idx_users_client_id ON users(client_id);
CREATE INDEX IF NOT EXISTS idx_users_super_user ON users(is_super_user);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at);

-- Create indexes for tokens table
CREATE INDEX IF NOT EXISTS idx_tokens_access_token ON tokens(access_token);
CREATE INDEX IF NOT EXISTS idx_tokens_refresh_token ON tokens(refresh_token);
CREATE INDEX IF NOT EXISTS idx_tokens_user_id ON tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_tokens_expires_at ON tokens(expires_at);

-- Insert default admin user (password: Admin@123)
-- The password will be hashed by the application
INSERT INTO users (email, password, is_super_user, first_name, last_name) 
VALUES ('admin@admin.com', 'Admin@123', true, 'Admin', 'User')
ON CONFLICT (email) DO NOTHING;

-- Create realms table
CREATE TABLE IF NOT EXISTS realms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    realm_id INTEGER NOT NULL REFERENCES realms(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    client_id VARCHAR(255) UNIQUE NOT NULL,
    client_secret VARCHAR(255) NOT NULL,
    endpoints JSONB DEFAULT '{}',
    redirect_urls TEXT[] DEFAULT '{}',
    sso_enabled BOOLEAN DEFAULT false,
    twofa_enabled BOOLEAN DEFAULT false,
    smtp_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_client_per_realm UNIQUE(realm_id, name)
);

-- Create indexes for realms
CREATE INDEX IF NOT EXISTS idx_realms_name ON realms(name);
CREATE INDEX IF NOT EXISTS idx_realms_active ON realms(is_active);
CREATE INDEX IF NOT EXISTS idx_realms_created ON realms(created_at);

-- Create indexes for clients
CREATE INDEX IF NOT EXISTS idx_clients_realm_id ON clients(realm_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_client_id ON clients(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(is_active);
CREATE INDEX IF NOT EXISTS idx_clients_created ON clients(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_realms_updated_at 
    BEFORE UPDATE ON realms 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at 
    BEFORE UPDATE ON clients 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to cleanup expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    UPDATE tokens 
    SET is_active = false, revoked_at = CURRENT_TIMESTAMP 
    WHERE expires_at < CURRENT_TIMESTAMP AND is_active = true;
END;
$$ language 'plpgsql';
