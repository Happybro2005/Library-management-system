import { prisma } from '../config/prisma';
import { SeatStatus, SeatAssignmentStatus, UserStatus, SeatRequestStatus } from '@prisma/client';
import { logActivity } from './audit.service';

export async function getSeatsMap() {
  const seats = await prisma.seat.findMany({
    where: { isArchived: false },
    orderBy: { seatNumber: 'asc' },
    include: {
      assignments: {
        where: { status: SeatAssignmentStatus.ACTIVE },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              membershipNo: true,
              email: true,
              phone: true,
            },
          },
        },
      },
    },
  });

  const totalSeats = seats.length;
  const occupiedSeats = seats.filter((s) => s.status === SeatStatus.OCCUPIED).length;
  const availableSeats = seats.filter((s) => s.status === SeatStatus.AVAILABLE).length;
  const maintenanceSeats = seats.filter((s) => s.status === SeatStatus.MAINTENANCE).length;

  const formattedSeats = seats.map((s) => {
    const currentAssignment = s.assignments[0] || null;
    return {
      id: s.id,
      seatNumber: s.seatNumber,
      label: s.label,
      section: s.section,
      status: s.status,
      currentAssignment: currentAssignment
        ? {
            id: currentAssignment.id,
            startTime: currentAssignment.startTime,
            user: currentAssignment.user,
          }
        : null,
    };
  });

  return {
    summary: {
      totalSeats,
      occupiedSeats,
      availableSeats,
      maintenanceSeats,
      occupancyPercentage: totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0,
    },
    seats: formattedSeats,
  };
}

export async function assignSeat(
  seatId: string,
  userId: string,
  admin: { id: string; fullName: string },
  notes?: string
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Validate Seat availability
    const seat = await tx.seat.findUnique({ where: { id: seatId } });
    if (!seat || seat.isArchived) {
      throw new Error('Seat not found.');
    }
    if (seat.status === SeatStatus.OCCUPIED) {
      throw new Error(`Seat ${seat.label} is already occupied.`);
    }
    if (seat.status === SeatStatus.MAINTENANCE) {
      throw new Error(`Seat ${seat.label} is currently under maintenance.`);
    }

    // 2. Validate User eligibility & active status
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found.');
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new Error(`Cannot assign seat to patron with account status "${user.status}".`);
    }

    // 3. Invariant: 1 active seat per patron (Only one seat can be reserved by one person)
    const activeUserAssignment = await tx.seatAssignment.findFirst({
      where: { userId, status: SeatAssignmentStatus.ACTIVE },
      include: { seat: { select: { label: true } } },
    });
    if (activeUserAssignment) {
      throw new Error(
        `Only one seat can be reserved by one person. ${user.fullName} already has an active seat assigned (${activeUserAssignment.seat.label}).`
      );
    }

    // 4. Create SeatAssignment record
    const assignment = await tx.seatAssignment.create({
      data: {
        seatId,
        userId,
        assignedByAdminId: admin.id,
        status: SeatAssignmentStatus.ACTIVE,
        startTime: new Date(),
        notes,
      },
    });

    // 5. Update Seat status
    await tx.seat.update({
      where: { id: seatId },
      data: { status: SeatStatus.OCCUPIED },
    });

    // 6. Audit Log
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
      },
    });

    return assignment;
  });
}

export async function releaseSeat(seatId: string, admin: { id: string; fullName: string }) {
  return await prisma.$transaction(async (tx) => {
    const seat = await tx.seat.findUnique({ where: { id: seatId } });
    if (!seat || seat.isArchived) {
      throw new Error('Seat not found.');
    }

    if (seat.status !== SeatStatus.OCCUPIED) {
      throw new Error(`Seat ${seat.label} is not currently occupied.`);
    }

    // Find active assignment
    const activeAssignment = await tx.seatAssignment.findFirst({
      where: { seatId, status: SeatAssignmentStatus.ACTIVE },
      include: { user: { select: { fullName: true } } },
    });

    if (activeAssignment) {
      await tx.seatAssignment.update({
        where: { id: activeAssignment.id },
        data: {
          status: SeatAssignmentStatus.RELEASED,
          endTime: new Date(),
        },
      });
    }

    // Reset seat status
    const updatedSeat = await tx.seat.update({
      where: { id: seatId },
      data: { status: SeatStatus.AVAILABLE },
    });

    await logActivity({
      actorId: admin.id,
      actorName: admin.fullName,
      actionType: 'SEAT_RELEASE',
      entityType: 'Seat',
      entityId: seat.id,
      metadata: {
        seatLabel: seat.label,
        releasedUser: activeAssignment?.user?.fullName || 'Unknown',
      },
    });

    return updatedSeat;
  });
}

export async function updateSeatStatus(
  seatId: string,
  newStatus: SeatStatus,
  admin: { id: string; fullName: string }
) {
  const seat = await prisma.seat.findUnique({ where: { id: seatId } });
  if (!seat || seat.isArchived) {
    throw new Error('Seat not found.');
  }

  if (seat.status === SeatStatus.OCCUPIED && newStatus === SeatStatus.MAINTENANCE) {
    throw new Error('Please release the active seat assignment before marking the seat for maintenance.');
  }

  const updated = await prisma.seat.update({
    where: { id: seatId },
    data: { status: newStatus },
  });

  await logActivity({
    actorId: admin.id,
    actorName: admin.fullName,
    actionType: 'SEAT_STATUS_CHANGE',
    entityType: 'Seat',
    entityId: seat.id,
    metadata: { seatLabel: seat.label, newStatus },
  });

  return updated;
}

export async function adjustSeatCapacity(
  targetCapacity: number,
  admin: { id: string; fullName: string }
) {
  if (targetCapacity < 1) {
    throw new Error('Capacity must be at least 1 seat.');
  }

  return await prisma.$transaction(async (tx) => {
    const currentSeats = await tx.seat.findMany({
      where: { isArchived: false },
      orderBy: { seatNumber: 'asc' },
    });

    const currentCapacity = currentSeats.length;

    if (targetCapacity === currentCapacity) {
      return { message: 'Capacity is already at target level.', totalSeats: currentCapacity };
    }

    if (targetCapacity > currentCapacity) {
      // Increase capacity: add seats
      const diff = targetCapacity - currentCapacity;
      const highestSeat = currentSeats[currentSeats.length - 1]?.seatNumber || 0;

      for (let i = 1; i <= diff; i++) {
        const nextNum = highestSeat + i;
        const label = `Seat ${nextNum < 10 ? '0' + nextNum : nextNum}`;
        await tx.seat.create({
          data: {
            seatNumber: nextNum,
            label,
            section: 'Main Hall',
            status: SeatStatus.AVAILABLE,
          },
        });
      }

      await logActivity({
        actorId: admin.id,
        actorName: admin.fullName,
        actionType: 'CAPACITY_INCREASE',
        entityType: 'Seat',
        metadata: { from: currentCapacity, to: targetCapacity, added: diff },
      });

      return {
        message: `Successfully increased capacity from ${currentCapacity} to ${targetCapacity}.`,
        totalSeats: targetCapacity,
      };
    } else {
      // Decrease capacity: safety checks!
      const occupiedSeatsCount = currentSeats.filter((s) => s.status === SeatStatus.OCCUPIED).length;

      if (targetCapacity < occupiedSeatsCount) {
        throw new Error(
          `Cannot reduce capacity to ${targetCapacity}. There are currently ${occupiedSeatsCount} occupied seats. Capacity cannot be lower than active occupancies.`
        );
      }

      const seatsToRemoveCount = currentCapacity - targetCapacity;

      // Find un-occupied seats starting from highest seat numbers (tail reduction)
      const eligibleSeats = currentSeats
        .filter((s) => s.status !== SeatStatus.OCCUPIED)
        .reverse()
        .slice(0, seatsToRemoveCount);

      if (eligibleSeats.length < seatsToRemoveCount) {
        throw new Error(
          `Cannot safely reduce capacity by ${seatsToRemoveCount}. Not enough un-occupied seats available to retire.`
        );
      }

      const eligibleIds = eligibleSeats.map((s) => s.id);

      // Soft-archive to preserve historical seat assignments
      await tx.seat.updateMany({
        where: { id: { in: eligibleIds } },
        data: { isArchived: true },
      });

      await logActivity({
        actorId: admin.id,
        actorName: admin.fullName,
        actionType: 'CAPACITY_DECREASE',
        entityType: 'Seat',
        metadata: {
          from: currentCapacity,
          to: targetCapacity,
          retiredSeatNumbers: eligibleSeats.map((s) => s.seatNumber),
        },
      });

      return {
        message: `Successfully reduced capacity from ${currentCapacity} to ${targetCapacity}.`,
        totalSeats: targetCapacity,
      };
    }
  });
}

export async function getSeatRequests(status?: SeatRequestStatus) {
  const where = status ? { status } : {};
  return await prisma.seatChangeRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          membershipNo: true,
          email: true,
          phone: true,
          status: true,
        },
      },
      currentSeat: {
        select: {
          id: true,
          seatNumber: true,
          label: true,
          section: true,
          status: true,
        },
      },
      requestedSeat: {
        select: {
          id: true,
          seatNumber: true,
          label: true,
          section: true,
          status: true,
        },
      },
      reviewedByAdmin: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });
}

export async function approveSeatRequest(
  requestId: string,
  admin: { id: string; fullName: string },
  adminNotes?: string
) {
  return await prisma.$transaction(async (tx) => {
    const request = await tx.seatChangeRequest.findUnique({
      where: { id: requestId },
      include: {
        user: true,
        currentSeat: true,
        requestedSeat: true,
      },
    });

    if (!request) {
      throw new Error('Seat change request not found.');
    }

    if (request.status !== SeatRequestStatus.PENDING) {
      throw new Error(`This request has already been ${request.status.toLowerCase()}.`);
    }

    // Check if the user is still active
    if (request.user.status !== UserStatus.ACTIVE) {
      throw new Error(`Cannot approve request: Patron account is currently ${request.user.status}.`);
    }

    // Verify requested seat is still AVAILABLE
    const targetSeat = await tx.seat.findUnique({ where: { id: request.requestedSeatId } });
    if (!targetSeat || targetSeat.isArchived) {
      throw new Error('Requested study seat no longer exists or has been decommissioned.');
    }
    if (targetSeat.status === SeatStatus.OCCUPIED) {
      throw new Error(`Cannot approve: Seat ${targetSeat.label} is currently occupied by another patron.`);
    }
    if (targetSeat.status === SeatStatus.MAINTENANCE) {
      throw new Error(`Cannot approve: Seat ${targetSeat.label} is currently under maintenance.`);
    }

    // Find user's active seat assignment(s)
    const activeAssignments = await tx.seatAssignment.findMany({
      where: { userId: request.userId, status: SeatAssignmentStatus.ACTIVE },
    });

    // Release existing active assignment(s) and free seat(s)
    for (const assignment of activeAssignments) {
      await tx.seatAssignment.update({
        where: { id: assignment.id },
        data: {
          status: SeatAssignmentStatus.RELEASED,
          endTime: new Date(),
          notes: `Released due to approved seat change to ${targetSeat.label}`,
        },
      });
      await tx.seat.update({
        where: { id: assignment.seatId },
        data: { status: SeatStatus.AVAILABLE },
      });
    }

    // Also free the currentSeat if it was still marked occupied
    if (request.currentSeatId && request.currentSeatId !== request.requestedSeatId) {
      await tx.seat.update({
        where: { id: request.currentSeatId },
        data: { status: SeatStatus.AVAILABLE },
      });
    }

    // Create new active seat assignment on requested seat
    const newAssignment = await tx.seatAssignment.create({
      data: {
        seatId: request.requestedSeatId,
        userId: request.userId,
        assignedByAdminId: admin.id,
        status: SeatAssignmentStatus.ACTIVE,
        startTime: new Date(),
        notes: `Assigned via approved seat change request: ${request.reason || 'None provided'}`,
      },
    });

    // Mark requested seat as OCCUPIED
    await tx.seat.update({
      where: { id: request.requestedSeatId },
      data: { status: SeatStatus.OCCUPIED },
    });

    // Update SeatChangeRequest to APPROVED
    const updatedRequest = await tx.seatChangeRequest.update({
      where: { id: requestId },
      data: {
        status: SeatRequestStatus.APPROVED,
        reviewedByAdminId: admin.id,
        adminNotes: adminNotes?.trim() || null,
      },
      include: {
        user: true,
        currentSeat: true,
        requestedSeat: true,
        reviewedByAdmin: true,
      },
    });

    // Audit log
    await logActivity({
      actorId: admin.id,
      actorName: admin.fullName,
      actionType: 'SEAT_REQUEST_APPROVED',
      entityType: 'SeatChangeRequest',
      entityId: requestId,
      metadata: {
        patronId: request.userId,
        patronName: request.user.fullName,
        fromSeat: request.currentSeat.label,
        toSeat: targetSeat.label,
        adminNotes,
      },
    });

    return { request: updatedRequest, assignment: newAssignment };
  });
}

export async function rejectSeatRequest(
  requestId: string,
  admin: { id: string; fullName: string },
  adminNotes?: string
) {
  return await prisma.$transaction(async (tx) => {
    const request = await tx.seatChangeRequest.findUnique({
      where: { id: requestId },
      include: {
        user: true,
        currentSeat: true,
        requestedSeat: true,
      },
    });

    if (!request) {
      throw new Error('Seat change request not found.');
    }

    if (request.status !== SeatRequestStatus.PENDING) {
      throw new Error(`This request has already been ${request.status.toLowerCase()}.`);
    }

    // Update SeatChangeRequest to REJECTED - user's seat is not changed!
    const updatedRequest = await tx.seatChangeRequest.update({
      where: { id: requestId },
      data: {
        status: SeatRequestStatus.REJECTED,
        reviewedByAdminId: admin.id,
        adminNotes: adminNotes?.trim() || null,
      },
      include: {
        user: true,
        currentSeat: true,
        requestedSeat: true,
        reviewedByAdmin: true,
      },
    });

    // Audit log
    await logActivity({
      actorId: admin.id,
      actorName: admin.fullName,
      actionType: 'SEAT_REQUEST_REJECTED',
      entityType: 'SeatChangeRequest',
      entityId: requestId,
      metadata: {
        patronId: request.userId,
        patronName: request.user.fullName,
        fromSeat: request.currentSeat.label,
        toSeat: request.requestedSeat.label,
        adminNotes,
      },
    });

    return updatedRequest;
  });
}
