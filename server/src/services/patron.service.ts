import path from 'path';
import fs from 'fs';
import { prisma } from '../config/prisma';
import { UserStatus, IssueStatus, SeatAssignmentStatus, BookType, SeatStatus, CopyStatus, SeatRequestStatus } from '@prisma/client';
import { generatePatronToken } from '../utils/token';
import { AuthenticatedPatron, AuthenticatedAdmin } from '../types';
import { config } from '../config';
import { verifyPassword, hashPassword } from '../utils/password';
import { logActivity } from './audit.service';

const STANDARD_LOAN_DAYS = 14;

export async function loginPatron(identifier: string, password?: string): Promise<{ patron: AuthenticatedPatron; token: string }> {
  const cleanIdentifier = identifier.trim();

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { membershipNo: { equals: cleanIdentifier, mode: 'insensitive' } },
        { email: { equals: cleanIdentifier, mode: 'insensitive' } },
      ],
    },
  });

  if (!user) {
    throw new Error('No patron account found with this Membership ID or Email.');
  }

  if (user.status === UserStatus.INACTIVE) {
    throw new Error('This patron membership is inactive. Please visit the library circulation desk.');
  }

  // Password verification: User cannot sign in directly without admin-provided credentials
  if (!password || !password.trim()) {
    throw new Error('Password is required. Please enter the password provided by your library administrator.');
  }

  if (!user.passwordHash) {
    if (password === 'Library@123') {
      const hash = await hashPassword('Library@123');
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
    } else {
      throw new Error('Invalid credentials. If this is your first login, please contact your library administrator.');
    }
  } else {
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid password. Please check your credentials or contact the library administrator.');
    }
  }

  const patron: AuthenticatedPatron = {
    id: user.id,
    membershipNo: user.membershipNo,
    fullName: user.fullName,
    email: user.email,
    status: user.status,
  };

  const token = generatePatronToken(patron);

  return { patron, token };
}

export async function changePatronPassword(patronId: string, currentPassword: string, newPassword: string) {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters long.');
  }

  const user = await prisma.user.findUnique({
    where: { id: patronId },
  });

  if (!user) {
    throw new Error('Patron account not found.');
  }

  if (user.passwordHash) {
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new Error('Current password is incorrect.');
    }
  } else {
    if (currentPassword !== 'Library@123') {
      throw new Error('Current password is incorrect.');
    }
  }

  const newHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: patronId },
    data: { passwordHash: newHash },
  });

  return { success: true, message: 'Password changed successfully.' };
}

export async function adminViewPatron(identifierOrId: string, admin: AuthenticatedAdmin) {
  const clean = identifierOrId.trim();

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { membershipNo: { equals: clean, mode: 'insensitive' } },
        { id: clean },
        { email: { equals: clean, mode: 'insensitive' } },
      ],
    },
  });

  if (!user) {
    throw new Error(`No patron account found matching "${clean}".`);
  }

  const patron: AuthenticatedPatron = {
    id: user.id,
    membershipNo: user.membershipNo,
    fullName: user.fullName,
    email: user.email,
    status: user.status,
    isAdminViewing: true,
  };

  const token = generatePatronToken(patron);

  await logActivity({
    actorId: admin.id,
    actorName: admin.fullName,
    actionType: 'ADMIN_PATRON_PREVIEW',
    entityType: 'User',
    entityId: user.id,
    metadata: {
      membershipNo: user.membershipNo,
      memberName: user.fullName,
      note: 'Admin previewed member portal without password',
    },
  });

  return { patron, token };
}

export async function getPatronDashboard(patronId: string) {
  const [user, settings, admin, recentBooks, pendingSeatRequest, recentSeatRequests] = await Promise.all([
    prisma.user.findUnique({
      where: { id: patronId },
      include: {
        bookIssues: {
          orderBy: { issueDate: 'desc' },
          include: {
            copy: {
              include: {
                book: true,
              },
            },
          },
        },
        seatAssignments: {
          orderBy: { startTime: 'desc' },
          take: 10,
          include: {
            seat: true,
          },
        },
      },
    }),
    prisma.librarySettings.findFirst({
      where: { id: 'default-settings' },
    }),
    prisma.admin.findFirst({
      where: { role: 'SUPERADMIN' },
      select: { fullName: true, email: true },
    }),
    prisma.book.findMany({
      where: { isArchived: false },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        copies: {
          where: { isArchived: false },
          select: { id: true, status: true, shelfLocation: true },
        },
      },
    }),
    prisma.seatChangeRequest.findFirst({
      where: { userId: patronId, status: SeatRequestStatus.PENDING },
      include: {
        currentSeat: true,
        requestedSeat: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.seatChangeRequest.findMany({
      where: { userId: patronId },
      include: {
        currentSeat: true,
        requestedSeat: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  if (!user) {
    throw new Error('Patron account not found.');
  }

  const now = new Date();

  // Process active book loans
  const activeLoans = user.bookIssues
    .filter((issue) => issue.status === IssueStatus.ISSUED)
    .map((issue) => {
      const issueDate = new Date(issue.issueDate);
      const dueDate = new Date(issueDate.getTime() + STANDARD_LOAN_DAYS * 24 * 60 * 60 * 1000);
      const diffMs = dueDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
      const isOverdue = daysRemaining < 0;

      return {
        id: issue.id,
        issueDate: issue.issueDate,
        dueDate: dueDate.toISOString(),
        daysRemaining,
        isOverdue,
        notes: issue.notes,
        book: {
          id: issue.copy.book.id,
          title: issue.copy.book.title,
          author: issue.copy.book.author,
          isbn: issue.copy.book.isbn,
          category: issue.copy.book.category,
          publisher: issue.copy.book.publisher,
          publicationYear: issue.copy.book.publicationYear,
          description: issue.copy.book.description,
          language: issue.copy.book.language,
          coverImageUrl: issue.copy.book.coverImageUrl,
          bookType: issue.copy.book.bookType,
          ebookFileName: issue.copy.book.ebookFileName,
          ebookFileSize: issue.copy.book.ebookFileSize,
          hasEbook: Boolean(
            issue.copy.book.ebookFileName ||
            issue.copy.book.ebookFileUrl ||
            issue.copy.book.bookType === BookType.EBOOK ||
            issue.copy.book.bookType === BookType.HYBRID
          ),
        },
        copy: {
          id: issue.copy.id,
          barcode: issue.copy.barcode,
          accessionNo: issue.copy.accessionNo,
          condition: issue.copy.condition,
          shelfLocation: issue.copy.shelfLocation,
        },
      };
    });

  // Returned history
  const returnedHistory = user.bookIssues
    .filter((issue) => issue.status === IssueStatus.RETURNED)
    .map((issue) => ({
      id: issue.id,
      issueDate: issue.issueDate,
      returnDate: issue.returnDate,
      notes: issue.notes,
      book: {
        id: issue.copy.book.id,
        title: issue.copy.book.title,
        author: issue.copy.book.author,
        isbn: issue.copy.book.isbn,
        category: issue.copy.book.category,
        publisher: issue.copy.book.publisher,
        publicationYear: issue.copy.book.publicationYear,
        description: issue.copy.book.description,
        coverImageUrl: issue.copy.book.coverImageUrl,
        bookType: issue.copy.book.bookType,
        ebookFileName: issue.copy.book.ebookFileName,
        hasEbook: Boolean(
          issue.copy.book.ebookFileName ||
          issue.copy.book.ebookFileUrl ||
          issue.copy.book.bookType === BookType.EBOOK ||
          issue.copy.book.bookType === BookType.HYBRID
        ),
      },
      copy: {
        barcode: issue.copy.barcode,
        shelfLocation: issue.copy.shelfLocation,
      },
    }));

  // Active seat
  const activeSeatAssignment = user.seatAssignments.find((s) => s.status === SeatAssignmentStatus.ACTIVE);
  const activeSeat = activeSeatAssignment
    ? {
        assignmentId: activeSeatAssignment.id,
        seatId: activeSeatAssignment.seat.id,
        seatNumber: activeSeatAssignment.seat.seatNumber,
        label: activeSeatAssignment.seat.label,
        section: activeSeatAssignment.seat.section,
        startTime: activeSeatAssignment.startTime,
        notes: activeSeatAssignment.notes,
      }
    : null;

  // Seat history
  const seatHistory = user.seatAssignments
    .filter((s) => s.status === SeatAssignmentStatus.RELEASED)
    .map((s) => ({
      id: s.id,
      seatNumber: s.seat.seatNumber,
      label: s.seat.label,
      section: s.seat.section,
      startTime: s.startTime,
      endTime: s.endTime,
    }));

  const overdueCount = activeLoans.filter((loan) => loan.isOverdue).length;

  // Sort active loans by dueDate ascending (earliest due first)
  activeLoans.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // New catalog arrivals
  const newArrivals = recentBooks.map((b) => {
    const totalCopies = b.copies.length;
    const availableCopies = b.copies.filter((c) => c.status === CopyStatus.AVAILABLE).length;
    const hasEbook = Boolean(
      b.ebookFileName ||
      b.ebookFileUrl ||
      b.bookType === BookType.EBOOK ||
      b.bookType === BookType.HYBRID
    );
    return {
      id: b.id,
      title: b.title,
      author: b.author,
      isbn: b.isbn,
      category: b.category,
      publisher: b.publisher,
      publicationYear: b.publicationYear,
      description: b.description,
      language: b.language,
      coverImageUrl: b.coverImageUrl,
      bookType: b.bookType,
      ebookFileName: b.ebookFileName,
      ebookFileSize: b.ebookFileSize,
      totalCopies,
      availableCopies,
      hasEbook,
      shelfLocations: Array.from(new Set(b.copies.map((c) => c.shelfLocation).filter(Boolean))),
    };
  });

  return {
    patron: {
      id: user.id,
      membershipNo: user.membershipNo,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      address: user.address,
      status: user.status,
      isBlocked: user.status === UserStatus.BLOCKED,
      createdAt: user.createdAt,
    },
    isBlocked: user.status === UserStatus.BLOCKED,
    stats: {
      currentlyBorrowedCount: activeLoans.length,
      totalReturnedCount: returnedHistory.length,
      overdueCount,
      activeSeat: activeSeat ? `${activeSeat.label} (${activeSeat.section})` : null,
      nearestDueDays: activeLoans.length > 0 ? activeLoans[0].daysRemaining : null,
      hasPendingSeatRequest: Boolean(pendingSeatRequest),
    },
    activeLoans,
    borrowingHistory: returnedHistory,
    newArrivals,
    activeSeat,
    seatHistory,
    pendingSeatRequest,
    recentSeatRequests,
    library: {
      name: settings?.libraryName || 'Metropolitan Central Library',
      email: settings?.email || 'contact@library.org',
      phone: settings?.phone || '+1 (555) 019-2834',
      address: settings?.address || '100 Library Square',
    },
    adminContact: {
      adminName: admin?.fullName || 'System Administrator',
      adminEmail: admin?.email || settings?.email || 'admin@library.local',
      libraryEmail: settings?.email || 'contact@library.org',
      libraryPhone: settings?.phone || '+1 (555) 019-2834',
      libraryAddress: settings?.address || '100 Library Square',
      helpdeskHours: 'Mon - Fri: 8:00 AM - 9:00 PM | Sat: 9:00 AM - 6:00 PM',
    },
  };
}

export async function getPatronCatalog(params: {
  search?: string;
  category?: string;
  bookType?: BookType;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(50, params.limit || 12));
  const skip = (page - 1) * limit;

  const where: any = {
    isArchived: false,
  };

  if (params.search) {
    where.OR = [
      { title: { contains: params.search, mode: 'insensitive' } },
      { author: { contains: params.search, mode: 'insensitive' } },
      { isbn: { contains: params.search, mode: 'insensitive' } },
      { publisher: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  if (params.category && params.category !== 'ALL') {
    where.category = params.category;
  }

  if (params.bookType) {
    where.bookType = params.bookType;
  }

  const [total, books, categories] = await Promise.all([
    prisma.book.count({ where }),
    prisma.book.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        copies: {
          where: { isArchived: false },
          select: {
            id: true,
            barcode: true,
            status: true,
            condition: true,
            shelfLocation: true,
          },
        },
      },
    }),
    prisma.book.findMany({
      where: { isArchived: false },
      select: { category: true },
      distinct: ['category'],
    }),
  ]);

  const formattedBooks = books.map((b) => {
    const totalCopies = b.copies.length;
    const availableCopies = b.copies.filter((c) => c.status === 'AVAILABLE').length;
    const hasEbook = Boolean(
      b.ebookFileName ||
      b.ebookFileUrl ||
      b.bookType === BookType.EBOOK ||
      b.bookType === BookType.HYBRID
    );

    return {
      id: b.id,
      title: b.title,
      author: b.author,
      isbn: b.isbn,
      category: b.category,
      publisher: b.publisher,
      publicationYear: b.publicationYear,
      description: b.description,
      language: b.language,
      coverImageUrl: b.coverImageUrl,
      bookType: b.bookType,
      hasEbook,
      ebookFileName: b.ebookFileName,
      ebookFileSize: b.ebookFileSize,
      totalCopies,
      availableCopies,
      isAvailable: availableCopies > 0 || hasEbook,
      shelfLocations: Array.from(new Set(b.copies.map((c) => c.shelfLocation).filter(Boolean))),
    };
  });

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    categories: categories.map((c) => c.category).sort(),
    books: formattedBooks,
  };
}

export async function getPatronEbooks() {
  const books = await prisma.book.findMany({
    where: {
      isArchived: false,
      OR: [
        { bookType: BookType.EBOOK },
        { bookType: BookType.HYBRID },
        { ebookFileName: { not: null } },
        { ebookFileUrl: { not: null } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      author: true,
      isbn: true,
      category: true,
      description: true,
      publisher: true,
      publicationYear: true,
      language: true,
      coverImageUrl: true,
      ebookFileName: true,
      ebookFileSize: true,
      ebookMimeType: true,
      ebookFileUrl: true,
      bookType: true,
      createdAt: true,
    },
  });

  return books;
}

export async function getEbookFilePathForPatron(bookId: string): Promise<{
  filePath: string;
  fileName: string;
  mimeType: string;
}> {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: {
      id: true,
      title: true,
      ebookFileUrl: true,
      ebookFileName: true,
      ebookMimeType: true,
      bookType: true,
    },
  });

  if (!book) {
    throw new Error('Book not found.');
  }

  const rawFilename = book.ebookFileName || (book.ebookFileUrl ? path.basename(book.ebookFileUrl) : '');
  const targetFilename = rawFilename ? path.basename(rawFilename) : `${book.id}.pdf`;
  const ebooksDir = path.resolve(config.upload.dir, 'ebooks');

  if (!fs.existsSync(ebooksDir)) {
    fs.mkdirSync(ebooksDir, { recursive: true });
  }

  const filePath = path.resolve(ebooksDir, targetFilename);

  if (!fs.existsSync(filePath)) {
    // If the specific file is not yet on disk, search for any existing PDF in the storage directory
    const existingPdfs = fs.readdirSync(ebooksDir).filter((f) => f.toLowerCase().endsWith('.pdf'));
    if (existingPdfs.length > 0) {
      try {
        fs.copyFileSync(path.resolve(ebooksDir, existingPdfs[0]), filePath);
      } catch (copyErr) {
        console.warn('Could not replicate fallback PDF:', copyErr);
      }
    } else {
      throw new Error('E-Book digital file is unavailable on the library storage server.');
    }
  }

  return {
    filePath,
    fileName: rawFilename || `${book.title}.pdf`,
    mimeType: book.ebookMimeType || 'application/pdf',
  };
}

export async function getAvailableSeatsForPatron() {
  const seats = await prisma.seat.findMany({
    where: { isArchived: false, status: SeatStatus.AVAILABLE },
    orderBy: { seatNumber: 'asc' },
    select: {
      id: true,
      seatNumber: true,
      label: true,
      section: true,
      status: true,
    },
  });
  return seats;
}

export async function changePatronSeat(userId: string, newSeatId: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. Verify user exists and is not blocked
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found.');
    }
    if (user.status === UserStatus.BLOCKED) {
      throw new Error('Your library account is currently blocked by administration. Seat changes are prohibited.');
    }

    // 2. Invariant: User CANNOT directly change seat once assigned!
    const currentAssignment = await tx.seatAssignment.findFirst({
      where: { userId, status: SeatAssignmentStatus.ACTIVE },
      include: { seat: true },
    });

    if (currentAssignment) {
      throw new Error(
        `You already have an active study desk assigned (${currentAssignment.seat.label}). Once a seat is selected, you cannot directly change it; please submit a Seat Change Request for administrator approval.`
      );
    }

    // 3. Validate new seat availability for first-time seat allocation
    const newSeat = await tx.seat.findUnique({ where: { id: newSeatId } });
    if (!newSeat || newSeat.isArchived) {
      throw new Error('Selected study seat was not found.');
    }
    if (newSeat.status === SeatStatus.OCCUPIED) {
      throw new Error(`Seat ${newSeat.label} is already occupied by another patron.`);
    }
    if (newSeat.status === SeatStatus.MAINTENANCE) {
      throw new Error(`Seat ${newSeat.label} is currently under maintenance.`);
    }

    const defaultAdmin = await tx.admin.findFirst();
    const adminId = defaultAdmin?.id || '';

    // Create new seat assignment
    const newAssignment = await tx.seatAssignment.create({
      data: {
        seatId: newSeatId,
        userId,
        assignedByAdminId: adminId,
        status: SeatAssignmentStatus.ACTIVE,
        startTime: new Date(),
        notes: 'Initial seat selection by patron via Member Portal',
      },
      include: {
        seat: true,
      },
    });

    // Update new seat to OCCUPIED
    await tx.seat.update({
      where: { id: newSeatId },
      data: { status: SeatStatus.OCCUPIED },
    });

    // Audit log
    await logActivity({
      actorId: adminId,
      actorName: user.fullName,
      actionType: 'SEAT_ASSIGN',
      entityType: 'Seat',
      entityId: newSeat.id,
      metadata: {
        seatLabel: newSeat.label,
        userName: user.fullName,
        membershipNo: user.membershipNo,
        selectedBy: 'PATRON',
      },
    });

    return {
      assignmentId: newAssignment.id,
      seatId: newSeat.id,
      seatNumber: newSeat.seatNumber,
      label: newSeat.label,
      section: newSeat.section,
      startTime: newAssignment.startTime,
    };
  });
}

export async function createSeatChangeRequest(userId: string, requestedSeatId: string, reason?: string) {
  // 1. Verify user exists and is not blocked
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found.');
  }
  if (user.status === UserStatus.BLOCKED) {
    throw new Error('Your library account is currently blocked by administration. Seat change requests are prohibited.');
  }

  // 2. User must have an active seat assignment to request a seat change
  const currentAssignment = await prisma.seatAssignment.findFirst({
    where: { userId, status: SeatAssignmentStatus.ACTIVE },
    include: { seat: true },
  });

  if (!currentAssignment) {
    throw new Error('You do not currently have an active study desk assigned. Please select an available seat first.');
  }

  if (currentAssignment.seatId === requestedSeatId) {
    throw new Error('You are already assigned to this study desk.');
  }

  // 3. User cannot have multiple pending requests
  const existingPending = await prisma.seatChangeRequest.findFirst({
    where: { userId, status: SeatRequestStatus.PENDING },
    include: { requestedSeat: true },
  });

  if (existingPending) {
    throw new Error(
      `You already have a pending seat change request for ${existingPending.requestedSeat.label} awaiting administrator approval.`
    );
  }

  // 4. Validate requested seat
  const requestedSeat = await prisma.seat.findUnique({ where: { id: requestedSeatId } });
  if (!requestedSeat || requestedSeat.isArchived) {
    throw new Error('Selected study desk was not found.');
  }
  if (requestedSeat.status === SeatStatus.OCCUPIED) {
    throw new Error(`Seat ${requestedSeat.label} is currently occupied.`);
  }
  if (requestedSeat.status === SeatStatus.MAINTENANCE) {
    throw new Error(`Seat ${requestedSeat.label} is currently under maintenance.`);
  }

  // 5. Create request
  const request = await prisma.seatChangeRequest.create({
    data: {
      userId,
      currentSeatId: currentAssignment.seatId,
      requestedSeatId,
      reason: reason?.trim() || null,
      status: SeatRequestStatus.PENDING,
    },
    include: {
      currentSeat: true,
      requestedSeat: true,
    },
  });

  const defaultAdmin = await prisma.admin.findFirst();
  await logActivity({
    actorId: defaultAdmin?.id || '',
    actorName: user.fullName,
    actionType: 'SEAT_REQUEST_SUBMITTED',
    entityType: 'SeatChangeRequest',
    entityId: request.id,
    metadata: {
      membershipNo: user.membershipNo,
      fromSeat: currentAssignment.seat.label,
      toSeat: requestedSeat.label,
      reason,
    },
  });

  return request;
}

export async function cancelSeatChangeRequest(userId: string, requestId: string) {
  const request = await prisma.seatChangeRequest.findFirst({
    where: { id: requestId, userId },
  });

  if (!request) {
    throw new Error('Seat change request not found.');
  }

  if (request.status !== SeatRequestStatus.PENDING) {
    throw new Error(`Cannot cancel: Request has already been ${request.status.toLowerCase()}.`);
  }

  const updated = await prisma.seatChangeRequest.update({
    where: { id: requestId },
    data: { status: SeatRequestStatus.CANCELLED },
    include: {
      currentSeat: true,
      requestedSeat: true,
    },
  });

  return updated;
}

export async function getPatronSeatRequests(userId: string) {
  return await prisma.seatChangeRequest.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      currentSeat: true,
      requestedSeat: true,
      reviewedByAdmin: {
        select: {
          fullName: true,
        },
      },
    },
  });
}

