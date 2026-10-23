import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { apiRateLimiter } from './middleware/rateLimiter';

// Route imports
import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import bookRoutes from './routes/book.routes';
import ebookRoutes from './routes/ebook.routes';
import userRoutes from './routes/user.routes';
import issueRoutes from './routes/issue.routes';
import seatRoutes from './routes/seat.routes';
import settingsRoutes from './routes/settings.routes';
import reportRoutes from './routes/report.routes';
import activityRoutes from './routes/activity.routes';
import setupRoutes from './routes/setup.routes';
import patronRoutes from './routes/patron.routes';

const app = express();

// Security Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);

app.use(cookieParser(config.cookieSecret));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply general API rate limiting
app.use('/api', apiRateLimiter);

// Public cover photos only (E-books are protected behind /api/ebooks/:id/stream)
app.use('/uploads/covers', express.static(path.join(config.upload.dir, 'covers')));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount modular API routers
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/ebooks', ebookRoutes);
app.use('/api/users', userRoutes);
app.use('/api/book-issues', issueRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/patron', patronRoutes);

// 404 handler for unknown API routes
app.use('/api/*', (_req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
  });
});

// Global error handler
app.use(errorHandler);

export default app;
