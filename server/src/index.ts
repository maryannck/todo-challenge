import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { prisma } from './db';
import { authRouter } from './routes/auth';
import { taskRouter } from './routes/tasks';

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/tasks', taskRouter);

// Health check
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});

export default app;