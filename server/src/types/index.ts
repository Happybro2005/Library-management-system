import { Request } from 'express';
import { Role } from '@prisma/client';

export interface AuthenticatedAdmin {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: Role;
}

export interface AuthenticatedPatron {
  id: string;
  membershipNo: string;
  fullName: string;
  email: string;
  status?: string;
  isAdminViewing?: boolean;
}

export interface AuthenticatedRequest extends Request {
  admin?: AuthenticatedAdmin;
  patron?: AuthenticatedPatron;
}
