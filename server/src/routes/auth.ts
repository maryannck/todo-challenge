import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'challenge_super_secret_key_change_in_production';

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

// POST /api/auth/register
authRouter.post('/register', async (req: Request, res: Response) => {
  const result = authSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }

  const { email, password } = result.data;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.status(201).json({ user, token });
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  const result = authSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }

  const { email, password } = result.data;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
});