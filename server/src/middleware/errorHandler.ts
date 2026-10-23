import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
  let message = err.message || 'Internal Server Error';

  // Handle Prisma / PostgreSQL disconnection or unreachable errors gracefully
  if (
    err.code === 'P1001' ||
    err.code === 'ECONNREFUSED' ||
    message.includes("Can't reach database server") ||
    message.includes('Connection terminated unexpectedly')
  ) {
    statusCode = 503;
    message = 'Database service currently unavailable or unreachable. Please check Database Configuration settings.';
  }

  // Strip any raw database passwords or credentials from messages
  message = message.replace(/password=.+?(?=\s|;|$)/gi, 'password=***');

  console.error(`[Server Error] ${statusCode} - ${message}`);

  res.status(statusCode).json({
    success: false,
    error: message,
    code: err.code,
  });
}
