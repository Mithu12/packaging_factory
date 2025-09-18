import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { MyLogger } from '@/utils/new-logger';

// Configure storage for expense receipts
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: Function) => {
    const uploadPath = path.join(process.cwd(), 'uploads', 'expenses');
    cb(null, uploadPath);
  },
  filename: (req: Request, file: Express.Multer.File, cb: Function) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = `expense-receipt-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

// File filter for images only
const fileFilter = (req: Request, file: Express.Multer.File, cb: Function) => {
  let action = 'Expense Receipt Upload Filter';
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

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only one file at a time
  }
});

// Middleware for single image upload
export const uploadExpenseReceipt = upload.single('receipt');

// Middleware for handling upload errors
export const handleExpenseUploadError = (error: any, req: Request, res: any, next: any) => {
  let action = 'Expense Upload Error Handler';
  
  if (error instanceof multer.MulterError) {
    MyLogger.error(action, error, { code: error.code });
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          error: {
            message: 'File too large',
            details: 'File size must be less than 5MB'
          }
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          error: {
            message: 'Too many files',
            details: 'Only one file is allowed'
          }
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          error: {
            message: 'Unexpected file field',
            details: 'File must be uploaded with field name "receipt"'
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
        details: 'Only image files are allowed'
      }
    });
  }
  
  MyLogger.error(action, error);
  next(error);
};

export default upload;
