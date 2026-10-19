import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'challenge_super_secret_key_change_in_production';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token missing' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
    };
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};