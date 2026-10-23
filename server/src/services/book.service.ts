import { prisma } from '../config/prisma';
import { BookType, CopyStatus, CopyCondition } from '@prisma/client';
import { logActivity } from './audit.service';

export interface BookFilterParams {
  search?: string;
  category?: string;
  bookType?: BookType;
  page?: number;
  limit?: number;
  sortBy?: 'title' | 'createdAt' | 'author';
  sortOrder?: 'asc' | 'desc';
}

export async function getBooks(params: BookFilterParams) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 10));
  const skip = (page - 1) * limit;

  const where: any = { isArchived: false };

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

  if (params.bookType) {
    where.bookType = params.bookType;
  }

  const orderBy = {
    [params.sortBy || 'createdAt']: params.sortOrder || 'desc',
  };

  const [total, books] = await Promise.all([
    prisma.book.count({ where }),
    prisma.book.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        copies: {
          where: { isArchived: false },
          select: {
            id: true,
            barcode: true,
            accessionNo: true,
            condition: true,
            shelfLocation: true,
            status: true,
          },
        },
      },
    }),
  ]);

  // Augment with copy stats
  const formatted = books.map((b) => {
    const totalCopies = b.copies.length;
    const availableCopies = b.copies.filter((c) => c.status === CopyStatus.AVAILABLE).length;
    const borrowedCopies = b.copies.filter((c) => c.status === CopyStatus.BORROWED).length;
    return {
      ...b,
      stats: {
        totalCopies,
        availableCopies,
        borrowedCopies,
      },
    };
  });

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    books: formatted,
  };
}

export async function getBookById(id: string) {
  const book = await prisma.book.findUnique({
    where: { id },
    include: {
      copies: {
        where: { isArchived: false },
        orderBy: { barcode: 'asc' },
        include: {
          issues: {
            where: { status: 'ISSUED' },
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  membershipNo: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!book || book.isArchived) {
    throw new Error('Book not found.');
  }

  return book;
}

export async function createBook(
  data: {
    title: string;
    author: string;
    isbn: string;
    publisher?: string;
    category: string;
    description?: string;
    publicationYear?: number;
    language?: string;
    coverImageUrl?: string;
    bookType: BookType;
    initialCopies?: number;
    defaultShelfLocation?: string;
  },
  admin: { id: string; fullName: string }
) {
  // Check unique ISBN
  const existing = await prisma.book.findUnique({ where: { isbn: data.isbn } });
  if (existing) {
    throw new Error(`A book with ISBN ${data.isbn} already exists.`);
  }

  return await prisma.$transaction(async (tx) => {
    const book = await tx.book.create({
      data: {
        title: data.title,
        author: data.author,
        isbn: data.isbn,
        publisher: data.publisher,
        category: data.category,
        description: data.description,
        publicationYear: data.publicationYear,
        language: data.language || 'English',
        coverImageUrl: data.coverImageUrl,
        bookType: data.bookType,
      },
    });

    // If initial copies are specified for physical/hybrid books, create them
    if (
      (data.bookType === BookType.PHYSICAL || data.bookType === BookType.HYBRID) &&
      data.initialCopies &&
      data.initialCopies > 0
    ) {
      const shelf = data.defaultShelfLocation || 'Main Stack-A1';
      for (let i = 1; i <= data.initialCopies; i++) {
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const barcode = `BC-${Date.now().toString().slice(-6)}-${i}-${randomSuffix}`;
        const accessionNo = `ACC-${Date.now().toString().slice(-6)}-${i}-${randomSuffix}`;

        await tx.bookCopy.create({
          data: {
            bookId: book.id,
            barcode,
            accessionNo,
            shelfLocation: shelf,
            condition: CopyCondition.GOOD,
            status: CopyStatus.AVAILABLE,
          },
        });
      }
    }

    await logActivity({
      actorId: admin.id,
      actorName: admin.fullName,
      actionType: 'BOOK_CREATE',
      entityType: 'Book',
      entityId: book.id,
      metadata: { title: book.title, isbn: book.isbn, type: book.bookType },
    });

    return book;
  });
}

export async function updateBook(
  id: string,
  data: Partial<{
    title: string;
    author: string;
    isbn: string;
    publisher: string;
    category: string;
    description: string;
    publicationYear: number;
    language: string;
    coverImageUrl: string;
    bookType: BookType;
  }>,
  admin: { id: string; fullName: string }
) {
  const existing = await prisma.book.findUnique({ where: { id } });
  if (!existing || existing.isArchived) {
    throw new Error('Book not found.');
  }

  if (data.isbn && data.isbn !== existing.isbn) {
    const duplicate = await prisma.book.findUnique({ where: { isbn: data.isbn } });
    if (duplicate) {
      throw new Error(`A book with ISBN ${data.isbn} already exists.`);
    }
  }

  const updated = await prisma.book.update({
    where: { id },
    data,
  });

  await logActivity({
    actorId: admin.id,
    actorName: admin.fullName,
    actionType: 'BOOK_UPDATE',
    entityType: 'Book',
    entityId: updated.id,
    metadata: { title: updated.title },
  });

  return updated;
}

export async function archiveBook(id: string, admin: { id: string; fullName: string }) {
  const book = await prisma.book.findUnique({
    where: { id },
    include: {
      copies: {
        include: {
          issues: true,
        },
      },
    },
  });

  if (!book) {
    throw new Error('Book not found.');
  }

  // Verify none of the copies are currently on active loan
  const activelyBorrowed = book.copies.some(
    (c) => c.status === CopyStatus.BORROWED && !c.isArchived
  );

  if (activelyBorrowed) {
    throw new Error('Cannot delete book while physical copies are currently borrowed. Please ensure all copies are returned first.');
  }

  // Check if any copy has a loan history record
  const hasLoanHistory = book.copies.some((c) => c.issues && c.issues.length > 0);

  if (!hasLoanHistory) {
    // Clean hard delete of book copies and book
    await prisma.$transaction(async (tx) => {
      await tx.bookCopy.deleteMany({
        where: { bookId: id },
      });
      await tx.book.delete({
        where: { id },
      });
    });
  } else {
    // Preserve audit loan history: soft-archive and release unique ISBN and barcode constraints
    const timestamp = Date.now();
    await prisma.$transaction(async (tx) => {
      for (const copy of book.copies) {
        await tx.bookCopy.update({
          where: { id: copy.id },
          data: {
            isArchived: true,
            status: CopyStatus.DAMAGED,
            barcode: `${copy.barcode}#archived-${timestamp}`,
            accessionNo: `${copy.accessionNo}#archived-${timestamp}`,
          },
        });
      }

      await tx.book.update({
        where: { id },
        data: {
          isArchived: true,
          isbn: `${book.isbn}#archived-${timestamp}`,
        },
      });
    });
  }

  await logActivity({
    actorId: admin.id,
    actorName: admin.fullName,
    actionType: 'BOOK_ARCHIVE',
    entityType: 'Book',
    entityId: id,
    metadata: { title: book.title, isbn: book.isbn },
  });

  return { id, title: book.title };
}

// Physical Copies Management
export async function addCopy(
  bookId: string,
  data: {
    barcode: string;
    accessionNo: string;
    shelfLocation: string;
    condition?: CopyCondition;
  },
  admin: { id: string; fullName: string }
) {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book || book.isArchived) {
    throw new Error('Book not found.');
  }

  if (book.bookType === BookType.EBOOK) {
    throw new Error('Cannot add physical copies to a purely digital E-Book.');
  }

  const existingBarcode = await prisma.bookCopy.findUnique({ where: { barcode: data.barcode } });
  if (existingBarcode) {
    throw new Error(`Barcode ${data.barcode} is already assigned to another copy.`);
  }

  const existingAcc = await prisma.bookCopy.findUnique({ where: { accessionNo: data.accessionNo } });
  if (existingAcc) {
    throw new Error(`Accession number ${data.accessionNo} is already assigned.`);
  }

  const copy = await prisma.bookCopy.create({
    data: {
      bookId,
      barcode: data.barcode,
      accessionNo: data.accessionNo,
      shelfLocation: data.shelfLocation,
      condition: data.condition || CopyCondition.GOOD,
      status: CopyStatus.AVAILABLE,
    },
  });

  await logActivity({
    actorId: admin.id,
    actorName: admin.fullName,
    actionType: 'COPY_CREATE',
    entityType: 'BookCopy',
    entityId: copy.id,
    metadata: { barcode: copy.barcode, bookTitle: book.title },
  });

  return copy;
}

export async function updateCopy(
  copyId: string,
  data: {
    shelfLocation?: string;
    condition?: CopyCondition;
    status?: CopyStatus;
  },
  admin: { id: string; fullName: string }
) {
  const copy = await prisma.bookCopy.findUnique({ where: { id: copyId } });
  if (!copy || copy.isArchived) {
    throw new Error('Copy not found.');
  }

  // Prevent setting status to AVAILABLE if it is currently borrowed
  if (copy.status === CopyStatus.BORROWED && data.status === CopyStatus.AVAILABLE) {
    throw new Error('Cannot mark a borrowed copy as available without processing its return record.');
  }

  const updated = await prisma.bookCopy.update({
    where: { id: copyId },
    data,
  });

  await logActivity({
    actorId: admin.id,
    actorName: admin.fullName,
    actionType: 'COPY_UPDATE',
    entityType: 'BookCopy',
    entityId: copyId,
    metadata: { barcode: copy.barcode, newStatus: data.status },
  });

  return updated;
}
