import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { loginAdmin, changeAdminPassword, getAdminProfile } from '../services/auth.service';
import { AuthenticatedRequest } from '../types';
import { SESSION_COOKIE_NAME } from '../middleware/auth';
import { config } from '../config';

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Username or Email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { identifier, password } = req.body;
    const { token, admin } = await loginAdmin(identifier, password);

    // Set secure HttpOnly cookie
    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    });

    res.json({
      success: true,
      data: {
        admin,
        token, // also return token for API / mobile clients / tests
      },
    });
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: err.message || 'Login failed',
    });
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
  });

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
}

export async function getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const admin = await getAdminProfile(req.admin!.id);
    res.json({
      success: true,
      data: admin,
    });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;
    await changeAdminPassword(req.admin!.id, currentPassword, newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to change password',
    });
  }
}
