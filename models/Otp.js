const db = require('../config/database');
const bcrypt = require('bcryptjs');

class Otp {
  static tableEnsured = false;

  static async ensureTable() {
    if (this.tableEnsured) return;
    const createSql = `
      CREATE TABLE IF NOT EXISTS otps (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        purpose TEXT NOT NULL CHECK (purpose IN ('2fa','reset')),
        code_hash TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        consumed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_otps_user_purpose ON otps(user_id, purpose);
      CREATE INDEX IF NOT EXISTS idx_otps_expires_at ON otps(expires_at);
    `;
    await db.query(createSql);
    this.tableEnsured = true;
  }

  static generateNumericOtp(length = 6) {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += digits[Math.floor(Math.random() * 10)];
    }
    return code;
  }

  static async createOtpForUser(userId, purpose, ttlMinutes = 10) {
    await this.ensureTable();
    const code = this.generateNumericOtp(6);
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    const insert = `
      INSERT INTO otps (user_id, purpose, code_hash, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, purpose, expires_at, consumed, created_at
    `;
    const { rows } = await db.query(insert, [userId, purpose, codeHash, expiresAt]);
    return { ...rows[0], code };
  }

  static async getLatestActiveOtp(userId, purpose) {
    await this.ensureTable();
    const query = `
      SELECT * FROM otps
      WHERE user_id = $1 AND purpose = $2 AND consumed = FALSE AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const { rows } = await db.query(query, [userId, purpose]);
    return rows[0] || null;
  }

  static async verifyAndConsume(userId, purpose, code) {
    await this.ensureTable();
    const otpRow = await this.getLatestActiveOtp(userId, purpose);
    if (!otpRow) return { valid: false, reason: 'expired_or_missing' };
    const matches = await bcrypt.compare(code, otpRow.code_hash);
    if (!matches) return { valid: false, reason: 'invalid_code' };
    const update = 'UPDATE otps SET consumed = TRUE WHERE id = $1';
    await db.query(update, [otpRow.id]);
    return { valid: true };
  }
}

module.exports = Otp;


