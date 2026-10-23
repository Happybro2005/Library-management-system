import { prisma } from '../config/prisma';

interface LogOptions {
  actorId: string;
  actorName: string;
  actionType: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

export async function logActivity(options: LogOptions) {
  try {
    let validActorId = options.actorId;
    const adminExists = await prisma.admin.findUnique({ where: { id: options.actorId }, select: { id: true } });
    if (!adminExists) {
      const defaultAdmin = await prisma.admin.findFirst({ select: { id: true } });
      if (defaultAdmin) {
        validActorId = defaultAdmin.id;
      } else {
        return null;
      }
    }

    return await prisma.activityLog.create({
      data: {
        actorId: validActorId,
        actorName: options.actorName,
        actionType: options.actionType,
        entityType: options.entityType,
        entityId: options.entityId || null,
        metadata: options.metadata || {},
      },
    });
  } catch (err) {
    console.error('Failed to write activity log:', err);
    return null;
  }
}

export async function getActivityLogs(page = 1, limit = 20, actionType?: string) {
  const skip = (page - 1) * limit;
  const where = actionType ? { actionType } : {};

  const [total, logs] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
      include: {
        actor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
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
    logs,
  };
}
