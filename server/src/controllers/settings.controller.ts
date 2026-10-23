import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types';
import * as settingsService from '../services/settings.service';

export const updateSettingsSchema = z.object({
  libraryName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  logoUrl: z.string().optional(),
  defaultLanguage: z.string().optional(),
  defaultSeatCapacity: z.number().int().min(1).optional(),
});

export async function getSettings(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const settings = await settingsService.getLibrarySettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const updated = await settingsService.updateLibrarySettings(req.body, {
      id: req.admin!.id,
      fullName: req.admin!.fullName,
    });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to update settings' });
  }
}
