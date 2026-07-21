const { poolPromise, sql } = require('../config/db');

class Ticket {
  static async create({ title, description, priority, status = 'open', createdBy, departmentId, visibility = 'private' }) {
    console.log('TicketModel: Create start', { title, createdBy, departmentId, visibility });

    if (!departmentId) {
      throw new Error('El departamento es obligatorio');
    }

    try {
      const pool = await poolPromise;
      const result = await pool.request()
        .input('title', sql.VarChar, title)
        .input('description', sql.NVarChar, description)
        .input('priority', sql.VarChar, priority)
        .input('status', sql.VarChar, status)
        .input('created_by', sql.Int, createdBy)
        .input('department_id', sql.Int, departmentId)
        .input('visibility', sql.VarChar, visibility)
        .query(`
          INSERT INTO tickets.tickets
          (title, description, priority, status, created_by, department_id, visibility)
          OUTPUT Inserted.*
          VALUES (@title, @description, @priority, @status, @created_by, @department_id, @visibility)
        `);

      console.log('TicketModel: Create success', result.recordset[0]);
      return result.recordset[0];
    } catch (e) {
      console.error('TicketModel: Create error', e);
      throw e;
    }
  }

  static async find(filters = {}) {
    const {
      userId,
      userDepartmentId,
      adminUserId,
      priority,
      status,
      departmentId,
      startDate,
      endDate,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      search
    } = filters;

    console.log('TicketModel: Find start', filters);

    try {
      let queryText = `SELECT t.*,
                u.username as creator_username,
                u.full_name as creator_full_name,
                d.name as department_name
         FROM tickets.tickets t
         LEFT JOIN tickets.users u ON t.created_by = u.id
         LEFT JOIN tickets.departments d ON t.department_id = d.id`;

      const pool = await poolPromise;
      const request = pool.request();
      const conditions = [];

      // User filter (for regular users)
      if (userId) {
        if (filters.userDepartmentIdForVisibility) {
          conditions.push(`(t.created_by = @userId OR t.visibility = 'public' OR (t.visibility = 'department' AND t.department_id = @userDeptVis))`);
          request.input('userDeptVis', sql.Int, filters.userDepartmentIdForVisibility);
        } else {
          conditions.push(`(t.created_by = @userId OR t.visibility = 'public')`);
        }
        request.input('userId', sql.Int, userId);
      }

      // Department filter for admin isolation (non-super admins)
      if (userDepartmentId && adminUserId) {
        conditions.push(`(t.department_id = @userDepartmentId OR t.created_by = @adminUserId OR t.visibility = 'public')`);
        request.input('userDepartmentId', sql.Int, userDepartmentId);
        request.input('adminUserId', sql.Int, adminUserId);
      } else if (userDepartmentId) {
        conditions.push(`(t.department_id = @userDepartmentId OR t.visibility = 'public')`);
        request.input('userDepartmentId', sql.Int, userDepartmentId);
      }

      // Priority filter
      if (priority) {
        conditions.push(`t.priority = @priority`);
        request.input('priority', sql.VarChar, priority);
      }

      // Status filter
      if (status) {
        if (status === 'active') {
          conditions.push(`t.status != @statusClosed`);
          request.input('statusClosed', sql.VarChar, 'closed');
        } else {
          conditions.push(`t.status = @status`);
          request.input('status', sql.VarChar, status);
        }
      }

      // Department filter (from UI filters)
      if (departmentId) {
        conditions.push(`t.department_id = @departmentId`);
        request.input('departmentId', sql.Int, departmentId);
      }

      // Date range filter
      if (startDate) {
        conditions.push(`t.created_at >= @startDate`);
        request.input('startDate', sql.DateTime2, startDate);
      }
      if (endDate) {
        conditions.push(`t.created_at <= @endDate`);
        request.input('endDate', sql.DateTime2, endDate);
      }

      // Search
      if (search) {
        conditions.push(`(t.title LIKE @search OR t.description LIKE @search)`);
        request.input('search', sql.NVarChar, `%${search}%`);
      }

      if (conditions.length > 0) {
        queryText += ` WHERE ${conditions.join(' AND ')}`;
      }

      // Sorting
      const allowedSortColumns = ['id', 'title', 'priority', 'status', 'created_at', 'updated_at'];
      const sortColumn = allowedSortColumns.includes(sortBy) ? `t.${sortBy}` : 't.created_at';
      const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      queryText += ` ORDER BY ${sortColumn} ${order}`;

      console.log('TicketModel: Final SQL Query:', queryText);
      console.log('TicketModel: Query Params:', request.parameters);

      const result = await request.query(queryText);
      console.log('TicketModel: Find success', result.recordset.length);
      return result.recordset;
    } catch (e) {
      console.error('TicketModel: Find error', e);
      throw e;
    }
  }

  static async findById(id) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT t.*,
              u.username as creator_username,
              u.full_name as creator_full_name,
              d.name as department_name,
              t.department_id,
              au.username as assigned_username,
              au.full_name as assigned_full_name
        FROM tickets.tickets t
        LEFT JOIN tickets.users u ON t.created_by = u.id
        LEFT JOIN tickets.departments d ON t.department_id = d.id
        LEFT JOIN tickets.users au ON t.assigned_to = au.id
        WHERE t.id = @id
      `);
    return result.recordset[0];
  }

  static async update(id, updates) {
    const allowedColumns = ['priority', 'status', 'assigned_to', 'resolution_summary', 'resolution_actions', 'created_by', 'department_id', 'visibility'];
    const keys = Object.keys(updates).filter(key => allowedColumns.includes(key));

    if (keys.length === 0) return null;

    const pool = await poolPromise;
    const request = pool.request();
    request.input('id', sql.Int, id);

    const setClause = keys.map(key => {
      // Usar tipos explícitos para evitar problemas de inferencia con null/int
      if (key === 'assigned_to' || key === 'created_by' || key === 'department_id') {
        request.input(key, sql.Int, updates[key] || null);
      } else {
        request.input(key, updates[key]);
      }
      return `${key} = @${key}`;
    }).join(', ');

    const result = await request.query(`
       UPDATE tickets.tickets 
       SET ${setClause}, updated_at = SYSDATETIME() 
       OUTPUT Inserted.*
       WHERE id = @id
    `);
    return result.recordset[0];
  }

  static async delete(id) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM tickets.tickets OUTPUT Deleted.id WHERE id = @id');
    return result.recordset[0];
  }
}

module.exports = Ticket;
