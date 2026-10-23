import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import * as ebookService from '../services/ebook.service';
import fs from 'fs';

export async function listEbooks(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, category, page, limit } = req.query as any;
    const result = await ebookService.getEbooks({
      search,
      category,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function uploadEbookFile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No e-book file uploaded.' });
      return;
    }

    const bookId = req.params.bookId as string;
    const updated = await ebookService.attachEbookFile(bookId, req.file, {
      id: req.admin!.id,
      fullName: req.admin!.fullName,
    });

    res.json({
      success: true,
      message: 'E-book file attached successfully.',
      data: updated,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to upload e-book file' });
  }
}

export async function readEbookFile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookId = req.params.bookId as string;
    const { filePath, title, mimeType } = await ebookService.getEbookFilePath(bookId);

    const stat = fs.statSync(filePath);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(title)}.pdf"`);

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message || 'File not found' });
  }
}
