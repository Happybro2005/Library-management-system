import { prisma } from '../config/prisma';
import { verifyPassword, hashPassword } from '../utils/password';
import { generateSessionToken } from '../utils/token';
import { AuthenticatedAdmin } from '../types';
import { logActivity } from './audit.service';

export async function loginAdmin(identifier: string, plainPassword: string) {
  // Support login via email or username
  const admin = await prisma.admin.findFirst({
    where: {
      OR: [
        { email: identifier.toLowerCase() },
        { username: identifier.toLowerCase() },
      ],
    },
  });

  if (!admin) {
    throw new Error('Invalid email/username or password.');
  }

  const isValid = await verifyPassword(plainPassword, admin.passwordHash);
  if (!isValid) {
    throw new Error('Invalid email/username or password.');
  }

  const authAdmin: AuthenticatedAdmin = {
    id: admin.id,
    email: admin.email,
    username: admin.username,
    fullName: admin.fullName,
    role: admin.role,
  };

  const token = generateSessionToken(authAdmin);

  await logActivity({
    actorId: admin.id,
    actorName: admin.fullName,
    actionType: 'ADMIN_LOGIN',
    entityType: 'Admin',
    entityId: admin.id,
    metadata: { email: admin.email },
  });

  return { token, admin: authAdmin };
}

export async function changeAdminPassword(
  adminId: string,
  currentPassword: string,
  newPassword: string
) {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) {
    throw new Error('Admin not found.');
  }

  const isValid = await verifyPassword(currentPassword, admin.passwordHash);
  if (!isValid) {
    throw new Error('Incorrect current password.');
  }

  const newHash = await hashPassword(newPassword);

  await prisma.admin.update({
    where: { id: adminId },
    data: { passwordHash: newHash },
  });

  await logActivity({
    actorId: admin.id,
    actorName: admin.fullName,
    actionType: 'PASSWORD_CHANGE',
    entityType: 'Admin',
    entityId: admin.id,
  });

  return { success: true };
}

export async function getAdminProfile(adminId: string) {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: {
      id: true,
      email: true,
      username: true,
      fullName: true,
      role: true,
      createdAt: true,
    },
  });
  if (!admin) {
    throw new Error('Admin not found.');
  }
  return admin;
}
