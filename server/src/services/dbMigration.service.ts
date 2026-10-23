import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import { dbConfigManager, DatabaseCredentials } from '../config/dbConfigManager';
import { buildPgClientConfig, testDatabaseConnection, EXPECTED_LMS_TABLES } from './dbConnection.service';
import { prisma } from '../config/prisma';

export interface MigrationStepResult {
  step: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  message: string;
}

export interface InitializationResult {
  success: boolean;
  steps: MigrationStepResult[];
  message: string;
  error?: string;
}

// Complete DDL script matching Prisma schema definitions
export const LMS_SCHEMA_DDL = `
-- Enums
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "BookType" AS ENUM ('PHYSICAL', 'EBOOK', 'HYBRID');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "CopyStatus" AS ENUM ('AVAILABLE', 'BORROWED', 'MAINTENANCE', 'LOST', 'DAMAGED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "CopyCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "IssueStatus" AS ENUM ('ISSUED', 'RETURNED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "SeatStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "SeatAssignmentStatus" AS ENUM ('ACTIVE', 'RELEASED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "SeatRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1. Admins Table
CREATE TABLE IF NOT EXISTS "admins" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "username" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'ADMIN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY,
  "membershipNo" TEXT NOT NULL UNIQUE,
  "fullName" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "phone" TEXT,
  "address" TEXT,
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "users_status_idx" ON "users"("status");
CREATE INDEX IF NOT EXISTS "users_fullName_idx" ON "users"("fullName");

-- 3. Books Table
CREATE TABLE IF NOT EXISTS "books" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "author" TEXT NOT NULL,
  "isbn" TEXT NOT NULL UNIQUE,
  "publisher" TEXT,
  "category" TEXT NOT NULL,
  "description" TEXT,
  "publicationYear" INTEGER,
  "language" TEXT NOT NULL DEFAULT 'English',
  "coverImageUrl" TEXT,
  "bookType" "BookType" NOT NULL DEFAULT 'PHYSICAL',
  "ebookFileUrl" TEXT,
  "ebookFileName" TEXT,
  "ebookFileSize" INTEGER,
  "ebookMimeType" TEXT,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "books_title_idx" ON "books"("title");
CREATE INDEX IF NOT EXISTS "books_author_idx" ON "books"("author");
CREATE INDEX IF NOT EXISTS "books_category_idx" ON "books"("category");
CREATE INDEX IF NOT EXISTS "books_bookType_idx" ON "books"("bookType");
CREATE INDEX IF NOT EXISTS "books_isArchived_idx" ON "books"("isArchived");

-- 4. Book Copies Table
CREATE TABLE IF NOT EXISTS "book_copies" (
  "id" TEXT PRIMARY KEY,
  "bookId" TEXT NOT NULL REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "barcode" TEXT NOT NULL UNIQUE,
  "accessionNo" TEXT NOT NULL UNIQUE,
  "condition" "CopyCondition" NOT NULL DEFAULT 'GOOD',
  "shelfLocation" TEXT NOT NULL,
  "status" "CopyStatus" NOT NULL DEFAULT 'AVAILABLE',
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "book_copies_bookId_idx" ON "book_copies"("bookId");
CREATE INDEX IF NOT EXISTS "book_copies_status_idx" ON "book_copies"("status");
CREATE INDEX IF NOT EXISTS "book_copies_isArchived_idx" ON "book_copies"("isArchived");

-- 5. Book Issues Table
CREATE TABLE IF NOT EXISTS "book_issues" (
  "id" TEXT PRIMARY KEY,
  "copyId" TEXT NOT NULL REFERENCES "book_copies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "issuedByAdminId" TEXT NOT NULL REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "returnDate" TIMESTAMP(3),
  "status" "IssueStatus" NOT NULL DEFAULT 'ISSUED',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "book_issues_copyId_status_idx" ON "book_issues"("copyId", "status");
CREATE INDEX IF NOT EXISTS "book_issues_userId_status_idx" ON "book_issues"("userId", "status");
CREATE INDEX IF NOT EXISTS "book_issues_status_idx" ON "book_issues"("status");

-- 6. Seats Table
CREATE TABLE IF NOT EXISTS "seats" (
  "id" TEXT PRIMARY KEY,
  "seatNumber" INTEGER NOT NULL UNIQUE,
  "label" TEXT NOT NULL,
  "section" TEXT NOT NULL DEFAULT 'Main Hall',
  "status" "SeatStatus" NOT NULL DEFAULT 'AVAILABLE',
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "seats_status_idx" ON "seats"("status");
CREATE INDEX IF NOT EXISTS "seats_isArchived_idx" ON "seats"("isArchived");

-- 7. Seat Assignments Table
CREATE TABLE IF NOT EXISTS "seat_assignments" (
  "id" TEXT PRIMARY KEY,
  "seatId" TEXT NOT NULL REFERENCES "seats"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "assignedByAdminId" TEXT NOT NULL REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endTime" TIMESTAMP(3),
  "status" "SeatAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "seat_assignments_seatId_status_idx" ON "seat_assignments"("seatId", "status");
CREATE INDEX IF NOT EXISTS "seat_assignments_userId_status_idx" ON "seat_assignments"("userId", "status");

-- 8. Activity Logs Table
CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id" TEXT PRIMARY KEY,
  "actorId" TEXT NOT NULL REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "actorName" TEXT NOT NULL,
  "actionType" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "activity_logs_actionType_idx" ON "activity_logs"("actionType");
CREATE INDEX IF NOT EXISTS "activity_logs_entityType_idx" ON "activity_logs"("entityType");
CREATE INDEX IF NOT EXISTS "activity_logs_timestamp_idx" ON "activity_logs"("timestamp");

-- 9. Library Settings Table
CREATE TABLE IF NOT EXISTS "library_settings" (
  "id" TEXT PRIMARY KEY,
  "libraryName" TEXT NOT NULL DEFAULT 'City Central Library',
  "email" TEXT NOT NULL DEFAULT 'contact@citylibrary.org',
  "phone" TEXT NOT NULL DEFAULT '+1 (555) 019-2834',
  "address" TEXT NOT NULL DEFAULT '100 Library Square, Suite 400',
  "logoUrl" TEXT,
  "defaultLanguage" TEXT NOT NULL DEFAULT 'en',
  "defaultSeatCapacity" INTEGER NOT NULL DEFAULT 30,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. Seat Change Requests Table
CREATE TABLE IF NOT EXISTS "seat_change_requests" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "currentSeatId" TEXT NOT NULL REFERENCES "seats"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "requestedSeatId" TEXT NOT NULL REFERENCES "seats"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "reason" TEXT,
  "status" "SeatRequestStatus" NOT NULL DEFAULT 'PENDING',
  "adminNotes" TEXT,
  "reviewedByAdminId" TEXT REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "seat_change_requests_userId_status_idx" ON "seat_change_requests"("userId", "status");
CREATE INDEX IF NOT EXISTS "seat_change_requests_status_idx" ON "seat_change_requests"("status");
`;

/**
 * Initialize LMS Schema on target database
 */
export async function initializeDatabaseSchema(
  targetCreds?: DatabaseCredentials
): Promise<InitializationResult> {
  const creds = targetCreds || dbConfigManager.getActiveCredentials();
  if (!creds) {
    return {
      success: false,
      steps: [],
      message: 'No database credentials configured.',
      error: 'Missing credentials',
    };
  }

  const steps: MigrationStepResult[] = [];

  // Step 1: Pre-flight check
  steps.push({
    step: 'Verify Database Reachability & Privileges',
    status: 'PENDING',
    message: 'Testing connection and schema permissions...',
  });

  const test = await testDatabaseConnection(creds);
  if (!test.reachable) {
    steps[0].status = 'FAILED';
    steps[0].message = test.message;
    return {
      success: false,
      steps,
      message: 'Database connection failed during pre-flight verification.',
      error: test.message,
    };
  }

  if (!test.privileges.canCreate) {
    steps[0].status = 'FAILED';
    steps[0].message = 'PostgreSQL user lacks CREATE TABLE privilege on schema public.';
    return {
      success: false,
      steps,
      message: 'Insufficient database permissions to initialize schema.',
      error: 'Missing CREATE privilege',
    };
  }
  steps[0].status = 'SUCCESS';
  steps[0].message = 'Database is reachable and user holds CREATE TABLE privilege.';

  // Step 2: Compatibility Check
  steps.push({
    step: 'Inspect Existing Schema',
    status: 'PENDING',
    message: 'Inspecting existing tables...',
  });

  if (test.schemaStatus === 'INCOMPATIBLE') {
    steps[1].status = 'FAILED';
    steps[1].message = `Target database contains incompatible tables (${test.tables.join(', ')}). Aborting to prevent schema corruption.`;
    return {
      success: false,
      steps,
      message: 'Incompatible database schema detected. Please select an empty database or existing LMS database.',
      error: 'Incompatible schema',
    };
  }

  if (test.schemaStatus === 'COMPATIBLE') {
    steps[1].status = 'SUCCESS';
    steps[1].message = 'Compatible LMS tables already exist. Schema verified without data loss.';
    steps.push({
      step: 'Initialize Schema Tables & Enums',
      status: 'SKIPPED',
      message: 'All 9 LMS tables already present.',
    });
    return {
      success: true,
      steps,
      message: 'Database schema is already initialized and compatible.',
    };
  }

  steps[1].status = 'SUCCESS';
  steps[1].message = 'Database is empty. Safe to apply LMS schema.';

  // Step 3: Apply DDL
  steps.push({
    step: 'Create LMS Tables, Enums & Indexes',
    status: 'PENDING',
    message: 'Applying LMS schema DDL...',
  });

  const client = new Client(buildPgClientConfig(creds));
  try {
    await client.connect();
    await client.query(LMS_SCHEMA_DDL);

    // Insert default library settings if missing
    await client.query(`
      INSERT INTO "library_settings" ("id", "libraryName", "email", "phone", "address", "defaultLanguage", "defaultSeatCapacity", "updatedAt")
      VALUES ('default-settings', 'Metropolitan Central Library', 'contact@library.local', '+1 (555) 019-2834', '100 Library Square', 'en', 30, CURRENT_TIMESTAMP)
      ON CONFLICT ("id") DO NOTHING;
    `);

    steps[2].status = 'SUCCESS';
    steps[2].message = 'Successfully created all 9 LMS tables, enums, indexes, and default settings.';

    return {
      success: true,
      steps,
      message: 'Database schema successfully initialized.',
    };
  } catch (err: any) {
    steps[2].status = 'FAILED';
    steps[2].message = `DDL Execution failed: ${err.message}`;
    return {
      success: false,
      steps,
      message: 'Failed to apply schema DDL.',
      error: err.message,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

/**
 * Seed demo data safely into the active database without overwriting existing records
 */
export async function seedDemoData(): Promise<{ success: boolean; message: string; details: any }> {
  try {
    // 1. Ensure Library Settings
    await prisma.librarySettings.upsert({
      where: { id: 'default-settings' },
      update: {},
      create: {
        id: 'default-settings',
        libraryName: 'Metropolitan Central Library',
        email: 'info@metrolibrary.org',
        phone: '+1 (555) 234-5678',
        address: '742 Evergreen Terrace, Springfield, OR 97477',
        defaultLanguage: 'en',
        defaultSeatCapacity: 30,
      },
    });

    // 2. Demo Users
    const sampleUsers = [
      { name: 'Alice Walker', email: 'alice.walker@example.com', phone: '+1-555-0101', memNo: 'MEM-1001' },
      { name: 'Robert Chen', email: 'robert.chen@example.com', phone: '+1-555-0102', memNo: 'MEM-1002' },
      { name: 'Sophia Rodriguez', email: 'sophia.r@example.com', phone: '+1-555-0103', memNo: 'MEM-1003' },
      { name: 'David Kim', email: 'david.kim@example.com', phone: '+1-555-0104', memNo: 'MEM-1004' },
      { name: 'Emma Watson', email: 'emma.watson@example.com', phone: '+1-555-0105', memNo: 'MEM-1005' },
    ];

    let usersCreated = 0;
    for (const u of sampleUsers) {
      const existing = await prisma.user.findUnique({ where: { email: u.email } });
      if (!existing) {
        await prisma.user.create({
          data: {
            fullName: u.name,
            email: u.email,
            phone: u.phone,
            membershipNo: u.memNo,
            status: 'ACTIVE',
          },
        });
        usersCreated++;
      }
    }

    // 3. Demo Books
    const sampleBooks = [
      {
        title: 'Designing Data-Intensive Applications',
        author: 'Martin Kleppmann',
        isbn: '978-1449373320',
        publisher: "O'Reilly Media",
        category: 'Computer Science',
        year: 2017,
        copiesCount: 3,
      },
      {
        title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
        author: 'Robert C. Martin',
        isbn: '978-0132350884',
        publisher: 'Prentice Hall',
        category: 'Software Engineering',
        year: 2008,
        copiesCount: 2,
      },
      {
        title: 'The Pragmatic Programmer',
        author: 'Andrew Hunt & David Thomas',
        isbn: '978-0201616224',
        publisher: 'Addison-Wesley',
        category: 'Software Engineering',
        year: 1999,
        copiesCount: 2,
      },
    ];

    let booksCreated = 0;
    for (const b of sampleBooks) {
      const existing = await prisma.book.findUnique({ where: { isbn: b.isbn } });
      if (!existing) {
        const book = await prisma.book.create({
          data: {
            title: b.title,
            author: b.author,
            isbn: b.isbn,
            publisher: b.publisher,
            category: b.category,
            publicationYear: b.year,
            bookType: 'PHYSICAL',
          },
        });
        booksCreated++;

        for (let i = 1; i <= b.copiesCount; i++) {
          await prisma.bookCopy.create({
            data: {
              bookId: book.id,
              barcode: `BAR-${b.isbn.slice(-4)}-${i}`,
              accessionNo: `ACC-${b.isbn.slice(-4)}-${i}`,
              shelfLocation: `CS-A${i}`,
              status: 'AVAILABLE',
              condition: 'EXCELLENT',
            },
          });
        }
      }
    }

    // 4. Demo Seats
    let seatsCreated = 0;
    const seatCount = await prisma.seat.count();
    if (seatCount === 0) {
      for (let s = 1; s <= 20; s++) {
        await prisma.seat.create({
          data: {
            seatNumber: s,
            label: `Seat ${s}`,
            section: s <= 10 ? 'Main Hall - Section A' : 'Quiet Reading Room',
            status: 'AVAILABLE',
          },
        });
        seatsCreated++;
      }
    }

    return {
      success: true,
      message: 'Demo data seeding completed successfully.',
      details: { usersCreated, booksCreated, seatsCreated },
    };
  } catch (err: any) {
    console.error('[MigrationService] Demo seed failed:', err);
    return {
      success: false,
      message: `Demo seeding failed: ${err.message}`,
      details: {},
    };
  }
}
