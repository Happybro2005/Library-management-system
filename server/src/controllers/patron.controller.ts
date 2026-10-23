import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as patronService from '../services/patron.service';
import * as seatService from '../services/seat.service';
import { AuthenticatedRequest } from '../types';
import { PATRON_SESSION_COOKIE_NAME } from '../middleware/auth';
import { config } from '../config';
import fs from 'fs';

import { prisma } from '../config/prisma';

export const patronLoginSchema = z.object({
  identifier: z.string().min(1, 'Membership Number or Email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters long'),
});

export const adminViewPatronSchema = z.object({
  membershipNo: z.string().min(1, 'Membership Number or ID is required'),
});

export const changeSeatSchema = z.object({
  seatId: z.string().min(1, 'Seat ID is required'),
});

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { identifier, password } = req.body;
    const { patron, token } = await patronService.loginPatron(identifier, password);

    res.cookie(PATRON_SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    });

    res.json({
      success: true,
      data: {
        patron,
        token,
      },
    });
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: err.message || 'Patron login failed',
    });
  }
}

export async function changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await patronService.changePatronPassword(req.patron!.id, currentPassword, newPassword);
    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to change password',
    });
  }
}

export async function adminViewPatron(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { membershipNo } = req.body;
    const { patron, token } = await patronService.adminViewPatron(membershipNo, req.admin!);

    res.cookie(PATRON_SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({
      success: true,
      data: {
        patron,
        token,
        isAdminViewing: true,
      },
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to view member dashboard',
    });
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie(PATRON_SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
  });

  res.json({
    success: true,
    message: 'Patron session ended successfully',
  });
}

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.patron?.id) {
    res.status(401).json({
      success: false,
      error: 'Patron not authenticated',
    });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.patron.id },
    select: {
      id: true,
      membershipNo: true,
      fullName: true,
      email: true,
      phone: true,
      address: true,
      status: true,
    },
  });

  res.json({
    success: true,
    data: user || req.patron,
  });
}

export async function getDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const dashboardData = await patronService.getPatronDashboard(req.patron!.id);
    res.json({
      success: true,
      data: dashboardData,
    });
  } catch (err) {
    next(err);
  }
}

export async function getCatalog(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, category, bookType, page, limit } = req.query as any;
    const catalogData = await patronService.getPatronCatalog({
      search,
      category,
      bookType,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 12,
    });
    res.json({
      success: true,
      data: catalogData,
    });
  } catch (err) {
    next(err);
  }
}

export async function getEbooks(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const ebooks = await patronService.getPatronEbooks();
    res.json({
      success: true,
      data: ebooks,
    });
  } catch (err) {
    next(err);
  }
}

export async function streamEbook(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookId = req.params.bookId as string;
    const { filePath, fileName, mimeType } = await patronService.getEbookFilePathForPatron(bookId);

    const stat = fs.statSync(filePath);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  } catch (err: any) {
    res.status(404).json({
      success: false,
      error: err.message || 'E-Book file not found',
    });
  }
}

export async function getSeats(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await seatService.getSeatsMap();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getAvailableSeats(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const seats = await patronService.getAvailableSeatsForPatron();
    res.json({ success: true, data: seats });
  } catch (err) {
    next(err);
  }
}

export async function changeSeat(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { seatId } = req.body;
    const result = await patronService.changePatronSeat(req.patron!.id, seatId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to select study seat' });
  }
}

export const requestSeatChangeSchema = z.object({
  requestedSeatId: z.string().min(1, 'Requested Seat ID is required'),
  reason: z.string().max(250, 'Reason must be 250 characters or less').optional(),
});

export async function requestSeatChange(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { requestedSeatId, reason } = req.body;
    const request = await patronService.createSeatChangeRequest(req.patron!.id, requestedSeatId, reason);
    res.status(201).json({
      success: true,
      data: request,
      message: 'Seat change request submitted for administrator review.',
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to submit seat change request' });
  }
}

export async function cancelSeatChange(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const requestId = req.params.requestId as string;
    const result = await patronService.cancelSeatChangeRequest(req.patron!.id, requestId);
    res.json({
      success: true,
      data: result,
      message: 'Seat change request cancelled.',
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to cancel seat change request' });
  }
}

export async function getSeatRequests(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const requests = await patronService.getPatronSeatRequests(req.patron!.id);
    res.json({ success: true, data: requests });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to fetch seat change requests' });
  }
}

