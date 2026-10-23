import { prisma } from '../config/prisma';
import { BookType, CopyStatus, SeatStatus, SeatRequestStatus } from '@prisma/client';

export async function getDashboardStats() {
  const [
    totalAllTitles,
    totalPhysicalTitles,
    totalPhysicalCopies,
    totalEbookTitles,
    borrowedCopies,
    availableCopies,
    maintenanceCopies,
    totalUsers,
    totalSeats,
    occupiedSeats,
    availableSeats,
    maintenanceSeats,
    pendingSeatRequests,
  ] = await Promise.all([
    // 0. Total book titles (all formats)
    prisma.book.count({
      where: { isArchived: false },
    }),
    // 1. Total physical book titles
    prisma.book.count({
      where: {
        isArchived: false,
        bookType: { in: [BookType.PHYSICAL, BookType.HYBRID] },
      },
    }),
    // 2. Total individual physical copies
    prisma.bookCopy.count({
      where: { isArchived: false },
    }),
    // 3. Total e-book titles
    prisma.book.count({
      where: {
        isArchived: false,
        bookType: { in: [BookType.EBOOK, BookType.HYBRID] },
      },
    }),
    // 4. Currently borrowed physical copies
    prisma.bookCopy.count({
      where: { isArchived: false, status: CopyStatus.BORROWED },
    }),
    // 5. Available physical copies
    prisma.bookCopy.count({
      where: { isArchived: false, status: CopyStatus.AVAILABLE },
    }),
    // Maintenance/damaged copies
    prisma.bookCopy.count({
      where: {
        isArchived: false,
        status: { in: [CopyStatus.MAINTENANCE, CopyStatus.DAMAGED, CopyStatus.LOST] },
      },
    }),
    // 6. Total registered library users
    prisma.user.count(),
    // 7. Total seats
    prisma.seat.count({
      where: { isArchived: false },
    }),
    // 8. Occupied seats
    prisma.seat.count({
      where: { isArchived: false, status: SeatStatus.OCCUPIED },
    }),
    // 9. Available seats
    prisma.seat.count({
      where: { isArchived: false, status: SeatStatus.AVAILABLE },
    }),
    // 10. Seats under maintenance
    prisma.seat.count({
      where: { isArchived: false, status: SeatStatus.MAINTENANCE },
    }),
    // 11. Pending seat change requests
    prisma.seatChangeRequest.count({
      where: { status: SeatRequestStatus.PENDING },
    }),
  ]);

  const seatOccupancyRate =
    totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;

  return {
    totalBooks: totalAllTitles,
    books: {
      totalTitles: totalAllTitles,
      totalPhysicalCopies,
      totalPhysicalTitles,
      totalEbookTitles,
      borrowedCopies,
      availableCopies,
      maintenanceCopies,
    },
    seats: {
      totalSeats,
      occupiedSeats,
      availableSeats,
      maintenanceSeats,
      occupancyPercentage: seatOccupancyRate,
    },
    requests: {
      pendingSeatRequests,
    },
    users: {
      totalUsers,
    },
    charts: {
      distribution: [
        { name: 'Physical Titles', value: totalPhysicalTitles },
        { name: 'E-Book Titles', value: totalEbookTitles },
      ],
      copiesStatus: [
        { name: 'Available Copies', value: availableCopies },
        { name: 'Borrowed Copies', value: borrowedCopies },
        { name: 'Maintenance/Lost', value: maintenanceCopies },
      ],
      seatsStatus: [
        { name: 'Available', value: availableSeats },
        { name: 'Occupied', value: occupiedSeats },
        { name: 'Maintenance', value: maintenanceSeats },
      ],
    },
  };
}

export async function getDashboardActivity() {
  const [recentBooks, recentIssues, recentUsers, recentSeatAssignments] = await Promise.all([
    // Recently added books
    prisma.book.findMany({
      where: { isArchived: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        author: true,
        isbn: true,
        bookType: true,
        category: true,
        createdAt: true,
        _count: {
          select: { copies: true },
        },
      },
    }),
    // Recent book issue and return activity
    prisma.bookIssue.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 6,
      include: {
        copy: {
          select: {
            barcode: true,
            shelfLocation: true,
            book: {
              select: { title: true, author: true },
            },
          },
        },
        user: {
          select: { fullName: true, membershipNo: true },
        },
      },
    }),
    // Recently registered users
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        fullName: true,
        email: true,
        membershipNo: true,
        status: true,
        createdAt: true,
      },
    }),
    // Recent seat assignments
    prisma.seatAssignment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        seat: {
          select: {
            seatNumber: true,
            label: true,
            section: true,
          },
        },
        user: {
          select: {
            fullName: true,
            membershipNo: true,
          },
        },
      },
    }),
  ]);

  return {
    recentBooks,
    recentIssues,
    recentUsers,
    recentSeatAssignments,
  };
}
