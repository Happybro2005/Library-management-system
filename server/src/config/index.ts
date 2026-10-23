import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres@localhost:5433/library_db?schema=public',
  sessionSecret: process.env.SESSION_SECRET || 'lms-dev-session-secret-key-32-chars-minimum-needed',
  cookieSecret: process.env.COOKIE_SECRET || 'lms-dev-cookie-secret-key-32-chars-minimum-needed',
  initialAdmin: {
    email: process.env.INITIAL_ADMIN_EMAIL || 'admin@library.local',
    username: process.env.INITIAL_ADMIN_USERNAME || 'admin',
    password: process.env.INITIAL_ADMIN_PASSWORD || 'AdminPassword123!',
    fullName: process.env.INITIAL_ADMIN_NAME || 'System Administrator',
  },
  upload: {
    dir: path.resolve(__dirname, '../../', process.env.UPLOAD_DIR || 'uploads'),
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10),
  }
};
