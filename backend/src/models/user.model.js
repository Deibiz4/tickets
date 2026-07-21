const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { poolPromise, sql } = require('../config/db');
const { NotFoundError, UnauthorizedError, ConflictError } = require('../middleware/errorHandler');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/constants');

class User {
  static async create({ username, email, password, fullName, departmentId, phone, role = 'user' }) {
    // Verificar si el usuario ya existe
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('El correo electrónico ya está registrado');
    }

    // Hashear la contraseña
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    try {
      const pool = await poolPromise;
      const result = await pool.request()
        .input('username', sql.VarChar, username)
        .input('email', sql.VarChar, email)
        .input('password_hash', sql.VarChar, hashedPassword)
        .input('full_name', sql.VarChar, fullName)
        .input('department_id', sql.Int, departmentId)
        .input('phone_number', sql.VarChar, phone)
        .input('role', sql.VarChar, role)
        .query(`
          INSERT INTO tickets.users
          (username, email, password_hash, full_name, department_id, phone_number, role)
          OUTPUT Inserted.id, Inserted.username, Inserted.email, Inserted.full_name, Inserted.department_id, Inserted.phone_number, Inserted.role, Inserted.created_at
          VALUES (@username, @email, @password_hash, @full_name, @department_id, @phone_number, @role)
        `);

      return result.recordset[0];
    } catch (err) {
      throw err;
    }
  }

  static async findByEmail(email) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .query(`
        SELECT u.*, d.name as department_name
        FROM tickets.users u
        LEFT JOIN tickets.departments d ON u.department_id = d.id
        WHERE u.email = @email
      `);
    return result.recordset[0] || null;
  }

  static async findById(id) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT u.id, u.username, u.email, u.full_name, u.department_id, d.name as department_name,
               u.phone_number, u.role, u.is_super_admin, u.created_at
        FROM tickets.users u
        LEFT JOIN tickets.departments d ON u.department_id = d.id
        WHERE u.id = @id
      `);
    return result.recordset[0] || null;
  }

  static async authenticate(email, password) {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    // Eliminar la contraseña del objeto de usuario
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static generateAuthToken(user) {
    const payload = {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  static async updateProfile(userId, { fullName, email, departmentId, phone, currentPassword, newPassword }) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    const pool = await poolPromise;
    const request = pool.request();
    request.input('id', sql.Int, userId);

    const updates = [];

    if (fullName) {
      updates.push('full_name = @full_name');
      request.input('full_name', sql.VarChar, fullName);
    }

    if (departmentId) {
      updates.push('department_id = @department_id');
      request.input('department_id', sql.Int, departmentId);
    }

    if (phone !== undefined) {
      updates.push('phone_number = @phone_number');
      request.input('phone_number', sql.VarChar, phone);
    }

    if (email && email !== user.email) {
      const existingUser = await this.findByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictError('El correo electrónico ya está en uso');
      }
      updates.push('email = @email');
      request.input('email', sql.VarChar, email);
    }

    if (currentPassword && newPassword) {
      const userWithPasswordResult = await pool.request()
        .input('id', sql.Int, userId)
        .query('SELECT password_hash FROM tickets.users WHERE id = @id');

      const userWithPassword = userWithPasswordResult.recordset[0];

      const isMatch = await bcrypt.compare(currentPassword, userWithPassword.password_hash);
      if (!isMatch) {
        throw new UnauthorizedError('Contraseña actual incorrecta');
      }

      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(newPassword, salt);

      updates.push('password_hash = @password_hash');
      request.input('password_hash', sql.VarChar, hashedPassword);
    }

    if (updates.length === 0) {
      return this.findById(userId);
    }

    const queryText = `
      UPDATE tickets.users
      SET ${updates.join(', ')}, updated_at = SYSDATETIME()
      OUTPUT Inserted.id, Inserted.username, Inserted.email, Inserted.full_name, Inserted.department_id, Inserted.phone_number, Inserted.role, Inserted.created_at
      WHERE id = @id
    `;

    const result = await request.query(queryText);
    return result.recordset[0];
  }

  static async getAllUsers() {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`
        SELECT u.id, u.username, u.email, u.full_name, u.department_id, d.name as department_name,
               u.phone_number, u.role, u.is_super_admin, u.created_at
        FROM tickets.users u
        LEFT JOIN tickets.departments d ON u.department_id = d.id
        ORDER BY u.created_at DESC
      `);
    return result.recordset;
  }

  static async updateUserRole(userId, role) {
    const validRoles = ['admin', 'agent', 'user'];
    if (!validRoles.includes(role)) {
      throw new Error('Rol no válido');
    }

    const pool = await poolPromise;
    const result = await pool.request()
      .input('role', sql.VarChar, role)
      .input('id', sql.Int, userId)
      .query(`
        UPDATE tickets.users
        SET role = @role, updated_at = SYSDATETIME()
        OUTPUT Inserted.id, Inserted.username, Inserted.email, Inserted.full_name, Inserted.department_id, Inserted.role, Inserted.created_at
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      throw new NotFoundError('Usuario no encontrado');
    }

    return result.recordset[0];
  }

  static async updateUser(userId, { username, email, fullName, departmentId, phone, role, password, is_super_admin }) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    const pool = await poolPromise;
    const request = pool.request();
    request.input('id', sql.Int, userId);

    const updates = [];

    if (username && username !== user.username) {
      const existingUserResult = await pool.request()
        .input('username', sql.VarChar, username)
        .query('SELECT id FROM tickets.users WHERE username = @username');

      if (existingUserResult.recordset.length > 0 && existingUserResult.recordset[0].id !== userId) {
        throw new ConflictError('El nombre de usuario ya está en uso');
      }
      updates.push('username = @username');
      request.input('username', sql.VarChar, username);
    }

    if (email && email !== user.email) {
      const existingUser = await this.findByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictError('El correo electrónico ya está en uso');
      }
      updates.push('email = @email');
      request.input('email', sql.VarChar, email);
    }

    if (fullName) {
      updates.push('full_name = @full_name');
      request.input('full_name', sql.VarChar, fullName);
    }

    if (departmentId) {
      updates.push('department_id = @department_id');
      request.input('department_id', sql.Int, departmentId);
    }

    if (phone !== undefined) {
      updates.push('phone_number = @phone_number');
      request.input('phone_number', sql.VarChar, phone);
    }

    if (role) {
      const validRoles = ['admin', 'agent', 'user'];
      if (!validRoles.includes(role)) {
        throw new Error('Rol no válido');
      }
      updates.push('role = @role');
      request.input('role', sql.VarChar, role);
    }

    if (is_super_admin !== undefined) {
      if (typeof is_super_admin !== 'boolean') {
        throw new Error('is_super_admin debe ser un booleano');
      }
      updates.push('is_super_admin = @is_super_admin');
      request.input('is_super_admin', sql.Bit, is_super_admin ? 1 : 0);
    }

    if (password) {
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(password, salt);
      updates.push('password_hash = @password_hash');
      request.input('password_hash', sql.VarChar, hashedPassword);
    }

    if (updates.length === 0) {
      return user;
    }

    const queryText = `
      UPDATE tickets.users
      SET ${updates.join(', ')}, updated_at = SYSDATETIME()
      OUTPUT Inserted.id, Inserted.username, Inserted.email, Inserted.full_name, Inserted.department_id, Inserted.phone_number, Inserted.role, Inserted.created_at
      WHERE id = @id
    `;

    const result = await request.query(queryText);
    return result.recordset[0];
  }

  static async getUsersByDepartment(departmentId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('department_id', sql.Int, departmentId)
      .query(`
        SELECT u.id, u.username, u.email, u.full_name, u.department_id, d.name as department_name,
               u.phone_number, u.role
        FROM tickets.users u
        LEFT JOIN tickets.departments d ON u.department_id = d.id
        WHERE u.department_id = @department_id
        AND (u.role = 'admin' OR u.role = 'agent')
        ORDER BY u.full_name ASC
      `);
    return result.recordset;
  }

  static async getAdminEmailsByDepartment(departmentId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('department_id', sql.Int, departmentId)
      .query(`
        SELECT email
        FROM tickets.users
        WHERE (role = 'admin' OR role = 'agent')
        AND (is_super_admin = 1 OR department_id = @department_id)
      `);
    return result.recordset.map(u => u.email);
  }

  static async getDepartmentEmails(departmentId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('department_id', sql.Int, departmentId)
      .query(`
        SELECT email
        FROM tickets.users
        WHERE is_super_admin = 1 OR department_id = @department_id
      `);
    return result.recordset.map(u => u.email);
  }

  static async getAllSystemEmails() {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`
        SELECT email
        FROM tickets.users
        WHERE email IS NOT NULL AND email != ''
      `);
    return result.recordset.map(u => u.email);
  }

  static async delete(id) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM tickets.users OUTPUT Deleted.id WHERE id = @id');
    return result.recordset[0];
  }

  static async setResetToken(email) {
    const crypto = require('crypto');
    const user = await this.findByEmail(email);
    if (!user) return null;

    const plainToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    const pool = await poolPromise;
    await pool.request()
      .input('token', sql.VarChar, tokenHash)
      .input('expires', sql.DateTime2, expires)
      .input('email', sql.VarChar, email)
      .query(`UPDATE tickets.users SET reset_token = @token, reset_token_expires = @expires WHERE email = @email`);

    return plainToken;
  }

  static async resetPasswordByToken(plainToken, newPassword) {
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');

    const pool = await poolPromise;
    const result = await pool.request()
      .input('token', sql.VarChar, tokenHash)
      .input('now', sql.DateTime2, new Date())
      .query(`SELECT id FROM tickets.users WHERE reset_token = @token AND reset_token_expires > @now`);

    if (result.recordset.length === 0) return false;

    const userId = result.recordset[0].id;
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(newPassword, salt);

    await pool.request()
      .input('password_hash', sql.VarChar, hashedPassword)
      .input('id', sql.Int, userId)
      .query(`UPDATE tickets.users SET password_hash = @password_hash, reset_token = NULL, reset_token_expires = NULL WHERE id = @id`);

    return true;
  }
}

module.exports = User;
