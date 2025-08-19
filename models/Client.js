const db = require('../config/database');
const crypto = require('crypto');

class Client {
  static async create(realmId, clientData) {
    const {
      name,
      description,
      endpoints,
      redirect_urls,
      sso_enabled,
      twofa_enabled,
      smtp_config
    } = clientData;

    // Generate unique client_id and client_secret
    const clientId = `client_${crypto.randomBytes(16).toString('hex')}`;
    const clientSecret = crypto.randomBytes(32).toString('hex');

    const query = `
      INSERT INTO clients (
        realm_id, name, description, client_id, client_secret,
        endpoints, redirect_urls, sso_enabled, twofa_enabled, smtp_config
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      realmId,
      name,
      description || null,
      clientId,
      clientSecret,
      JSON.stringify(endpoints || {}),
      redirect_urls || [],
      sso_enabled || false,
      twofa_enabled || false,
      JSON.stringify(smtp_config || {})
    ];

    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating client: ${error.message}`);
    }
  }

  static async findAll(realmId = null) {
    let query = `
      SELECT c.*, r.name as realm_name
      FROM clients c
      JOIN realms r ON c.realm_id = r.id
    `;
    
    let values = [];
    
    if (realmId) {
      query += ' WHERE c.realm_id = $1';
      values.push(realmId);
    }
    
    query += ' ORDER BY c.created_at DESC';

    try {
      const result = await db.query(query, values);
      return result.rows;
    } catch (error) {
      throw new Error(`Error fetching clients: ${error.message}`);
    }
  }

  static async findById(id) {
    const query = `
      SELECT c.*, r.name as realm_name
      FROM clients c
      JOIN realms r ON c.realm_id = r.id
      WHERE c.id = $1
    `;

    try {
      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error fetching client: ${error.message}`);
    }
  }

  static async findByClientId(clientId) {
    const query = `
      SELECT c.*, r.name as realm_name
      FROM clients c
      JOIN realms r ON c.realm_id = r.id
      WHERE c.client_id = $1
    `;

    try {
      const result = await db.query(query, [clientId]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error fetching client: ${error.message}`);
    }
  }

  static async update(id, updateData) {
    const {
      name,
      description,
      endpoints,
      redirect_urls,
      sso_enabled,
      twofa_enabled,
      smtp_config
    } = updateData;

    const query = `
      UPDATE clients 
      SET name = $1, description = $2, endpoints = $3, redirect_urls = $4,
          sso_enabled = $5, twofa_enabled = $6, smtp_config = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `;

    const values = [
      name,
      description || null,
      JSON.stringify(endpoints || {}),
      redirect_urls || [],
      sso_enabled || false,
      twofa_enabled || false,
      JSON.stringify(smtp_config || {}),
      id
    ];

    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error updating client: ${error.message}`);
    }
  }

  static async delete(id) {
    const query = 'DELETE FROM clients WHERE id = $1 RETURNING *';

    try {
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error deleting client: ${error.message}`);
    }
  }

  static async toggleStatus(id) {
    const query = `
      UPDATE clients 
      SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    try {
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error toggling client status: ${error.message}`);
    }
  }

  static async regenerateSecret(id) {
    const newSecret = crypto.randomBytes(32).toString('hex');
    
    const query = `
      UPDATE clients 
      SET client_secret = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    try {
      const result = await db.query(query, [newSecret, id]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error regenerating client secret: ${error.message}`);
    }
  }

  static async getStats(realmId = null) {
    let query = `
      SELECT 
        COUNT(*) as total_clients,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_clients,
        COUNT(CASE WHEN sso_enabled = true THEN 1 END) as sso_enabled_clients,
        COUNT(CASE WHEN twofa_enabled = true THEN 1 END) as twofa_enabled_clients
      FROM clients
    `;
    
    let values = [];
    
    if (realmId) {
      query += ' WHERE realm_id = $1';
      values.push(realmId);
    }

    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error fetching client stats: ${error.message}`);
    }
  }

  static async findByNameInRealm(realmId, name) {
    const query = 'SELECT * FROM clients WHERE realm_id = $1 AND name = $2';

    try {
      const result = await db.query(query, [realmId, name]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error checking client name: ${error.message}`);
    }
  }
}

module.exports = Client;
