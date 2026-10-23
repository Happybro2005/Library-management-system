import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types';
import * as bookService from '../services/book.service';
import { BookType, CopyStatus, CopyCondition } from '@prisma/client';

export const createBookSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  author: z.string().min(1, 'Author is required'),
  isbn: z.string().min(3, 'Valid ISBN is required'),
  publisher: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  publicationYear: z.number().int().optional(),
  language: z.string().optional(),
  coverImageUrl: z.string().optional(),
  bookType: z.nativeEnum(BookType).default(BookType.PHYSICAL),
  initialCopies: z.number().int().min(0).max(100).optional(),
  defaultShelfLocation: z.string().optional(),
});

export const updateBookSchema = z.object({
  title: z.string().min(1).optional(),
  author: z.string().min(1).optional(),
  isbn: z.string().min(3).optional(),
  publisher: z.string().optional(),
  category: z.string().min(1).optional(),
  description: z.string().optional(),
  publicationYear: z.number().int().optional(),
  language: z.string().optional(),
  coverImageUrl: z.string().optional(),
  bookType: z.nativeEnum(BookType).optional(),
});

export const addCopySchema = z.object({
  barcode: z.string().min(1, 'Barcode is required'),
  accessionNo: z.string().min(1, 'Accession number is required'),
  shelfLocation: z.string().min(1, 'Shelf location is required'),
  condition: z.nativeEnum(CopyCondition).optional(),
});

export const updateCopySchema = z.object({
  shelfLocation: z.string().optional(),
  condition: z.nativeEnum(CopyCondition).optional(),
  status: z.nativeEnum(CopyStatus).optional(),
});

export async function listBooks(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, category, bookType, page, limit, sortBy, sortOrder } = req.query as any;
    const result = await bookService.getBooks({
      search,
      category,
      bookType,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      sortBy,
      sortOrder,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getBook(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const book = await bookService.getBookById(id);
    res.json({ success: true, data: book });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message || 'Book not found' });
  }
}

export async function createBook(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const book = await bookService.createBook(req.body, {
      id: req.admin!.id,
      fullName: req.admin!.fullName,
    });
    res.status(201).json({ success: true, data: book });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to create book' });
  }
}

export async function updateBook(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const book = await bookService.updateBook(id, req.body, {
      id: req.admin!.id,
      fullName: req.admin!.fullName,
    });
    res.json({ success: true, data: book });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to update book' });
  }
}

export async function archiveBook(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const result = await bookService.archiveBook(id, {
      id: req.admin!.id,
      fullName: req.admin!.fullName,
    });
    res.json({ success: true, message: `Book "${result.title}" deleted successfully.` });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to delete book' });
  }
}

export async function addCopy(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookId = req.params.bookId as string;
    const copy = await bookService.addCopy(bookId, req.body, {
      id: req.admin!.id,
      fullName: req.admin!.fullName,
    });
    res.status(201).json({ success: true, data: copy });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to add copy' });
  }
}

export async function updateCopy(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const copy = await bookService.updateCopy(id, req.body, {
      id: req.admin!.id,
      fullName: req.admin!.fullName,
    });
    res.json({ success: true, data: copy });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to update copy' });
  }
}

export async function uploadCoverImage(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'No image file uploaded' });
    return;
  }
  const coverUrl = `/uploads/covers/${req.file.filename}`;
  res.json({ success: true, data: { coverUrl } });
}
