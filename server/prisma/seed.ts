import { PrismaClient, BookType, CopyStatus, CopyCondition, UserStatus, IssueStatus, SeatStatus, SeatAssignmentStatus, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting LMS Database Seeding...');

  // 1. Initial Admin
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@library.local';
  const adminUsername = process.env.INITIAL_ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'AdminPassword123!';
  const adminName = process.env.INITIAL_ADMIN_NAME || 'System Administrator';

  let admin = await prisma.admin.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    admin = await prisma.admin.create({
      data: {
        email: adminEmail,
        username: adminUsername,
        passwordHash,
        fullName: adminName,
        role: Role.SUPERADMIN,
      },
    });
    console.log(`✅ Created initial admin: ${admin.email}`);
  } else {
    console.log(`ℹ️ Admin already exists: ${admin.email}`);
  }

  // 2. Library Settings
  const settings = await prisma.librarySettings.upsert({
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
  console.log(`✅ Configured library settings: ${settings.libraryName}`);

  // 3. Registered Users (Patrons)
  const userData = [
    { name: 'Alice Walker', email: 'alice.walker@example.com', phone: '+1-555-0101', status: UserStatus.ACTIVE, memNo: 'MEM-1001' },
    { name: 'Robert Chen', email: 'robert.chen@example.com', phone: '+1-555-0102', status: UserStatus.ACTIVE, memNo: 'MEM-1002' },
    { name: 'Sophia Rodriguez', email: 'sophia.r@example.com', phone: '+1-555-0103', status: UserStatus.ACTIVE, memNo: 'MEM-1003' },
    { name: 'David Kim', email: 'david.kim@example.com', phone: '+1-555-0104', status: UserStatus.ACTIVE, memNo: 'MEM-1004' },
    { name: 'Emma Watson', email: 'emma.watson@example.com', phone: '+1-555-0105', status: UserStatus.ACTIVE, memNo: 'MEM-1005' },
    { name: 'James Wilson', email: 'james.wilson@example.com', phone: '+1-555-0106', status: UserStatus.ACTIVE, memNo: 'MEM-1006' },
    { name: 'Olivia Martinez', email: 'olivia.m@example.com', phone: '+1-555-0107', status: UserStatus.ACTIVE, memNo: 'MEM-1007' },
    { name: 'Liam Johnson', email: 'liam.j@example.com', phone: '+1-555-0108', status: UserStatus.ACTIVE, memNo: 'MEM-1008' },
    { name: 'Maya Patel', email: 'maya.patel@example.com', phone: '+1-555-0109', status: UserStatus.INACTIVE, memNo: 'MEM-1009' },
    { name: 'Lucas Scott', email: 'lucas.scott@example.com', phone: '+1-555-0110', status: UserStatus.BLOCKED, memNo: 'MEM-1010' },
    { name: 'Grace Hopper', email: 'grace.hopper@example.com', phone: '+1-555-0111', status: UserStatus.ACTIVE, memNo: 'MEM-1011' },
    { name: 'Alan Turing', email: 'alan.turing@example.com', phone: '+1-555-0112', status: UserStatus.ACTIVE, memNo: 'MEM-1012' },
  ];

  const defaultUserPasswordHash = await bcrypt.hash('Library@123', 12);
  const createdUsers: any[] = [];
  for (const u of userData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { status: u.status, phone: u.phone, passwordHash: defaultUserPasswordHash },
      create: {
        fullName: u.name,
        email: u.email,
        phone: u.phone,
        membershipNo: u.memNo,
        status: u.status,
        passwordHash: defaultUserPasswordHash,
      },
    });
    createdUsers.push(user);
  }
  console.log(`✅ Seeded ${createdUsers.length} library users with default initial password.`);

  // 4. Books and Categories
  const bookCatalog = [
    {
      title: 'Designing Data-Intensive Applications',
      author: 'Martin Kleppmann',
      isbn: '978-1449373320',
      publisher: "O'Reilly Media",
      category: 'Computer Science',
      year: 2017,
      type: BookType.HYBRID,
      description: 'The definitive guide to the system architectures and reliability of large-scale distributed systems.',
    },
    {
      title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
      author: 'Robert C. Martin',
      isbn: '978-0132350884',
      publisher: 'Prentice Hall',
      category: 'Computer Science',
      year: 2008,
      type: BookType.PHYSICAL,
      description: 'Best practices for writing readable, maintainable, and robust code.',
    },
    {
      title: 'The Pragmatic Programmer: Your Journey To Mastery',
      author: 'David Thomas, Andrew Hunt',
      isbn: '978-0135957059',
      publisher: 'Addison-Wesley',
      category: 'Computer Science',
      year: 2019,
      type: BookType.HYBRID,
      description: 'Essential wisdom for developers striving for software craftsmanship.',
    },
    {
      title: 'Introduction to Algorithms (4th Edition)',
      author: 'Thomas H. Cormen, Charles E. Leiserson',
      isbn: '978-0262046305',
      publisher: 'MIT Press',
      category: 'Computer Science',
      year: 2022,
      type: BookType.PHYSICAL,
      description: 'A comprehensive textbook on modern algorithms and data structures.',
    },
    {
      title: 'Sapiens: A Brief History of Humankind',
      author: 'Yuval Noah Harari',
      isbn: '978-0062316097',
      publisher: 'Harper',
      category: 'History',
      year: 2015,
      type: BookType.PHYSICAL,
      description: 'A narrative of humanity’s creation and evolution from the Stone Age to Silicon Age.',
    },
    {
      title: 'Deep Work: Rules for Focused Success in a Distracted World',
      author: 'Cal Newport',
      isbn: '978-1455586691',
      publisher: 'Grand Central Publishing',
      category: 'Psychology',
      year: 2016,
      type: BookType.EBOOK,
      description: 'How to cultivate intense focus and eliminate distractions for peak cognitive performance.',
    },
    {
      title: 'Thinking, Fast and Slow',
      author: 'Daniel Kahneman',
      isbn: '978-0374533557',
      publisher: 'Farrar, Straus and Giroux',
      category: 'Psychology',
      year: 2011,
      type: BookType.PHYSICAL,
      description: 'Nobel laureate exploration of System 1 fast thinking and System 2 deliberate thinking.',
    },
    {
      title: 'Atomic Habits: An Easy & Proven Way to Build Good Habits',
      author: 'James Clear',
      isbn: '978-0735211292',
      publisher: 'Avery',
      category: 'Self-Help',
      year: 2018,
      type: BookType.HYBRID,
      description: 'Practical frameworks for continuous 1% improvement and breaking negative loops.',
    },
    {
      title: 'Structure and Interpretation of Computer Programs',
      author: 'Harold Abelson, Gerald Jay Sussman',
      isbn: '978-0262510875',
      publisher: 'MIT Press',
      category: 'Computer Science',
      year: 1996,
      type: BookType.EBOOK,
      description: 'Foundational computer science concepts using the Scheme programming language.',
    },
    {
      title: 'Cosmos',
      author: 'Carl Sagan',
      isbn: '978-0345539434',
      publisher: 'Ballantine Books',
      category: 'Science',
      year: 1980,
      type: BookType.PHYSICAL,
      description: 'A thrilling journey through the universe, science, civilization, and human destiny.',
    },
  ];

  const createdBooks: any[] = [];
  for (const b of bookCatalog) {
    const book = await prisma.book.upsert({
      where: { isbn: b.isbn },
      update: {
        title: b.title,
        author: b.author,
        category: b.category,
        bookType: b.type,
      },
      create: {
        title: b.title,
        author: b.author,
        isbn: b.isbn,
        publisher: b.publisher,
        category: b.category,
        publicationYear: b.year,
        bookType: b.type,
        description: b.description,
        language: 'English',
        ...(b.type === BookType.EBOOK || b.type === BookType.HYBRID
          ? {
              ebookFileName: `${b.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
              ebookFileSize: 4500000,
              ebookMimeType: 'application/pdf',
            }
          : {}),
      },
    });
    createdBooks.push(book);
  }
  console.log(`✅ Seeded ${createdBooks.length} book titles.`);

  // 5. Physical Book Copies
  // Only for PHYSICAL and HYBRID titles
  const physicalTitles = createdBooks.filter(
    (b) => b.bookType === BookType.PHYSICAL || b.bookType === BookType.HYBRID
  );

  let barcodeCounter = 1000;
  const createdCopies: any[] = [];

  for (const book of physicalTitles) {
    // Generate between 3 and 5 copies per physical book title
    const copyCount = 4;
    for (let i = 1; i <= copyCount; i++) {
      barcodeCounter++;
      const barcode = `BC-${barcodeCounter}`;
      const accessionNo = `ACC-${barcodeCounter}`;
      const shelf = `Shelf-${String.fromCharCode(65 + (barcodeCounter % 6))}-${(barcodeCounter % 5) + 1}`;

      const copy = await prisma.bookCopy.upsert({
        where: { barcode },
        update: {},
        create: {
          bookId: book.id,
          barcode,
          accessionNo,
          shelfLocation: shelf,
          condition: i === 4 ? CopyCondition.FAIR : CopyCondition.GOOD,
          status: CopyStatus.AVAILABLE,
        },
      });
      createdCopies.push(copy);
    }
  }
  console.log(`✅ Seeded ${createdCopies.length} physical book copies.`);

  // 6. Book Issues (Issue & Return Tracking)
  // Let's issue 4 copies to active users (making them BORROWED)
  const activePatrons = createdUsers.filter((u) => u.status === UserStatus.ACTIVE);

  const copiesToBorrow = createdCopies.slice(0, 4);
  for (let i = 0; i < copiesToBorrow.length; i++) {
    const copy = copiesToBorrow[i];
    const user = activePatrons[i % activePatrons.length];

    // Check if an issue record already exists
    const existingIssue = await prisma.bookIssue.findFirst({
      where: { copyId: copy.id, status: IssueStatus.ISSUED },
    });

    if (!existingIssue) {
      await prisma.$transaction([
        prisma.bookCopy.update({
          where: { id: copy.id },
          data: { status: CopyStatus.BORROWED },
        }),
        prisma.bookIssue.create({
          data: {
            copyId: copy.id,
            userId: user.id,
            issuedByAdminId: admin.id,
            status: IssueStatus.ISSUED,
            issueDate: new Date(Date.now() - (i + 1) * 86400000 * 3), // issued a few days ago
          },
        }),
      ]);
    }
  }

  // Also seed 1 copy in MAINTENANCE status
  if (createdCopies.length > 5) {
    await prisma.bookCopy.update({
      where: { id: createdCopies[4].id },
      data: { status: CopyStatus.MAINTENANCE, condition: CopyCondition.POOR },
    });
  }

  // Seed 4 returned historical issue records (for return history)
  if (createdCopies.length > 8) {
    const historicalCopy = createdCopies[6];
    const user = activePatrons[0];
    const existingReturned = await prisma.bookIssue.findFirst({
      where: { copyId: historicalCopy.id, status: IssueStatus.RETURNED },
    });
    if (!existingReturned) {
      await prisma.bookIssue.create({
        data: {
          copyId: historicalCopy.id,
          userId: user.id,
          issuedByAdminId: admin.id,
          status: IssueStatus.RETURNED,
          issueDate: new Date(Date.now() - 30 * 86400000),
          returnDate: new Date(Date.now() - 15 * 86400000),
          notes: 'Returned in good condition.',
        },
      });
    }
  }
  console.log('✅ Seeded active borrowings and historical issue records.');

  // 7. Library Seats & Real-time Grid
  const totalSeats = 30;
  const sections = ['Main Hall', 'Quiet Study', 'Tech Corner'];

  for (let seatNum = 1; seatNum <= totalSeats; seatNum++) {
    const section = sections[Math.floor((seatNum - 1) / 10)];
    await prisma.seat.upsert({
      where: { seatNumber: seatNum },
      update: {},
      create: {
        seatNumber: seatNum,
        label: `Seat ${seatNum < 10 ? '0' + seatNum : seatNum}`,
        section,
        status: SeatStatus.AVAILABLE,
      },
    });
  }

  // Assign 4 seats to active users
  const seatsToOccupy = [3, 7, 12, 19];
  for (let i = 0; i < seatsToOccupy.length; i++) {
    const seatNum = seatsToOccupy[i];
    const user = activePatrons[i + 2];
    const seat = await prisma.seat.findUnique({ where: { seatNumber: seatNum } });

    if (seat && user) {
      const existingAssignment = await prisma.seatAssignment.findFirst({
        where: { seatId: seat.id, status: SeatAssignmentStatus.ACTIVE },
      });

      if (!existingAssignment) {
        await prisma.$transaction([
          prisma.seat.update({
            where: { id: seat.id },
            data: { status: SeatStatus.OCCUPIED },
          }),
          prisma.seatAssignment.create({
            data: {
              seatId: seat.id,
              userId: user.id,
              assignedByAdminId: admin.id,
              status: SeatAssignmentStatus.ACTIVE,
              startTime: new Date(Date.now() - (i + 1) * 3600000 * 2),
            },
          }),
        ]);
      }
    }
  }

  // Mark 2 seats under maintenance
  await prisma.seat.update({
    where: { seatNumber: 15 },
    data: { status: SeatStatus.MAINTENANCE },
  });
  await prisma.seat.update({
    where: { seatNumber: 28 },
    data: { status: SeatStatus.MAINTENANCE },
  });

  console.log(`✅ Seeded ${totalSeats} library seats with active occupancies and maintenance states.`);

  // 8. Seed Audit Activity Logs
  const logEntries = [
    { action: 'ADMIN_LOGIN', entity: 'Admin', entityId: admin.id, meta: { ip: '127.0.0.1' } },
    { action: 'BOOK_CREATE', entity: 'Book', entityId: createdBooks[0].id, meta: { title: createdBooks[0].title } },
    { action: 'COPY_CREATE', entity: 'BookCopy', entityId: createdCopies[0].id, meta: { barcode: createdCopies[0].barcode } },
    { action: 'SEAT_ASSIGN', entity: 'Seat', entityId: 'Seat 03', meta: { user: activePatrons[2].fullName } },
    { action: 'BOOK_ISSUE', entity: 'BookIssue', entityId: copiesToBorrow[0].id, meta: { user: activePatrons[0].fullName } },
  ];

  for (const entry of logEntries) {
    await prisma.activityLog.create({
      data: {
        actorId: admin.id,
        actorName: admin.fullName,
        actionType: entry.action,
        entityType: entry.entity,
        entityId: entry.entityId,
        metadata: entry.meta,
      },
    });
  }
  console.log(`✅ Seeded initial audit logs.`);

  console.log('🎉 LMS Database Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
