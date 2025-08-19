const db = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class User {
  static generatePassword(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  static async create(userData) {
    const { email, password, first_name, last_name, is_super_user, realm_id, client_id } = userData;
    
    let finalPassword = password;
    let isPasswordGenerated = false;
    
    // For non-super users, generate password if not provided
    if (!is_super_user && !password) {
      finalPassword = this.generatePassword();
      isPasswordGenerated = true;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(finalPassword, 10);
    
    const query = `
      INSERT INTO users (email, password, first_name, last_name, is_super_user, realm_id, client_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, first_name, last_name, is_super_user, realm_id, client_id, is_active, created_at, updated_at
    `;
    
    const values = [email, hashedPassword, first_name, last_name, is_super_user, realm_id, client_id];
    const result = await db.query(query, values);
    
    // Return user data with generated password if applicable
    const user = result.rows[0];
    if (isPasswordGenerated) {
      user.generatedPassword = finalPassword;
    }
    
    return user;
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT 
        u.*,
        realm.name as realm_name,
        client.name as client_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', r.id,
              'name', r.name,
              'description', r.description
            )
          ) FILTER (WHERE r.id IS NOT NULL),
          '[]'::json
        ) as roles
      FROM users u
      LEFT JOIN realms realm ON u.realm_id = realm.id
      LEFT JOIN clients client ON u.client_id = client.id
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1
      GROUP BY u.id, realm.name, client.name
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT 
        u.*,
        realm.name as realm_name,
        client.name as client_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', r.id,
              'name', r.name,
              'description', r.description
            )
          ) FILTER (WHERE r.id IS NOT NULL),
          '[]'::json
        ) as roles
      FROM users u
      LEFT JOIN realms realm ON u.realm_id = realm.id
      LEFT JOIN clients client ON u.client_id = client.id
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE 1=1
    `;
    const values = [];
    let valueIndex = 1;

    if (filters.realm_id) {
      query += ` AND u.realm_id = $${valueIndex}`;
      values.push(filters.realm_id);
      valueIndex++;
    }

    if (filters.client_id) {
      query += ` AND u.client_id = $${valueIndex}`;
      values.push(filters.client_id);
      valueIndex++;
    }

    if (filters.is_super_user !== undefined) {
      query += ` AND u.is_super_user = $${valueIndex}`;
      values.push(filters.is_super_user);
      valueIndex++;
    }

    if (filters.is_active !== undefined) {
      query += ` AND u.is_active = $${valueIndex}`;
      values.push(filters.is_active);
      valueIndex++;
    }

    if (filters.search) {
      query += ` AND (u.email ILIKE $${valueIndex} OR u.first_name ILIKE $${valueIndex} OR u.last_name ILIKE $${valueIndex})`;
      values.push(`%${filters.search}%`);
      valueIndex++;
    }

    query += ' GROUP BY u.id, realm.name, client.name ORDER BY u.created_at DESC';
    
    const result = await db.query(query, values);
    return result.rows;
  }

  static async update(id, updateData) {
    const allowedFields = ['first_name', 'last_name', 'is_super_user', 'realm_id', 'client_id', 'is_active'];
    const updates = [];
    const values = [];
    let valueIndex = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = $${valueIndex}`);
        values.push(value);
        valueIndex++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(id);
    const query = `
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${valueIndex}
      RETURNING id, email, first_name, last_name, is_super_user, realm_id, client_id, is_active, created_at, updated_at
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const query = `
      UPDATE users 
      SET password = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, email, first_name, last_name, is_super_user, realm_id, client_id, is_active, created_at, updated_at
    `;
    
    const result = await db.query(query, [hashedPassword, id]);
    return result.rows[0];
  }

  static async delete(id) {
    // Prevent deletion of admin user
    const user = await this.findById(id);
    if (user && user.email === 'admin@admin.com') {
      throw new Error('Cannot delete admin user');
    }

    const query = 'DELETE FROM users WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async toggleStatus(id) {
    // Prevent deactivating admin user
    const user = await this.findById(id);
    if (user && user.email === 'admin@admin.com') {
      throw new Error('Cannot deactivate admin user');
    }

    const query = `
      UPDATE users 
      SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, first_name, last_name, is_super_user, realm_id, client_id, is_active, created_at, updated_at
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  static async getStats(filters = {}) {
    let query = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_super_user = true THEN 1 END) as super_users,
        COUNT(CASE WHEN is_super_user = false THEN 1 END) as realm_users,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_users
      FROM users
      WHERE 1=1
    `;
    const values = [];
    let valueIndex = 1;

    if (filters.realm_id) {
      query += ` AND realm_id = $${valueIndex}`;
      values.push(filters.realm_id);
      valueIndex++;
    }

    if (filters.client_id) {
      query += ` AND client_id = $${valueIndex}`;
      values.push(filters.client_id);
      valueIndex++;
    }

    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async findByNameInRealm(realmId, firstName, lastName) {
    const query = `
      SELECT * FROM users 
      WHERE realm_id = $1 AND first_name = $2 AND last_name = $3
    `;
    const result = await db.query(query, [realmId, firstName, lastName]);
    return result.rows[0];
  }

  static async findByEmailInRealm(realmId, email) {
    const query = `
      SELECT * FROM users 
      WHERE realm_id = $1 AND email = $2
    `;
    const result = await db.query(query, [realmId, email]);
    return result.rows[0];
  }
}

module.exports = User;
