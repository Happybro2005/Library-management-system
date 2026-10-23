import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { getActivityLogs } from '../services/audit.service';

export async function listActivityLogs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, actionType } = req.query as any;
    const result = await getActivityLogs(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      actionType
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
