import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { config } from '../config';

const coversDir = path.join(config.upload.dir, 'covers');
const ebooksDir = path.join(config.upload.dir, 'ebooks');

// Ensure directories exist
fs.mkdirSync(coversDir, { recursive: true });
fs.mkdirSync(ebooksDir, { recursive: true });

const coverStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, coversDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${crypto.randomUUID()}${ext}`;
    cb(null, safeName);
  },
});

const ebookStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, ebooksDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${crypto.randomUUID()}${ext}`;
    cb(null, safeName);
  },
});

export const uploadCover = multer({
  storage: coverStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB for cover art
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid cover format. Only JPG, PNG, and WebP are allowed.'));
    }
  },
});

export const uploadEbook = multer({
  storage: ebookStorage,
  limits: { fileSize: config.upload.maxFileSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/epub+zip',
      'application/octet-stream',
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(file.mimetype) || ['.pdf', '.epub'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid e-book format. Only PDF and EPUB files are supported.'));
    }
  },
});
