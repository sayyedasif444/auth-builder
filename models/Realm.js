const db = require('../config/database');

class Realm {
    // Create a new realm
    static async create(name, description = null, isActive = true) {
        try {
            const query = `
                INSERT INTO realms (name, description, is_active, created_at, updated_at)
                VALUES ($1, $2, $3, NOW(), NOW())
                RETURNING *
            `;
            
            const values = [name, description, isActive];
            const result = await db.query(query, values);
            
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error creating realm: ${error.message}`);
        }
    }
    
    // Get all realms
    static async findAll() {
        try {
            const query = `
                SELECT * FROM realms 
                ORDER BY created_at DESC
            `;
            
            const result = await db.query(query);
            return result.rows;
        } catch (error) {
            throw new Error(`Error fetching realms: ${error.message}`);
        }
    }
    
    // Get realm by ID
    static async findById(id) {
        try {
            const query = `
                SELECT * FROM realms 
                WHERE id = $1
            `;
            
            const result = await db.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error fetching realm: ${error.message}`);
        }
    }
    
    // Get realm by name
    static async findByName(name) {
        try {
            const query = `
                SELECT * FROM realms 
                WHERE name = $1
            `;
            
            const result = await db.query(query, [name]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error fetching realm by name: ${error.message}`);
        }
    }
    
    // Update realm
    static async update(id, updates) {
        try {
            const allowedFields = ['name', 'description', 'is_active'];
            const setFields = [];
            const values = [];
            let paramCount = 1;
            
            // Build dynamic query based on provided updates
            for (const [field, value] of Object.entries(updates)) {
                if (allowedFields.includes(field)) {
                    setFields.push(`${field} = $${paramCount}`);
                    values.push(value);
                    paramCount++;
                }
            }
            
            if (setFields.length === 0) {
                throw new Error('No valid fields to update');
            }
            
            // Add updated_at and id to values
            setFields.push('updated_at = NOW()');
            values.push(id);
            
            const query = `
                UPDATE realms 
                SET ${setFields.join(', ')}
                WHERE id = $${paramCount}
                RETURNING *
            `;
            
            const result = await db.query(query, values);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error updating realm: ${error.message}`);
        }
    }
    
    // Delete realm
    static async delete(id) {
        try {
            // For now, allow deletion since clients/users tables don't exist yet
            // TODO: Add proper dependency checks when clients/users tables are created
            const query = `
                DELETE FROM realms 
                WHERE id = $1
                RETURNING *
            `;
            
            const result = await db.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error deleting realm: ${error.message}`);
        }
    }
    
    // Toggle realm status
    static async toggleStatus(id) {
        try {
            const query = `
                UPDATE realms 
                SET is_active = NOT is_active, updated_at = NOW()
                WHERE id = $1
                RETURNING *
            `;
            
            const result = await db.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            throw new Error(`Error toggling realm status: ${error.message}`);
        }
    }
    
    // Get realm statistics
    static async getStats(realmId) {
        try {
            const query = `
                SELECT 
                    r.id,
                    r.name,
                    COUNT(c.id) as client_count,
                    0 as user_count,
                    0 as role_count
                FROM realms r
                LEFT JOIN clients c ON r.id = c.realm_id AND c.is_active = true
                WHERE r.id = $1
                GROUP BY r.id, r.name
            `;
            
            const result = await db.query(query, [realmId]);
            return result.rows[0] || null;
        } catch (error) {
            throw new Error(`Error fetching realm stats: ${error.message}`);
        }
    }
    
    // Get all realms with statistics
    static async findAllWithStats() {
        try {
            const query = `
                SELECT 
                    r.*,
                    COUNT(c.id) as client_count,
                    0 as user_count,
                    0 as role_count
                FROM realms r
                LEFT JOIN clients c ON r.id = c.realm_id AND c.is_active = true
                GROUP BY r.id, r.name, r.description, r.is_active, r.created_at, r.updated_at
                ORDER BY r.created_at DESC
            `;
            
            const result = await db.query(query);
            return result.rows;
        } catch (error) {
            throw new Error(`Error fetching realms with stats: ${error.message}`);
        }
    }
}

module.exports = Realm;
