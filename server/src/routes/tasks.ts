import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

export const taskRouter = Router();

taskRouter.use(authenticateToken);

const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty'),
  description: z.string().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().nullable().optional(),
  isCompleted: z.boolean().optional(),
});

const reorderTaskSchema = z.object({
  prevOrder: z.number().nullable().optional(),
  nextOrder: z.number().nullable().optional(),
});

// GET /api/tasks - List all tasks for authenticated user sorted by fractional order
taskRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.user!.userId },
      orderBy: { order: 'asc' },
    });
    return res.status(200).json(tasks);
  } catch {
    return res.status(500).json({ error: 'Failed to retrieve tasks' });
  }
});

// POST /api/tasks - Create task appended at the end (+1000 order)
taskRouter.post('/', async (req: AuthRequest, res: Response) => {
  const result = createTaskSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }

  const { title, description } = result.data;

  try {
    const lastTask = await prisma.task.findFirst({
      where: { userId: req.user!.userId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const newOrder = lastTask ? lastTask.order + 1000 : 1000;

    const task = await prisma.task.create({
      data: {
        title,
        description,
        order: newOrder,
        userId: req.user!.userId,
      },
    });

    return res.status(201).json(task);
  } catch {
    return res.status(500).json({ error: 'Failed to create task' });
  }
});

// PATCH /api/tasks/:id - Update title, description, or completed status
taskRouter.patch('/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const result = updateTaskSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }

  try {
    const existing = await prisma.task.findFirst({
      where: { id, userId: req.user!.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: result.data,
    });

    return res.status(200).json(updatedTask);
  } catch {
    return res.status(500).json({ error: 'Failed to update task' });
  }
});

// PATCH /api/tasks/:id/reorder - O(1) midpoint fractional index calculation
taskRouter.patch('/:id/reorder', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const result = reorderTaskSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message });
  }

  const { prevOrder, nextOrder } = result.data;

  try {
    const existing = await prisma.task.findFirst({
      where: { id, userId: req.user!.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    let calculatedOrder: number;

    if (prevOrder == null && nextOrder != null) {
      calculatedOrder = nextOrder / 2;
    } else if (prevOrder != null && nextOrder == null) {
      calculatedOrder = prevOrder + 1000;
    } else if (prevOrder != null && nextOrder != null) {
      calculatedOrder = (prevOrder + nextOrder) / 2;
    } else {
      calculatedOrder = 1000;
    }

    const reorderedTask = await prisma.task.update({
      where: { id },
      data: { order: calculatedOrder },
    });

    return res.status(200).json(reorderedTask);
  } catch {
    return res.status(500).json({ error: 'Failed to reorder task' });
  }
});

// DELETE /api/tasks/:id - Delete a task
taskRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const existing = await prisma.task.findFirst({
      where: { id, userId: req.user!.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await prisma.task.delete({ where: { id } });
    return res.status(204).send();
  } catch {
    return res.status(500).json({ error: 'Failed to delete task' });
  }
});