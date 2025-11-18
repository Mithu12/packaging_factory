import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JwtPayload, UserRole } from '@/types/auth';
import pool from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = 10;

export class AuthService {
  // Generate JWT token
  static generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  // Verify JWT token
  static verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Hash password
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  // Compare password
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Get user from token (for middleware)
  static async getUserFromToken(token: string) {
    const payload = this.verifyToken(token);
    
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1 AND is_active = true',
      [payload.user_id]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = result.rows[0];
    const { password_hash, ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword,
      payload
    };
  }
}
