import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types';
import * as issueService from '../services/issue.service';
import { IssueStatus, CopyCondition, CopyStatus } from '@prisma/client';

export const issueBookSchema = z.object({
  copyId: z.string().min(1, 'Book copy ID is required'),
  userId: z.string().min(1, 'Patron User ID is required'),
  notes: z.string().optional(),
});

export const returnBookSchema = z.object({
  returnCondition: z.nativeEnum(CopyCondition).optional(),
  targetStatus: z.nativeEnum(CopyStatus).optional(),
  notes: z.string().optional(),
});

export async function listIssues(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, search, page, limit } = req.query as any;
    const result = await issueService.getBookIssues({
      status,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function issueBook(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { copyId, userId, notes } = req.body;
    const issue = await issueService.issueBookCopy(
      copyId,
      userId,
      { id: req.admin!.id, fullName: req.admin!.fullName },
      notes
    );
    res.status(201).json({ success: true, data: issue });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to issue book' });
  }
}

export async function returnBook(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { returnCondition, targetStatus, notes } = req.body;
    const updated = await issueService.returnBookCopy(
      id,
      { id: req.admin!.id, fullName: req.admin!.fullName },
      { returnCondition, targetStatus, notes }
    );
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to return book' });
  }
}
