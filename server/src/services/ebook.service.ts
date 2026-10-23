import { prisma } from '../config/prisma';
import { BookType } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { logActivity } from './audit.service';

export async function getEbooks(params: { search?: string; category?: string; page?: number; limit?: number }) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 10));
  const skip = (page - 1) * limit;

  const where: any = {
    isArchived: false,
    bookType: { in: [BookType.EBOOK, BookType.HYBRID] },
  };

  if (params.search) {
    where.OR = [
      { title: { contains: params.search, mode: 'insensitive' } },
      { author: { contains: params.search, mode: 'insensitive' } },
      { isbn: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  if (params.category) {
    where.category = { equals: params.category, mode: 'insensitive' };
  }

  const [total, ebooks] = await Promise.all([
    prisma.book.count({ where }),
    prisma.book.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        author: true,
        isbn: true,
        publisher: true,
        category: true,
        description: true,
        publicationYear: true,
        language: true,
        coverImageUrl: true,
        bookType: true,
        ebookFileName: true,
        ebookFileSize: true,
        ebookMimeType: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    ebooks,
  };
}

export async function attachEbookFile(
  bookId: string,
  file: Express.Multer.File,
  admin: { id: string; fullName: string }
) {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book || book.isArchived) {
    throw new Error('Book not found.');
  }

  // If old file exists, clean it up
  if (book.ebookFileName) {
    const oldPath = path.join(config.upload.dir, 'ebooks', book.ebookFileName);
    if (fs.existsSync(oldPath)) {
      try {
        fs.unlinkSync(oldPath);
      } catch (err) {
        console.warn('Could not delete previous e-book file:', err);
      }
    }
  }

  // If currently physical only, upgrade to HYBRID
  let newType = book.bookType;
  if (book.bookType === BookType.PHYSICAL) {
    newType = BookType.HYBRID;
  }

  const updated = await prisma.book.update({
    where: { id: bookId },
    data: {
      ebookFileName: file.filename,
      ebookFileSize: file.size,
      ebookMimeType: file.mimetype,
      bookType: newType,
    },
  });

  await logActivity({
    actorId: admin.id,
    actorName: admin.fullName,
    actionType: 'EBOOK_UPLOAD',
    entityType: 'Book',
    entityId: bookId,
    metadata: { fileName: file.originalname, size: file.size },
  });

  return updated;
}

export async function getEbookFilePath(bookId: string) {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: {
      id: true,
      title: true,
      ebookFileName: true,
      ebookMimeType: true,
      isArchived: true,
    },
  });

  if (!book || book.isArchived || !book.ebookFileName) {
    throw new Error('E-Book digital file not found.');
  }

  // Prevent path traversal
  const safeFilename = path.basename(book.ebookFileName);
  const filePath = path.join(config.upload.dir, 'ebooks', safeFilename);

  if (!fs.existsSync(filePath)) {
    throw new Error('Digital file missing from server storage.');
  }

  return {
    filePath,
    title: book.title,
    mimeType: book.ebookMimeType || 'application/pdf',
    fileName: safeFilename,
  };
}
