const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { NotFoundError, UnauthorizedError, ConflictError } = require('../middleware/errorHandler');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

class User {
  static async create({ username, email, password, fullName, department, phone, role = 'user' }) {
    // Verificar si el usuario ya existe
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('El correo electrónico ya está registrado');
    }

    // Hashear la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insertar nuevo usuario
    const result = await query(
      `INSERT INTO tickets.users 
       (username, email, password_hash, full_name, department, phone_number, role) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, username, email, full_name, department, phone_number, role, created_at`,
      [username, email, hashedPassword, fullName, department, phone, role]
    );

    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await query(
      'SELECT * FROM tickets.users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  static async findById(id) {
    const result = await query(
      'SELECT id, username, email, full_name, department, phone_number, role, created_at FROM tickets.users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async authenticate(email, password) {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
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
        role: user.role
      }
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  static async updateProfile(userId, { fullName, email, department, phone, currentPassword, newPassword }) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (fullName) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(fullName);
    }

    if (department) {
      updates.push(`department = $${paramIndex++}`);
      values.push(department);
    }

    if (phone !== undefined) {
      updates.push(`phone_number = $${paramIndex++}`);
      values.push(phone);
    }

    if (email && email !== user.email) {
      // Verificar si el nuevo correo ya existe
      const existingUser = await this.findByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictError('El correo electrónico ya está en uso');
      }
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }

    if (currentPassword && newPassword) {
      // Verificar la contraseña actual
      const userWithPassword = await query(
        'SELECT password_hash FROM tickets.users WHERE id = $1',
        [userId]
      );

      const isMatch = await bcrypt.compare(currentPassword, userWithPassword.rows[0].password_hash);
      if (!isMatch) {
        throw new UnauthorizedError('Contraseña actual incorrecta');
      }

      // Hashear la nueva contraseña
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      updates.push(`password_hash = $${paramIndex++}`);
      values.push(hashedPassword);
    }

    if (updates.length === 0) {
      return this.findById(userId);
    }

    const queryText = `
      UPDATE tickets.users 
      SET ${updates.join(', ')}, updated_at = NOW() 
      WHERE id = $${paramIndex} 
      RETURNING id, username, email, full_name, department, phone_number, role, created_at
    `;

    values.push(userId);
    const result = await query(queryText, values);
    return result.rows[0];
  }

  static async getAllUsers() {
    const result = await query(
      'SELECT id, username, email, full_name, department, phone_number, role, created_at FROM tickets.users ORDER BY created_at DESC'
    );
    return result.rows;
  }

  static async updateUserRole(userId, role) {
    const validRoles = ['admin', 'agent', 'user'];
    if (!validRoles.includes(role)) {
      throw new Error('Rol no válido');
    }

    const result = await query(
      `UPDATE tickets.users 
       SET role = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING id, username, email, full_name, role, created_at`,
      [role, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Usuario no encontrado');
    }

    return result.rows[0];
  }

  static async updateUser(userId, { username, email, fullName, department, phone, role, password }) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (username && username !== user.username) {
      const existingUser = await query('SELECT id FROM tickets.users WHERE username = $1', [username]);
      if (existingUser.rows.length > 0 && existingUser.rows[0].id !== userId) {
        throw new ConflictError('El nombre de usuario ya está en uso');
      }
      updates.push(`username = $${paramIndex++}`);
      values.push(username);
    }

    if (email && email !== user.email) {
      const existingUser = await this.findByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictError('El correo electrónico ya está en uso');
      }
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }

    if (fullName) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(fullName);
    }

    if (department) {
      updates.push(`department = $${paramIndex++}`);
      values.push(department);
    }

    if (phone !== undefined) {
      updates.push(`phone_number = $${paramIndex++}`);
      values.push(phone);
    }

    if (role) {
      const validRoles = ['admin', 'agent', 'user'];
      if (!validRoles.includes(role)) {
        throw new Error('Rol no válido');
      }
      updates.push(`role = $${paramIndex++}`);
      values.push(role);
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(hashedPassword);
    }

    if (updates.length === 0) {
      return user;
    }

    const queryText = `
      UPDATE tickets.users 
      SET ${updates.join(', ')}, updated_at = NOW() 
      WHERE id = $${paramIndex} 
      RETURNING id, username, email, full_name, department, phone_number, role, created_at
    `;

    values.push(userId);
    const result = await query(queryText, values);
    return result.rows[0];
  }
  static async delete(id) {
    const result = await query('DELETE FROM tickets.users WHERE id = $1 RETURNING id', [id]);
    return result.rows[0];
  }
}

module.exports = User;
