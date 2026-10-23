import { prisma } from '../config/prisma';
import { UserStatus, IssueStatus, SeatAssignmentStatus, SeatStatus } from '@prisma/client';
import { logActivity } from './audit.service';
import { hashPassword } from '../utils/password';

export interface UserFilterParams {
  search?: string;
  status?: UserStatus;
  page?: number;
  limit?: number;
}

export async function getUsers(params: UserFilterParams) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 10));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (params.search) {
    where.OR = [
      { fullName: { contains: params.search, mode: 'insensitive' } },
      { email: { contains: params.search, mode: 'insensitive' } },
      { phone: { contains: params.search, mode: 'insensitive' } },
      { membershipNo: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  if (params.status) {
    where.status = params.status;
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        _count: {
          select: {
            bookIssues: {
              where: { status: IssueStatus.ISSUED },
            },
          },
        },
        seatAssignments: {
          where: { status: SeatAssignmentStatus.ACTIVE },
          include: {
            seat: {
              select: { seatNumber: true, label: true },
            },
          },
        },
      },
    }),
  ]);

  const formatted = users.map((u) => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
    address: u.address,
    membershipNo: u.membershipNo,
    status: u.status,
    createdAt: u.createdAt,
    currentlyBorrowedCount: u._count.bookIssues,
    activeSeat: u.seatAssignments[0]?.seat?.label || null,
  }));

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    users: formatted,
  };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      bookIssues: {
        orderBy: { issueDate: 'desc' },
        include: {
          copy: {
            include: {
              book: {
                select: { title: true, author: true, isbn: true },
              },
            },
          },
        },
      },
      seatAssignments: {
        orderBy: { startTime: 'desc' },
        take: 10,
        include: {
          seat: {
            select: { seatNumber: true, label: true, section: true },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error('User not found.');
  }

  const activeIssues = user.bookIssues.filter((i) => i.status === IssueStatus.ISSUED);
  const returnedIssues = user.bookIssues.filter((i) => i.status === IssueStatus.RETURNED);
  const activeSeatAssignment = user.seatAssignments.find((s) => s.status === SeatAssignmentStatus.ACTIVE);

  return {
    ...user,
    activeIssues,
    returnedIssues,
    activeSeat: activeSeatAssignment?.seat || null,
  };
}

export async function createUser(
  data: {
    fullName: string;
    email: string;
    phone?: string;
    address?: string;
    membershipNo?: string;
    seatId?: string;
    status?: UserStatus;
    password?: string;
  },
  admin: { id: string; fullName: string }
) {
  const cleanEmail = data.email.toLowerCase().trim();
  const existingEmail = await prisma.user.findUnique({
    where: { email: cleanEmail },
  });
  if (existingEmail) {
    throw new Error(`Email "${cleanEmail}" is already registered.`);
  }

  // Determine membership number (custom or safely auto-generated)
  let membershipNo = data.membershipNo?.trim();
  if (membershipNo) {
    const existingMem = await prisma.user.findUnique({
      where: { membershipNo },
    });
    if (existingMem) {
      throw new Error(`Membership number "${membershipNo}" is already in use.`);
    }
  } else {
    // Find the highest existing MEM-XXXX number to avoid collision
    const existingUsers = await prisma.user.findMany({
      select: { membershipNo: true },
    });
    let maxNumber = 1000;
    for (const u of existingUsers) {
      const match = u.membershipNo.match(/^MEM-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    }
    let nextNum = maxNumber + 1;
    while (await prisma.user.findUnique({ where: { membershipNo: `MEM-${nextNum}` } })) {
      nextNum++;
    }
    membershipNo = `MEM-${nextNum}`;
  }

  // Use provided password or generate secure initial password
  const initialPassword =
    data.password && data.password.trim().length >= 6
      ? data.password.trim()
      : `Lib@${Math.floor(100000 + Math.random() * 900000)}`;
  const passwordHash = await hashPassword(initialPassword);

  const user = await prisma.user.create({
    data: {
      fullName: data.fullName.trim(),
      email: cleanEmail,
      phone: data.phone?.trim() || null,
      address: data.address?.trim() || null,
      membershipNo,
      status: data.status || UserStatus.ACTIVE,
      passwordHash,
    },
  });

  await logActivity({
    actorId: admin.id,
    actorName: admin.fullName,
    actionType: 'USER_CREATE',
    entityType: 'User',
    entityId: user.id,
    metadata: { name: user.fullName, membershipNo: user.membershipNo },
  });

  // Allot study hall seat if requested during registration
  let allottedSeat: { id: string; seatNumber: number; label: string; section: string } | null = null;
  if (data.seatId && data.seatId.trim()) {
    const seat = await prisma.seat.findUnique({ where: { id: data.seatId.trim() } });
    if (seat && !seat.isArchived && seat.status === SeatStatus.AVAILABLE) {
      await prisma.seatAssignment.create({
        data: {
          seatId: seat.id,
          userId: user.id,
          assignedByAdminId: admin.id,
          status: SeatAssignmentStatus.ACTIVE,
          startTime: new Date(),
          notes: 'Seat allotted at registration',
        },
      });
      await prisma.seat.update({
        where: { id: seat.id },
        data: { status: SeatStatus.OCCUPIED },
      });
      allottedSeat = {
        id: seat.id,
        seatNumber: seat.seatNumber,
        label: seat.label,
        section: seat.section,
      };
      await logActivity({
        actorId: admin.id,
        actorName: admin.fullName,
        actionType: 'SEAT_ASSIGN',
        entityType: 'Seat',
        entityId: seat.id,
        metadata: {
          seatLabel: seat.label,
          userName: user.fullName,
          membershipNo: user.membershipNo,
          notes: 'Allotted at member registration',
        },
      });
    }
  }

  return {
    ...user,
    initialPassword,
    allottedSeat,
  };
}

export async function resetUserPassword(
  id: string,
  newPassword: string | undefined,
  admin: { id: string; fullName: string }
) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new Error('User not found.');
  }

  const generatedPassword = newPassword?.trim() || `Reset@${Math.floor(100000 + Math.random() * 900000)}`;
  const passwordHash = await hashPassword(generatedPassword);

  const updated = await prisma.user.update({
    where: { id },
    data: { passwordHash },
  });

  await logActivity({
    actorId: admin.id,
    actorName: admin.fullName,
    actionType: 'USER_PASSWORD_RESET',
    entityType: 'User',
    entityId: updated.id,
    metadata: { name: updated.fullName, membershipNo: updated.membershipNo },
  });

  return {
    user: updated,
    newPassword: generatedPassword,
  };
}

export async function updateUser(
  id: string,
  data: Partial<{
    fullName: string;
    email: string;
    phone: string;
    address: string;
    status: UserStatus;
  }>,
  admin: { id: string; fullName: string }
) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('User not found.');
  }

  if (data.email && data.email.toLowerCase() !== existing.email) {
    const duplicate = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (duplicate) {
      throw new Error(`Email ${data.email} is already registered to another user.`);
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...data,
      ...(data.email ? { email: data.email.toLowerCase() } : {}),
    },
  });

  await logActivity({
    actorId: admin.id,
    actorName: admin.fullName,
    actionType: 'USER_UPDATE',
    entityType: 'User',
    entityId: updated.id,
    metadata: { name: updated.fullName, status: updated.status },
  });

  return updated;
}
