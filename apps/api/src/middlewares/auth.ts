import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface AuthUser {
  id: string;
  username: string;
  role: Role;
  full_name: string;
  department_id?: number | null;
  division_id?: number | null;
  division_code?: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบ (Unauthorized)' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'เซสชันหมดอายุหรือ Token ไม่ถูกต้อง' });
  }
}

export function authorize(roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });
    }
    if (!roles.includes(req.user.role) && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์ในการดำเนินการนี้ (Forbidden)' });
    }
    next();
  };
}
