import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { prisma } from '../src/db';

describe('Tasks Integration & Fractional Reorder Tests', () => {
  let authToken: string;
  let otherUserToken: string;

  beforeAll(async () => {
    await prisma.task.deleteMany();
    await prisma.user.deleteMany();

    // Register primary user
    const res1 = await request(app)
      .post('/api/auth/register')
      .send({ email: 'primary@example.com', password: 'password123' });
    authToken = res1.body.token;

    // Register second user for cross-tenant isolation testing
    const res2 = await request(app)
      .post('/api/auth/register')
      .send({ email: 'secondary@example.com', password: 'password123' });
    otherUserToken = res2.body.token;
  });

  afterAll(async () => {
    await prisma.task.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  let task1Id: string;
  let task2Id: string;
  let task3Id: string;

  it('POST /api/tasks - creates tasks with default incremental float order', async () => {
    const res1 = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Task 1' });
    expect(res1.status).toBe(201);
    expect(res1.body.order).toBe(1000);
    task1Id = res1.body.id;

    const res2 = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Task 2' });
    expect(res2.status).toBe(201);
    expect(res2.body.order).toBe(2000);
    task2Id = res2.body.id;

    const res3 = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Task 3' });
    expect(res3.status).toBe(201);
    expect(res3.body.order).toBe(3000);
    task3Id = res3.body.id;
  });

  it('GET /api/tasks - returns only the authenticated user tasks ordered by order asc', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0].order).toBe(1000);
    expect(res.body[1].order).toBe(2000);
    expect(res.body[2].order).toBe(3000);
  });

  it('GET /api/tasks - preserves data isolation for other users', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${otherUserToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('PATCH /api/tasks/:id/reorder - computes midpoint between two items (1000 and 2000 -> 1500)', async () => {
    // Reorder Task 3 between Task 1 (1000) and Task 2 (2000)
    const res = await request(app)
      .patch(`/api/tasks/${task3Id}/reorder`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ prevOrder: 1000, nextOrder: 2000 });

    expect(res.status).toBe(200);
    expect(res.body.order).toBe(1500);

    // Verify ordering query reflects new list order
    const listRes = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`);

    expect(listRes.body.map((t: { id: string }) => t.id)).toEqual([task1Id, task3Id, task2Id]);
  });

  it('PATCH /api/tasks/:id/reorder - reorders to top before first item (null and 1000 -> 500)', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${task2Id}/reorder`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ prevOrder: null, nextOrder: 1000 });

    expect(res.status).toBe(200);
    expect(res.body.order).toBe(500);
  });

  it('PATCH /api/tasks/:id - toggles completion status', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${task1Id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ isCompleted: true });

    expect(res.status).toBe(200);
    expect(res.body.isCompleted).toBe(true);
  });

  it('DELETE /api/tasks/:id - deletes task and denies unauthorized foreign deletion', async () => {
    // Other user attempts to delete Task 1
    const unauthRes = await request(app)
      .delete(`/api/tasks/${task1Id}`)
      .set('Authorization', `Bearer ${otherUserToken}`);
    expect(unauthRes.status).toBe(404);

    // Authorized deletion
    const delRes = await request(app)
      .delete(`/api/tasks/${task1Id}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(delRes.status).toBe(204);
  });
});
