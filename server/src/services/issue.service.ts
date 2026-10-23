import { prisma } from '../config/prisma';
import { CopyStatus, UserStatus, IssueStatus, CopyCondition } from '@prisma/client';
import { logActivity } from './audit.service';

export async function getBookIssues(params: {
  status?: IssueStatus;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 10));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (params.status) {
    where.status = params.status;
  }

  if (params.search) {
    where.OR = [
      { copy: { barcode: { contains: params.search, mode: 'insensitive' } } },
      { copy: { book: { title: { contains: params.search, mode: 'insensitive' } } } },
      { user: { fullName: { contains: params.search, mode: 'insensitive' } } },
      { user: { membershipNo: { contains: params.search, mode: 'insensitive' } } },
    ];
  }

  const [total, issues] = await Promise.all([
    prisma.bookIssue.count({ where }),
    prisma.bookIssue.findMany({
      where,
      orderBy: { issueDate: 'desc' },
      skip,
      take: limit,
      include: {
        copy: {
          include: {
            book: {
              select: {
                id: true,
                title: true,
                author: true,
                isbn: true,
                coverImageUrl: true,
              },
            },
          },
        },
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
        issuedByAdmin: {
          select: {
            fullName: true,
          },
        },
      },
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    issues,
  };
}

export async function issueBookCopy(
  copyId: string,
  userId: string,
  admin: { id: string; fullName: string },
  notes?: string
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Validate User eligibility
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found.');
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new Error(`Cannot issue books to patron with account status "${user.status}".`);
    }

    // 2. Validate Copy availability
    const copy = await tx.bookCopy.findUnique({
      where: { id: copyId },
      include: { book: { select: { title: true } } },
    });
    if (!copy || copy.isArchived) {
      throw new Error('Book copy not found.');
    }
    if (copy.status !== CopyStatus.AVAILABLE) {
      throw new Error(`Copy "${copy.barcode}" is not available for issue (current status: ${copy.status}).`);
    }

    // 3. Double-check no active issue exists for this copy
    const activeIssue = await tx.bookIssue.findFirst({
      where: { copyId, status: IssueStatus.ISSUED },
    });
    if (activeIssue) {
      throw new Error(`Copy "${copy.barcode}" already has an active issue record.`);
    }

    // 4. Create Issue record
    const issue = await tx.bookIssue.create({
      data: {
        copyId,
        userId,
        issuedByAdminId: admin.id,
        status: IssueStatus.ISSUED,
        issueDate: new Date(),
        notes,
      },
      include: {
        copy: { include: { book: true } },
        user: true,
      },
    });

    // 5. Update Copy status to BORROWED
    await tx.bookCopy.update({
      where: { id: copyId },
      data: { status: CopyStatus.BORROWED },
    });

    // 6. Audit Log
    await logActivity({
      actorId: admin.id,
      actorName: admin.fullName,
      actionType: 'BOOK_ISSUE',
      entityType: 'BookIssue',
      entityId: issue.id,
      metadata: {
        barcode: copy.barcode,
        bookTitle: copy.book.title,
        patronName: user.fullName,
        membershipNo: user.membershipNo,
      },
    });

    return issue;
  });
}

export async function returnBookCopy(
  issueId: string,
  admin: { id: string; fullName: string },
  options?: {
    returnCondition?: CopyCondition;
    targetStatus?: CopyStatus; // default AVAILABLE, or MAINTENANCE / DAMAGED
    notes?: string;
  }
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Find active issue record
    const issue = await tx.bookIssue.findUnique({
      where: { id: issueId },
      include: {
        copy: { include: { book: { select: { title: true } } } },
        user: { select: { fullName: true } },
      },
    });

    if (!issue) {
      throw new Error('Issue record not found.');
    }

    if (issue.status === IssueStatus.RETURNED) {
      throw new Error('This book copy has already been returned.');
    }

    const nextCopyStatus = options?.targetStatus || CopyStatus.AVAILABLE;

    // 2. Mark issue as RETURNED
    const updatedIssue = await tx.bookIssue.update({
      where: { id: issueId },
      data: {
        status: IssueStatus.RETURNED,
        returnDate: new Date(),
        notes: options?.notes ? `${issue.notes ? issue.notes + ' | ' : ''}${options.notes}` : issue.notes,
      },
    });

    // 3. Update copy status and condition
    await tx.bookCopy.update({
      where: { id: issue.copyId },
      data: {
        status: nextCopyStatus,
        ...(options?.returnCondition ? { condition: options.returnCondition } : {}),
      },
    });

    // 4. Audit Log
    await logActivity({
      actorId: admin.id,
      actorName: admin.fullName,
      actionType: 'BOOK_RETURN',
      entityType: 'BookIssue',
      entityId: issue.id,
      metadata: {
        barcode: issue.copy.barcode,
        bookTitle: issue.copy.book.title,
        patronName: issue.user.fullName,
        condition: options?.returnCondition || issue.copy.condition,
        finalStatus: nextCopyStatus,
      },
    });

    return updatedIssue;
  });
}
