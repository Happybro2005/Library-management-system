import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types';
import * as userService from '../services/user.service';
import { UserStatus } from '@prisma/client';

export const createUserSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  address: z.string().optional(),
  membershipNo: z.string().optional(),
  seatId: z.string().optional(),
  status: z.nativeEnum(UserStatus).default(UserStatus.ACTIVE),
  password: z
    .string()
    .optional()
    .refine((val) => !val || val.trim().length >= 6, {
      message: 'Password must be at least 6 characters if specified',
    }),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

export async function listUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, status, page, limit } = req.query as any;
    const result = await userService.getUsers({
      search,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const user = await userService.getUserById(id);
    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message || 'User not found' });
  }
}

export async function createUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await userService.createUser(req.body, {
      id: req.admin!.id,
      fullName: req.admin!.fullName,
    });
    res.status(201).json({ success: true, data: user });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to create user' });
  }
}

export async function updateUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const user = await userService.updateUser(id, req.body, {
      id: req.admin!.id,
      fullName: req.admin!.fullName,
    });
    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to update user' });
  }
}

export async function resetPassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const result = await userService.resetUserPassword(id, req.body?.password, {
      id: req.admin!.id,
      fullName: req.admin!.fullName,
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to reset user password' });
  }
}
