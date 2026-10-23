# Library Management System (LMS) - Enterprise Administration

An enterprise-grade Library Management System designed for modern institutions, built with **React 18, TypeScript, Vite, Express.js, PostgreSQL, and Prisma ORM**.

---

## 🌟 Key Features

- **Dynamic PostgreSQL Database Setup**: Connect and configure any PostgreSQL database at runtime without server restarts or hardcoded environment dependencies.
- **Guided First-Run Setup Wizard**: Step-by-step wizard for configuring database credentials, testing reachability, validating schema compatibility, and provisioning the primary administrator.
- **Runtime Connection Reconfiguration**: Switch between PostgreSQL databases securely through the Admin Settings page with re-authentication guards and automatic rollback protection.
- **Enterprise Security**:
  - Sensitive database credentials encrypted at rest using **AES-256-GCM**.
  - Server-Side Request Forgery (**SSRF**) protection: blocks cloud metadata services (`169.254.169.254`, `metadata.google.internal`) and restricted service ports.
  - Rate limiting on setup endpoints to mitigate brute force probing.
  - Zero password leakage: passwords are never stored in browser storage, returned in API payloads, or printed in logs.
- **Catalog & Circulation Management**:
  - Book catalog management with ISBN tracking, categories, and cover images.
  - Physical copy inventory with unique barcodes, accession numbers, and shelf locations.
  - Digital repository for E-Books with in-browser streaming and upload.
  - Simple book issues and returns with patron tracking.
  - Interactive visual Study Seat Hall map (30 desks) with live assignment and release.
  - Real-time audit activity logs and statistical circulation reports.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts, Axios |
| **Backend** | Express.js, TypeScript, tsx, Cookie-Parser, Helmet, CORS, Express-Rate-Limit, Zod |
| **Database & ORM** | PostgreSQL 18+, Prisma ORM v6, node-postgres (`pg`) driver |
| **Testing** | Vitest, Supertest |
| **Security** | Node crypto (`aes-256-gcm`), bcryptjs, HMAC SHA-256 tokens |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v18+ (tested on Node.js v25)
- **PostgreSQL** 14+ (local instance or cloud database such as Supabase, Neon, AWS RDS, GCP Cloud SQL)

### 2. Installation

Install dependencies from the workspace root:

```bash
# In server directory
cd server
npm install

# In client directory
cd ../client
npm install
```

### 3. Environment Variables

Create `server/.env` (or copy from `server/.env.example`):

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres@localhost:5433/library_db?schema=public"
SESSION_SECRET="super-secure-lms-admin-session-secret-key-32-chars-min"
COOKIE_SECRET="super-secure-lms-admin-cookie-secret-key-32-chars-min"
DB_ENCRYPTION_KEY="super-secure-db-credentials-encryption-key-32-chars"
INITIAL_ADMIN_EMAIL="admin@library.local"
INITIAL_ADMIN_USERNAME="admin"
INITIAL_ADMIN_PASSWORD="AdminPassword123!"
INITIAL_ADMIN_NAME="System Administrator"
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE_MB=50
```

### 4. Running the Development Servers

From the root directory:

```bash
# Run both backend (port 5000) and frontend (port 3000) concurrently
npm run dev

# Or run separately:
npm run dev:server
npm run dev:client
```

Open `http://localhost:3000` in your web browser.

---

## 🗄️ Database Connection Setup Feature

### 1. First-Run Guided Setup Wizard (`/setup`)

When launching the LMS on a fresh deployment:
1. **Welcome**: System overview.
2. **Configure PostgreSQL**: Enter Host, Port (`5432`), Database Name, Username, Password, and SSL Mode.
3. **Test Connection**: Validates database reachability, network latency, and privileges (`CONNECT`, `CREATE`).
4. **Save Configuration**: Encrypts credentials with AES-256-GCM to disk (`server/data/db-credentials.enc.json`).
5. **Initialize Schema**: Automatically executes version-controlled DDL for all 9 LMS tables, enums, and foreign keys. Optionally seeds demo books, copies, patrons, and seats.
6. **Provision Primary Admin**: Creates the initial Superadministrator account.
7. **Complete**: Success confirmation and direct redirect to the Admin Login page.

### 2. Changing Databases Later (`/database-config`)

Authorized administrators can switch database configurations at any time from **Settings → Database Configuration** or by navigating to `/database-config`:
- **Safety Confirmation**: Explicit modal warning that the application will switch data sources.
- **Admin Re-Authentication**: Requires re-entering current administrator password before switching.
- **Atomic Swap with Rollback**: If the new database connection test or Prisma reconfiguration fails, the previous configuration is automatically restored with zero downtime.

---

## 🛡️ Security Implementation Details

1. **Credential Encryption at Rest**:
   - Encrypted with AES-256-GCM.
   - Decryption key derived from `DB_ENCRYPTION_KEY` or `SESSION_SECRET`.
   - File permissions locked down to `0600`.
   - Ignored in `.gitignore` so secrets are never committed to version control.
2. **SSRF & Dangerous Port Prevention**:
   - Prohibits cloud metadata IP addresses (`169.254.169.254`, `metadata.google.internal`).
   - Disallows connection attempts to non-database ports (22 SSH, 25 SMTP, 80 HTTP, 443 HTTPS, 3389 RDP).
3. **Prisma Dynamic Connection Swapping**:
   - Dynamic Proxy pattern around `PrismaClient` enables hot-swapping connection strings at runtime without restarting Express.
4. **Graceful Disconnection & Error Handling**:
   - Database disconnections return safe HTTP 503 Service Unavailable responses with friendly guidance, preventing server crashes or raw SQL error leaks.

---

## 📡 API Endpoints Reference

### Database Setup (`/api/setup`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/setup/database/status` | Returns sanitized connection status, active host, port, db name, and schema state. Passwords are never returned. | No |
| `POST` | `/api/setup/database/test` | Tests connectivity and privileges with `pg.Client` without saving. | No (Rate Limited) |
| `POST` | `/api/setup/database/connect` | Saves encrypted credentials and reconfigures active Prisma client. | First-run OR Admin Password Re-auth |
| `POST` | `/api/setup/database/initialize` | Executes schema DDL to create tables/enums on an empty database. | First-run OR Admin |
| `POST` | `/api/setup/database/seed` | Seeds sample books, copies, seats, and patrons. | First-run OR Admin |
| `POST` | `/api/setup/database/disconnect` | Gracefully closes active connection pool and unconfigures system. | Yes (Admin) |
| `POST` | `/api/setup/admin` | Creates initial primary administrator during first-run. | First-run Only |

---

## 🧪 Automated Testing

Run the test suite using `vitest`:

```bash
cd server
npm test
```

### Test Coverage:
- `src/__tests__/dbConfigManager.test.ts`: AES-256-GCM encryption/decryption, sanitized outputs (zero password exposure), connection string parsing, backup, and rollback.
- `src/__tests__/dbConnection.test.ts`: SSRF protection against cloud metadata IPs, port boundaries, connection timeouts, unavailable servers, and live PostgreSQL tests.
- `src/__tests__/setupApi.test.ts`: `/api/setup` endpoint validation, security headers, unauthenticated restrictions, and credential redaction.
- `src/__tests__/dbMigration.test.ts`: DDL verification for all 9 models and schema compatibility checks.

---

## ☁️ Managed Cloud Deployment Notes

When deploying on managed cloud providers (e.g., Railway, Render, Fly.io, AWS ECS):
- **Set Environment Variable**: Configure `DB_ENCRYPTION_KEY` in your production secret manager.
- **SSL Configuration**: For managed PostgreSQL services (AWS RDS, GCP Cloud SQL, Supabase, Neon), set **SSL Mode** to `Required` or `Verify-CA`.
- **Outbound Firewall**: Ensure your cloud host has outbound access to the target PostgreSQL port (typically `5432`).
