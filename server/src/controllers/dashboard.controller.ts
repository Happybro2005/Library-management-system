import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { getDashboardStats, getDashboardActivity } from '../services/stats.service';

export async function getStats(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await getDashboardStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
}

export async function getActivity(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const activity = await getDashboardActivity();
    res.json({
      success: true,
      data: activity,
    });
  } catch (err) {
    next(err);
  }
}
