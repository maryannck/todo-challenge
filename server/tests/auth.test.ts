import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/db';

describe('Auth Integration Tests', () => {
  beforeAll(async () => {
    // Clean up test database
    await prisma.task.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.task.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  const testUser = {
    email: 'integration_auth@example.com',
    password: 'password123',
  };

  it('POST /api/auth/register - successfully creates a new user and returns JWT', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('POST /api/auth/register - fails on duplicate registration with 409', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('POST /api/auth/register - fails on short password (< 6 chars)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'shortpw@example.com', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/auth/login - authenticates successfully with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send(testUser);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe(testUser.email);
  });

  it('POST /api/auth/login - rejects incorrect password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });
});
