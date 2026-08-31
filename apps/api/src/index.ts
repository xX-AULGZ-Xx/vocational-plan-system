import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

import authRouter from './modules/auth/auth.controller';
import projectRouter from './modules/projects/project.controller';
import approvalRouter from './modules/approvals/approval.controller';
import budgetRouter from './modules/budgets/budget.controller';
import divisionRouter from './modules/divisions/division.controller';
import strategicRouter from './modules/strategics/strategic.controller';
import documentRouter from './modules/documents/document.controller';
import adminRouter from './modules/admin/admin.controller';
import evaluationRouter from './modules/evaluation/evaluation.controller';
import notificationsRouter from './modules/notifications/notifications.controller';

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for document downloads and uploads
const storageDir = path.resolve(process.env.STORAGE_DIR || './storage');
app.use('/storage', express.static(storageDir));

// Root endpoint info
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'ระบบบริหารจัดการงานแผนงานและโครงการ (วก.เชียงราย) - Backend API',
    status: 'running',
    frontend_url: 'http://localhost:3005',
    api_docs: {
      health: '/health',
      auth: '/api/v1/auth',
      projects: '/api/v1/projects',
      approvals: '/api/v1/approvals',
      budgets: '/api/v1/budgets',
      divisions: '/api/v1/divisions',
      strategics: '/api/v1/strategics',
      evaluation: '/api/v1/projects/:id/evaluation'
    }
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/projects', projectRouter);
app.use('/api/v1/approvals', approvalRouter);
app.use('/api/v1/budgets', budgetRouter);
app.use('/api/v1/divisions', divisionRouter);
app.use('/api/v1/strategics', strategicRouter);
app.use('/api/v1/documents', documentRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1', evaluationRouter);

// Global 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  วก.เชียงราย - ระบบบริหารจัดการงานแผนงานและโครงการ API`);
  console.log(`  Server running on http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
