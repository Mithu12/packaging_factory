import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { serializeSuccessResponse } from '@/utils/responseHelper';
import { MyLogger } from '@/utils/new-logger';
import { authenticate } from '@/middleware/auth';
import { requirePermission, PERMISSIONS } from '@/middleware/permission';

const execPromise = promisify(exec);
const router = express.Router();

const BACKUP_DIR = path.join(process.cwd(), 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// @route   POST /api/backup
// @desc    Create a new database backup
// @access  Private (System Admin/Backup permission)
router.post('/', 
  authenticate,
  requirePermission(PERMISSIONS.SYSTEM_BACKUP || PERMISSIONS.SYSTEM_ADMIN),
  expressAsyncHandler(async (req, res, next) => {
    const action = 'Create DB Backup';
    const timestamp = new Date(Date.now() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, -1).replace(/[:.]/g, '-');
    const filename = `backup-${req.user?.user_id}-${process.env.DB_NAME}-${timestamp}.sql`;
    const backupPath = path.join(BACKUP_DIR, filename);

    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbName = process.env.DB_NAME || 'erp';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPass = process.env.DB_PASSWORD || 'password';

    MyLogger.info(action, { filename });

    try {
      const command = `PGPASSWORD="${dbPass}" pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f "${backupPath}"`;
      
      await execPromise(command);

      const stats = fs.statSync(backupPath);
      
      MyLogger.success(action, { filename, size: stats.size });
      serializeSuccessResponse(res, { filename, size: stats.size, createdAt: stats.birthtime }, 'Backup created successfully');
    } catch (error) {
      MyLogger.error(action, error);
      next(error);
    }
}));

// @route   GET /api/backup
// @desc    List all database backups
// @access  Private
router.get('/', 
  authenticate,
  requirePermission(PERMISSIONS.SYSTEM_BACKUP || PERMISSIONS.SYSTEM_ADMIN),
  expressAsyncHandler(async (req, res) => {
    const action = 'List DB Backups';
    MyLogger.info(action);

    try {
      const files = fs.readdirSync(BACKUP_DIR);
      const backups = files
        .filter(file => file.endsWith('.sql'))
        .map(file => {
          const stats = fs.statSync(path.join(BACKUP_DIR, file));
          return {
            filename: file,
            size: stats.size,
            createdAt: stats.mtime
          };
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      serializeSuccessResponse(res, backups, 'Backups retrieved successfully');
    } catch (error) {
      MyLogger.error(action, error);
      res.status(500).json({ success: false, message: 'Failed to list backups' });
    }
}));

// @route   GET /api/backup/:filename/download
// @desc    Download a backup file
// @access  Private
router.get('/:filename/download', 
  authenticate,
  requirePermission(PERMISSIONS.SYSTEM_BACKUP || PERMISSIONS.SYSTEM_ADMIN),
  expressAsyncHandler(async (req, res) => {
    const { filename } = req.params;
    const backupPath = path.join(BACKUP_DIR, filename);

    if (!fs.existsSync(backupPath)) {
      res.status(404).json({ success: false, message: 'Backup file not found' });
      return;
    }

    MyLogger.info('Download DB Backup', { filename });
    res.download(backupPath);
}));

// @route   POST /api/backup/:filename/restore
// @desc    Restore database from a backup file
// @access  Private
router.post('/:filename/restore', 
  authenticate,
  requirePermission(PERMISSIONS.SYSTEM_BACKUP || PERMISSIONS.SYSTEM_ADMIN),
  expressAsyncHandler(async (req, res, next) => {
    const { filename } = req.params;
    const backupPath = path.join(BACKUP_DIR, filename);
    const action = 'Restore DB Backup';

    if (!fs.existsSync(backupPath)) {
      res.status(404).json({ success: false, message: 'Backup file not found' });
      return;
    }

    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbName = process.env.DB_NAME || 'erp_system';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPass = process.env.DB_PASSWORD || 'password';

    MyLogger.warn(action, { filename });

    try {
      const dropSchemaCmd = `PGPASSWORD="${dbPass}" psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`;
      const restoreCmd = `PGPASSWORD="${dbPass}" psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f "${backupPath}"`;
      
      await execPromise(dropSchemaCmd);
      await execPromise(restoreCmd);

      MyLogger.success(action, { filename });
      serializeSuccessResponse(res, null, 'Database restored successfully');
    } catch (error) {
      MyLogger.error(action, error);
      next(error);
    }
}));

// @route   DELETE /api/backup/:filename
// @desc    Delete a backup file
// @access  Private
router.delete('/:filename', 
  authenticate,
  requirePermission(PERMISSIONS.SYSTEM_BACKUP || PERMISSIONS.SYSTEM_ADMIN),
  expressAsyncHandler(async (req, res) => {
    const { filename } = req.params;
    const backupPath = path.join(BACKUP_DIR, filename);

    if (!fs.existsSync(backupPath)) {
      res.status(404).json({ success: false, message: 'Backup file not found' });
      return;
    }

    try {
      fs.unlinkSync(backupPath);
      MyLogger.info('Delete DB Backup', { filename });
      serializeSuccessResponse(res, null, 'Backup deleted successfully');
    } catch (error) {
      MyLogger.error('Delete DB Backup Error', error);
      res.status(500).json({ success: false, message: 'Failed to delete backup' });
    }
}));

export default router;
