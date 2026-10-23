import { prisma } from '../config/prisma';
import { logActivity } from './audit.service';

export async function getLibrarySettings() {
  let settings = await prisma.librarySettings.findUnique({
    where: { id: 'default-settings' },
  });

  if (!settings) {
    settings = await prisma.librarySettings.create({
      data: {
        id: 'default-settings',
        libraryName: 'Metropolitan Central Library',
        email: 'info@metrolibrary.org',
        phone: '+1 (555) 234-5678',
        address: '742 Evergreen Terrace, Springfield, OR 97477',
        defaultLanguage: 'en',
        defaultSeatCapacity: 30,
      },
    });
  }

  return settings;
}

export async function updateLibrarySettings(
  data: Partial<{
    libraryName: string;
    email: string;
    phone: string;
    address: string;
    logoUrl: string;
    defaultLanguage: string;
    defaultSeatCapacity: number;
  }>,
  admin: { id: string; fullName: string }
) {
  const updated = await prisma.librarySettings.upsert({
    where: { id: 'default-settings' },
    update: data,
    create: {
      id: 'default-settings',
      libraryName: data.libraryName || 'Metropolitan Central Library',
      email: data.email || 'info@metrolibrary.org',
      phone: data.phone || '+1 (555) 234-5678',
      address: data.address || '742 Evergreen Terrace, Springfield, OR 97477',
      defaultLanguage: data.defaultLanguage || 'en',
      defaultSeatCapacity: data.defaultSeatCapacity || 30,
      logoUrl: data.logoUrl,
    },
  });

  await logActivity({
    actorId: admin.id,
    actorName: admin.fullName,
    actionType: 'SETTINGS_UPDATE',
    entityType: 'LibrarySettings',
    entityId: updated.id,
    metadata: { libraryName: updated.libraryName },
  });

  return updated;
}
