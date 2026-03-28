import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';

// Load environment variables
dotenv.config();

import { connectDatabase } from './config/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import healthRoutes from './routes/health';
import userRoutes from './routes/users';
import itemRoutes from './routes/items';
import unitRoutes from './routes/units';
import scanRoutes from './routes/scan';
import qrRoutes from './routes/qr';
import exportRoutes from './routes/export';
import eventRoutes from './routes/events';

const app = express();
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

/** Browser Origin header has no trailing slash; CLIENT_URL must match exactly for CORS. */
function corsAllowedOrigin(): string | string[] | boolean {
  if (process.env.NODE_ENV !== 'production') {
    return ['http://localhost:5173', 'http://127.0.0.1:5173'];
  }
  const raw = process.env.CLIENT_URL?.trim();
  if (!raw) return true;
  return raw.replace(/\/$/, '');
}

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: corsAllowedOrigin(),
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: corsAllowedOrigin(),
    credentials: true,
  })
);
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/events', eventRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await connectDatabase();

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📚 API available at http://localhost:${PORT}/api`);
      console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
export { io };
