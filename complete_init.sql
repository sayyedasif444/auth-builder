-- =====================================================
-- Auth Builder Complete Database Initialization Script
-- =====================================================
-- This script creates all tables, indexes, functions, and initial data
-- for the auth-builder application in the correct order.

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. CREATE REALMS TABLE (Base table for multi-tenancy)
-- =====================================================
CREATE TABLE IF NOT EXISTS realms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. CREATE CLIENTS TABLE (Depends on realms)
-- =====================================================
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

-- =====================================================
-- 3. CREATE USERS TABLE (Depends on realms and clients)
-- =====================================================
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

-- =====================================================
-- 4. CREATE ROLES TABLE (Depends on realms)
-- =====================================================
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    access JSONB DEFAULT '[]',
    realm_id INTEGER REFERENCES realms(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_role_per_realm UNIQUE(realm_id, name)
);

-- =====================================================
-- 5. CREATE USER_ROLES TABLE (Junction table)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_role UNIQUE(user_id, role_id)
);

-- =====================================================
-- 6. CREATE TOKENS TABLE (Depends on users, clients, realms)
-- =====================================================
CREATE TABLE IF NOT EXISTS tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    access_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    refresh_expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    is_active BOOLEAN DEFAULT TRUE,
    is_super_user BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,
    -- Client session columns (from migration)
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    realm_id INTEGER REFERENCES realms(id) ON DELETE CASCADE,
    is_client_session BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    -- Constraint to ensure either user_id or client_id is present
    CONSTRAINT check_user_or_client 
    CHECK (
        (user_id IS NOT NULL AND client_id IS NULL AND realm_id IS NULL) OR 
        (user_id IS NULL AND client_id IS NOT NULL AND realm_id IS NOT NULL)
    )
);

-- =====================================================
-- 7. CREATE OTPS TABLE (Depends on users)
-- =====================================================
CREATE TABLE IF NOT EXISTS otps (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL CHECK (purpose IN ('2fa','reset')),
    code_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    consumed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 8. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Realms indexes
CREATE INDEX IF NOT EXISTS idx_realms_name ON realms(name);
CREATE INDEX IF NOT EXISTS idx_realms_active ON realms(is_active);
CREATE INDEX IF NOT EXISTS idx_realms_created ON realms(created_at);

-- Clients indexes
CREATE INDEX IF NOT EXISTS idx_clients_realm_id ON clients(realm_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_client_id ON clients(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(is_active);
CREATE INDEX IF NOT EXISTS idx_clients_created ON clients(created_at);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_realm_id ON users(realm_id);
CREATE INDEX IF NOT EXISTS idx_users_client_id ON users(client_id);
CREATE INDEX IF NOT EXISTS idx_users_super_user ON users(is_super_user);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at);

-- Roles indexes
CREATE INDEX IF NOT EXISTS idx_roles_realm_id ON roles(realm_id);
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_active ON roles(is_active);
CREATE INDEX IF NOT EXISTS idx_roles_created ON roles(created_at);

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- Tokens indexes
CREATE INDEX IF NOT EXISTS idx_tokens_access_token ON tokens(access_token);
CREATE INDEX IF NOT EXISTS idx_tokens_refresh_token ON tokens(refresh_token);
CREATE INDEX IF NOT EXISTS idx_tokens_user_id ON tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_tokens_expires_at ON tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_tokens_client_id ON tokens(client_id);
CREATE INDEX IF NOT EXISTS idx_tokens_realm_id ON tokens(realm_id);
CREATE INDEX IF NOT EXISTS idx_tokens_is_client_session ON tokens(is_client_session);

-- OTPs indexes
CREATE INDEX IF NOT EXISTS idx_otps_user_purpose ON otps(user_id, purpose);
CREATE INDEX IF NOT EXISTS idx_otps_expires_at ON otps(expires_at);

-- =====================================================
-- 9. CREATE FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
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

CREATE TRIGGER update_roles_updated_at 
    BEFORE UPDATE ON roles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to cleanup expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    UPDATE tokens 
    SET is_active = false, revoked_at = CURRENT_TIMESTAMP 
    WHERE expires_at < CURRENT_TIMESTAMP AND is_active = true;
END;
$$ language 'plpgsql';

-- =====================================================
-- 10. INSERT DEFAULT DATA
-- =====================================================

-- Insert default admin user with properly hashed password
-- Password: Admin@123 (hashed with bcrypt, salt rounds: 10)
-- This hash is for the password "Admin@123"
INSERT INTO users (email, password, is_super_user, first_name, last_name) 
VALUES (
    'admin@admin.com', 
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
    true, 
    'Admin', 
    'User'
)
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- 11. GRANT PERMISSIONS (if needed)
-- =====================================================
-- Uncomment and modify as needed for your setup
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO auth_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO auth_user;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'Auth Builder database initialization completed successfully!';
    RAISE NOTICE 'Default admin user created: admin@admin.com';
    RAISE NOTICE 'Default password: Admin@123';
    RAISE NOTICE 'All tables, indexes, functions, and triggers created.';
END $$;
