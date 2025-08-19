const db = require('../config/database');

class Role {
  static async create(roleData) {
    const { name, description, access, realm_id } = roleData;
    
    // Debug logging
    console.log('Role.create - Input data:', {
      name,
      description,
      realm_id,
      access,
      access_type: typeof access,
      access_stringified: JSON.stringify(access)
    });
    
    // Ensure access is properly formatted as JSON
    let formattedAccess = access;
    if (typeof access === 'string') {
      try {
        formattedAccess = JSON.parse(access);
      } catch (parseError) {
        console.error('Error parsing access string:', parseError);
        throw new Error('Invalid access data format');
      }
    }
    
    // Validate that formattedAccess is an object
    if (typeof formattedAccess !== 'object' || !Array.isArray(formattedAccess)) {
      throw new Error('Access must be an array');
    }
    
    const query = `
      INSERT INTO roles (name, description, access, realm_id)
      VALUES ($1, $2, $3::jsonb, $4)
      RETURNING id, name, description, access, realm_id, is_active, created_at, updated_at
    `;
    
    const values = [name, description, JSON.stringify(formattedAccess), realm_id];
    
    // Debug logging for values array
    console.log('Role.create - Values array:', values);
    console.log('Role.create - Access value type:', typeof values[2]);
    console.log('Role.create - Access value stringified:', values[2]);
    
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT r.*, realm.name as realm_name 
      FROM roles r
      LEFT JOIN realms realm ON r.realm_id = realm.id
      WHERE 1=1
    `;
    const values = [];
    let valueIndex = 1;

    if (filters.name) {
      query += ` AND r.name ILIKE $${valueIndex}`;
      values.push(`%${filters.name}%`);
      valueIndex++;
    }

    if (filters.realm_id) {
      query += ` AND r.realm_id = $${valueIndex}`;
      values.push(filters.realm_id);
      valueIndex++;
    }

    if (filters.is_active !== undefined) {
      query += ` AND r.is_active = $${valueIndex}`;
      values.push(filters.is_active);
      valueIndex++;
    }

    query += ' ORDER BY r.created_at DESC';
    
    const result = await db.query(query, values);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT r.*, realm.name as realm_name 
      FROM roles r
      LEFT JOIN realms realm ON r.realm_id = realm.id
      WHERE r.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findByName(name, realm_id) {
    const query = 'SELECT * FROM roles WHERE name = $1 AND realm_id = $2';
    const result = await db.query(query, [name, realm_id]);
    return result.rows[0];
  }

  static async update(id, updateData) {
    const allowedFields = ['name', 'description', 'access'];
    const updates = [];
    const values = [];
    let valueIndex = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        if (key === 'access') {
          updates.push(`${key} = $${valueIndex}::jsonb`);
          values.push(JSON.stringify(value));
        } else {
          updates.push(`${key} = $${valueIndex}`);
          values.push(value);
        }
        valueIndex++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(id);
    const query = `
      UPDATE roles 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${valueIndex}
      RETURNING id, name, description, access, realm_id, is_active, created_at, updated_at
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM roles WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async toggleStatus(id) {
    const query = `
      UPDATE roles 
      SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name, description, access, realm_id, is_active, created_at, updated_at
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async getStats(filters = {}) {
    let query = `
      SELECT 
        COUNT(*) as total_roles,
        COUNT(CASE WHEN r.is_active = true THEN 1 END) as active_roles,
        COUNT(CASE WHEN r.is_active = false THEN 1 END) as inactive_roles
      FROM roles r
      WHERE 1=1
    `;
    const values = [];
    let valueIndex = 1;

    if (filters.name) {
      query += ` AND r.name ILIKE $${valueIndex}`;
      values.push(`%${filters.name}%`);
      valueIndex++;
    }

    if (filters.realm_id) {
      query += ` AND r.realm_id = $${valueIndex}`;
      values.push(filters.realm_id);
      valueIndex++;
    }

    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async findAllWithStats(filters = {}) {
    const roles = await this.findAll(filters);
    const stats = await this.getStats(filters);
    
    return {
      roles,
      stats
    };
  }

  // User-Role association methods
  static async assignRoleToUser(userId, roleId) {
    const query = `
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, role_id) DO NOTHING
      RETURNING *
    `;
    
    const result = await db.query(query, [userId, roleId]);
    return result.rows[0];
  }

  static async removeRoleFromUser(userId, roleId) {
    const query = 'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2 RETURNING *';
    const result = await db.query(query, [userId, roleId]);
    return result.rows[0];
  }

  static async getUserRoles(userId) {
    const query = `
      SELECT r.*, realm.name as realm_name
      FROM roles r
      LEFT JOIN realms realm ON r.realm_id = realm.id
      INNER JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1 AND r.is_active = true
      ORDER BY r.name
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  static async getUserRolesWithAccess(userId) {
    const query = `
      SELECT r.*
      FROM roles r
      INNER JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1 AND r.is_active = true
      ORDER BY r.name
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  static async getRoleUsers(roleId) {
    const query = `
      SELECT u.*
      FROM users u
      INNER JOIN user_roles ur ON u.id = ur.user_id
      WHERE ur.role_id = $1
      ORDER BY u.email
    `;
    
    const result = await db.query(query, [roleId]);
    return result.rows;
  }

  // Helper method to validate access structure
  static validateAccess(access) {
    if (!Array.isArray(access)) {
      throw new Error('Access must be an array');
    }

    for (const module of access) {
      if (!module.module || !module.rights || !Array.isArray(module.uri)) {
        throw new Error('Each access module must have module, rights, and uri array');
      }

      if (!['READ', 'WRITE', 'ALL'].includes(module.rights)) {
        throw new Error('Rights must be READ, WRITE, or ALL');
      }

      for (const uri of module.uri) {
        if (!uri.url || !Array.isArray(uri.methods)) {
          throw new Error('Each URI must have url and methods array');
        }

        for (const method of uri.methods) {
          if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
            throw new Error('HTTP method must be GET, POST, PUT, DELETE, or PATCH');
          }
        }
      }
    }

    return true;
  }
}

module.exports = Role;
