import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { MyLogger } from '@/utils/new-logger';

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads', 'settings');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage for settings uploads (like invoice logo)
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: Function) => {
    cb(null, uploadDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb: Function) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = `invoice-logo-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

// File filter for images only
const fileFilter = (req: Request, file: Express.Multer.File, cb: Function) => {
  let action = 'Settings Logo Upload Filter';
  try {
    MyLogger.info(action, { 
      originalName: file.originalname, 
      mimetype: file.mimetype,
      size: file.size 
    });

    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      MyLogger.success(action, { message: 'File accepted', mimetype: file.mimetype });
      cb(null, true);
    } else {
      MyLogger.warn(action, { message: 'File rejected - not an image', mimetype: file.mimetype });
      cb(new Error('Only image files are allowed'), false);
    }
  } catch (error: any) {
    MyLogger.error(action, error);
    cb(error, false);
  }
};

// Configure multer for logo upload
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit for logos
    files: 1 // Only one file at a time
  }
});

// Middleware for single logo upload
export const uploadInvoiceLogo = upload.single('logo');

// Middleware for handling upload errors
export const handleLogoUploadError = (error: any, req: Request, res: any, next: any) => {
  let action = 'Logo Upload Error Handler';
  
  if (error instanceof multer.MulterError) {
    MyLogger.error(action, error, { code: error.code });
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          error: {
            message: 'File too large',
            details: 'Logo file size must be less than 2MB'
          }
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          error: {
            message: 'Too many files',
            details: 'Only one logo file is allowed'
          }
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          error: {
            message: 'Unexpected file field',
            details: 'Logo must be uploaded with field name "logo"'
          }
        });
      default:
        return res.status(400).json({
          error: {
            message: 'Upload error',
            details: error.message
          }
        });
    }
  }
  
  if (error.message === 'Only image files are allowed') {
    MyLogger.error(action, error);
    return res.status(400).json({
      error: {
        message: 'Invalid file type',
        details: 'Only image files (PNG, JPG, JPEG, SVG) are allowed for logos'
      }
    });
  }
  
  MyLogger.error(action, error);
  next(error);
};

export default upload;
