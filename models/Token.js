const db = require('../config/database');
const crypto = require('crypto');

class Token {
  static async create(userId, isSuperUser = false) {
    try {
      // Generate custom access token (32 characters)
      const accessToken = crypto.randomBytes(16).toString('hex');
      
      // Generate refresh token (64 characters)
      const refreshToken = crypto.randomBytes(32).toString('hex');
      
      // Set expiry time (60 minutes for access token, 7 days for refresh token)
      const accessExpiryTime = 60; // minutes
      const refreshExpiryTime = 7 * 24 * 60; // 7 days in minutes
      
      const accessExpiresAt = new Date(Date.now() + accessExpiryTime * 60 * 1000);
      const refreshExpiresAt = new Date(Date.now() + refreshExpiryTime * 60 * 1000);
      
      const query = `
        INSERT INTO tokens (user_id, access_token, refresh_token, expires_at, refresh_expires_at, is_super_user) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING *
      `;
      
      const result = await db.query(query, [userId, accessToken, refreshToken, accessExpiresAt, refreshExpiresAt, isSuperUser]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async findByAccessToken(accessToken) {
    try {
      const query = `
        SELECT t.*, u.email, u.is_super_user 
        FROM tokens t 
        JOIN users u ON t.user_id = u.id 
        WHERE t.access_token = $1 AND t.is_active = true
      `;
      const result = await db.query(query, [accessToken]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async findByRefreshToken(refreshToken) {
    try {
      const query = `
        SELECT t.*, u.email, u.is_super_user 
        FROM tokens t 
        JOIN users u ON t.user_id = u.id 
        WHERE t.refresh_token = $1 AND t.is_active = true
      `;
      const result = await db.query(query, [refreshToken]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async refreshAccessToken(refreshToken) {
    try {
      const tokenData = await this.findByRefreshToken(refreshToken);
      if (!tokenData) {
        throw new Error('Invalid refresh token');
      }

      // Check if refresh token is expired (use refresh_expires_at if available, otherwise use expires_at + 7 days)
      let refreshExpiryDate;
      if (tokenData.refresh_expires_at) {
        refreshExpiryDate = new Date(tokenData.refresh_expires_at);
      } else {
        // Fallback: use expires_at + 7 days if refresh_expires_at is not set
        refreshExpiryDate = new Date(tokenData.expires_at);
        refreshExpiryDate.setDate(refreshExpiryDate.getDate() + 7);
      }
      
      if (new Date() > refreshExpiryDate) {
        throw new Error('Refresh token expired');
      }

      // Generate new access token
      const newAccessToken = crypto.randomBytes(16).toString('hex');
      
      // Set new expiry time (60 minutes)
      const expiryTime = 60; // minutes
      const expiresAt = new Date(Date.now() + expiryTime * 60 * 1000);
      
      // Update the token
      const updateQuery = `
        UPDATE tokens 
        SET access_token = $1, expires_at = $2, last_used_at = CURRENT_TIMESTAMP 
        WHERE refresh_token = $3 
        RETURNING *
      `;
      
      const result = await db.query(updateQuery, [newAccessToken, expiresAt, refreshToken]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async extendExpiry(accessToken) {
    try {
      const tokenData = await this.findByAccessToken(accessToken);
      if (!tokenData) {
        throw new Error('Invalid access token');
      }

      // Extend expiry time by resetting it
      const expiryTime = tokenData.is_super_user ? 60 : 60; // minutes
      const expiresAt = new Date(Date.now() + expiryTime * 60 * 1000);
      
      const updateQuery = `
        UPDATE tokens 
        SET expires_at = $1, last_used_at = CURRENT_TIMESTAMP 
        WHERE access_token = $2 
        RETURNING *
      `;
      
      const result = await db.query(updateQuery, [expiresAt, accessToken]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async revokeToken(accessToken) {
    try {
      const query = `
        UPDATE tokens 
        SET is_active = false, revoked_at = CURRENT_TIMESTAMP 
        WHERE access_token = $1 
        RETURNING *
      `;
      
      const result = await db.query(query, [accessToken]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async revokeAllUserTokens(userId) {
    try {
      const query = `
        UPDATE tokens 
        SET is_active = false, revoked_at = CURRENT_TIMESTAMP 
        WHERE user_id = $1 
        RETURNING *
      `;
      
      const result = await db.query(query, [userId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async cleanupExpiredTokens() {
    try {
      const query = `
        UPDATE tokens 
        SET is_active = false, revoked_at = CURRENT_TIMESTAMP 
        WHERE expires_at < CURRENT_TIMESTAMP AND is_active = true
      `;
      
      await db.query(query);
    } catch (error) {
      throw error;
    }
  }

  static async getActiveTokens(userId) {
    try {
      const query = `
        SELECT * FROM tokens 
        WHERE user_id = $1 AND is_active = true 
        ORDER BY created_at DESC
      `;
      
      const result = await db.query(query, [userId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Token;
