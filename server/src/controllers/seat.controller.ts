import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types';
import * as seatService from '../services/seat.service';
import { SeatStatus, SeatRequestStatus } from '@prisma/client';

export const assignSeatSchema = z.object({
  seatId: z.string().min(1, 'Seat ID is required'),
  userId: z.string().min(1, 'Patron User ID is required'),
  notes: z.string().optional(),
});

export const adjustCapacitySchema = z.object({
  targetCapacity: z.number().int().min(1, 'Target capacity must be at least 1 seat'),
});

export const updateSeatStatusSchema = z.object({
  status: z.nativeEnum(SeatStatus),
});

export async function getSeats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await seatService.getSeatsMap();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function assignSeat(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { seatId, userId, notes } = req.body;
    const assignment = await seatService.assignSeat(
      seatId,
      userId,
      { id: req.admin!.id, fullName: req.admin!.fullName },
      notes
    );
    res.status(201).json({ success: true, data: assignment });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to assign seat' });
  }
}

export async function releaseSeat(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const seatId = req.params.seatId as string;
    const seat = await seatService.releaseSeat(seatId, {
      id: req.admin!.id,
      fullName: req.admin!.fullName,
    });
    res.json({ success: true, data: seat });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to release seat' });
  }
}

export async function updateSeatStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const seatId = req.params.seatId as string;
    const { status } = req.body;
    const updated = await seatService.updateSeatStatus(seatId, status, {
      id: req.admin!.id,
      fullName: req.admin!.fullName,
    });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to update seat status' });
  }
}

export async function adjustCapacity(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { targetCapacity } = req.body;
    const result = await seatService.adjustSeatCapacity(targetCapacity, {
      id: req.admin!.id,
      fullName: req.admin!.fullName,
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to adjust seat capacity' });
  }
}

export const reviewRequestSchema = z.object({
  adminNotes: z.string().optional(),
});

export async function getSeatRequests(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = req.query.status as SeatRequestStatus | undefined;
    const requests = await seatService.getSeatRequests(status);
    res.json({ success: true, data: requests });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to fetch seat change requests' });
  }
}

export async function approveSeatRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const requestId = req.params.requestId as string;
    const { adminNotes } = req.body || {};
    const result = await seatService.approveSeatRequest(
      requestId,
      { id: req.admin!.id, fullName: req.admin!.fullName },
      adminNotes
    );
    res.json({ success: true, data: result, message: 'Seat change request approved successfully' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to approve seat change request' });
  }
}

export async function rejectSeatRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const requestId = req.params.requestId as string;
    const { adminNotes } = req.body || {};
    const result = await seatService.rejectSeatRequest(
      requestId,
      { id: req.admin!.id, fullName: req.admin!.fullName },
      adminNotes
    );
    res.json({ success: true, data: result, message: 'Seat change request rejected' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to reject seat change request' });
  }
}

