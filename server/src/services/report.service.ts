import { prisma } from '../config/prisma';
import { BookType, CopyStatus, IssueStatus } from '@prisma/client';

export async function getInventoryReport() {
  const books = await prisma.book.findMany({
    where: { isArchived: false },
    orderBy: { title: 'asc' },
    include: {
      copies: {
        where: { isArchived: false },
      },
    },
  });

  return books.map((b) => ({
    id: b.id,
    title: b.title,
    author: b.author,
    isbn: b.isbn,
    category: b.category,
    bookType: b.bookType,
    totalCopies: b.copies.length,
    availableCopies: b.copies.filter((c) => c.status === CopyStatus.AVAILABLE).length,
    borrowedCopies: b.copies.filter((c) => c.status === CopyStatus.BORROWED).length,
    maintenanceCopies: b.copies.filter((c) => c.status === CopyStatus.MAINTENANCE).length,
  }));
}

export async function getEbookCatalogReport() {
  return await prisma.book.findMany({
    where: {
      isArchived: false,
      bookType: { in: [BookType.EBOOK, BookType.HYBRID] },
    },
    orderBy: { title: 'asc' },
    select: {
      title: true,
      author: true,
      isbn: true,
      category: true,
      publisher: true,
      language: true,
      publicationYear: true,
      ebookFileName: true,
      ebookFileSize: true,
      ebookMimeType: true,
    },
  });
}

export async function getBorrowedBooksReport() {
  const issues = await prisma.bookIssue.findMany({
    where: { status: IssueStatus.ISSUED },
    orderBy: { issueDate: 'desc' },
    include: {
      copy: {
        include: {
          book: {
            select: { title: true, author: true, isbn: true },
          },
        },
      },
      user: {
        select: { fullName: true, membershipNo: true, email: true, phone: true },
      },
      issuedByAdmin: {
        select: { fullName: true },
      },
    },
  });

  return issues.map((i) => ({
    issueId: i.id,
    bookTitle: i.copy.book.title,
    author: i.copy.book.author,
    isbn: i.copy.book.isbn,
    barcode: i.copy.barcode,
    shelfLocation: i.copy.shelfLocation,
    patronName: i.user.fullName,
    membershipNo: i.user.membershipNo,
    patronEmail: i.user.email,
    patronPhone: i.user.phone || 'N/A',
    issueDate: i.issueDate.toISOString().split('T')[0],
    issuedBy: i.issuedByAdmin.fullName,
  }));
}

export async function getIssueReturnHistoryReport(limit = 100) {
  const history = await prisma.bookIssue.findMany({
    orderBy: { issueDate: 'desc' },
    take: limit,
    include: {
      copy: {
        include: {
          book: {
            select: { title: true, author: true, isbn: true },
          },
        },
      },
      user: {
        select: { fullName: true, membershipNo: true },
      },
    },
  });

  return history.map((h) => ({
    id: h.id,
    bookTitle: h.copy.book.title,
    barcode: h.copy.barcode,
    patronName: h.user.fullName,
    membershipNo: h.user.membershipNo,
    issueDate: h.issueDate.toISOString().split('T')[0],
    returnDate: h.returnDate ? h.returnDate.toISOString().split('T')[0] : 'Still Borrowed',
    status: h.status,
    notes: h.notes || '',
  }));
}

export async function getSeatOccupancyReport() {
  const seats = await prisma.seat.findMany({
    where: { isArchived: false },
    orderBy: { seatNumber: 'asc' },
    include: {
      assignments: {
        where: { status: 'ACTIVE' },
        include: {
          user: { select: { fullName: true, membershipNo: true } },
        },
      },
    },
  });

  return seats.map((s) => ({
    seatNumber: s.seatNumber,
    label: s.label,
    section: s.section,
    status: s.status,
    occupiedBy: s.assignments[0]?.user.fullName || 'None',
    membershipNo: s.assignments[0]?.user.membershipNo || 'None',
    occupiedSince: s.assignments[0] ? s.assignments[0].startTime.toISOString() : 'N/A',
  }));
}

export function convertToCSV(data: Record<string, any>[]): string {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map((item) =>
    headers
      .map((header) => {
        const val = item[header] !== undefined && item[header] !== null ? String(item[header]) : '';
        // Escape quotes
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  return [headers.join(','), ...rows].join('\r\n');
}
