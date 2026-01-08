import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import path from 'path';
import fs from 'fs';
import { serializeSuccessResponse } from '@/utils/responseHelper';
import SettingsMediator from '@/mediators/settings/SettingsMediator';
import { validateSettings } from '@/validation/settingsValidation';
import { MyLogger } from '@/utils/new-logger';
import { authenticate } from '@/middleware/auth';
import { requirePermission, requireSystemAdmin, PERMISSIONS } from '@/middleware/permission';
import { auditMiddleware } from '@/middleware/audit';
import { uploadInvoiceLogo, handleLogoUploadError } from '@/middleware/settingsUpload';

const router = express.Router();
const settingsMediator = new SettingsMediator();

// Get all settings
router.get('/', 
  authenticate,
  requirePermission(PERMISSIONS.SETTINGS_READ),
  expressAsyncHandler(async (req, res, next) => {
  let action = 'Get All Settings API'
  MyLogger.info(action)
  
  try {
    const settings = await settingsMediator.getAllSettings();
    serializeSuccessResponse(res, settings, 'SUCCESS');
  } catch (error) {
    MyLogger.error(action, error)
    next(error);
  }
}));

// Get settings by category
router.get('/:category', 
  authenticate,
  requirePermission(PERMISSIONS.SETTINGS_READ),
  expressAsyncHandler(async (req, res, next) => {
  let action = 'Get Settings By Category API'
  const { category } = req.params;
  
  MyLogger.info(action, { category })
  
  try {
    const settings = await settingsMediator.getSettingsByCategory(category);
    serializeSuccessResponse(res, settings, 'SUCCESS');
  } catch (error) {
    MyLogger.error(action, error)
    next(error);
  }
}));

// Get a specific setting
router.get('/:category/:key', 
  authenticate,
  requirePermission(PERMISSIONS.SETTINGS_READ),
  expressAsyncHandler(async (req, res, next) => {
  let action = 'Get Setting API'
  const { category, key } = req.params;
  
  MyLogger.info(action, { category, key })
  
  try {
    const setting = await settingsMediator.getSetting(category, key);
    if (!setting) {
      res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
      return;
    }
    serializeSuccessResponse(res, setting, 'SUCCESS');
  } catch (error) {
    MyLogger.error(action, error)
    next(error);
  }
}));

// Create or update a setting
router.post('/', 
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.SETTINGS_UPDATE),
  expressAsyncHandler(async (req, res, next) => {
  let action = 'Create/Update Setting API'
  MyLogger.info(action, req.body)
  
  try {
    // Validate request body
    const { error, value } = validateSettings(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
      return;
    }

    const setting = await settingsMediator.setSetting(value);
    serializeSuccessResponse(res, setting, 'Setting created/updated successfully');
  } catch (error) {
    MyLogger.error(action, error)
    next(error);
  }
}));

// Update multiple settings in a category
router.put('/:category', 
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.SETTINGS_UPDATE),
  expressAsyncHandler(async (req, res, next) => {
  let action = 'Update Settings Category API'
  const { category } = req.params;
  
  MyLogger.info(action, { category, settingsCount: Object.keys(req.body).length })
  
  try {
    const settings = await settingsMediator.updateSettings(category, req.body);
    serializeSuccessResponse(res, settings, 'Settings updated successfully');
  } catch (error) {
    MyLogger.error(action, error)
    next(error);
  }
}));

// Delete a setting
router.delete('/:category/:key', 
  authenticate,
  auditMiddleware,
  requireSystemAdmin(),
  expressAsyncHandler(async (req, res, next) => {
  let action = 'Delete Setting API'
  const { category, key } = req.params;
  
  MyLogger.info(action, { category, key })
  
  try {
    await settingsMediator.deleteSetting(category, key);
    serializeSuccessResponse(res, null, 'Setting deleted successfully');
  } catch (error) {
    MyLogger.error(action, error)
    next(error);
  }
}));

// Initialize default settings
router.post('/initialize', 
  authenticate,
  auditMiddleware,
  requireSystemAdmin(),
  expressAsyncHandler(async (req, res, next) => {
  let action = 'Initialize Default Settings API'
  MyLogger.info(action)
  
  try {
    await settingsMediator.initializeDefaultSettings();
    serializeSuccessResponse(res, null, 'Default settings initialized successfully');
  } catch (error) {
    MyLogger.error(action, error)
    next(error);
  }
}));

// Upload invoice logo
router.post('/upload/invoice-logo', 
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.SETTINGS_UPDATE),
  uploadInvoiceLogo,
  handleLogoUploadError,
  expressAsyncHandler(async (req, res, next) => {
    let action = 'Upload Invoice Logo API';
    MyLogger.info(action);
    
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded',
          error: {
            message: 'Please upload a logo image file',
            details: 'Supported formats: PNG, JPG, JPEG, SVG. Max size: 2MB'
          }
        });
        return;
      }

      const logoUrl = `/uploads/settings/${req.file.filename}`;
      
      // Get current logo to delete old file if exists
      const currentLogoSetting = await settingsMediator.getSetting('company', 'invoice_logo');
      if (currentLogoSetting && typeof currentLogoSetting.value === 'string' && currentLogoSetting.value) {
        const oldLogoPath = currentLogoSetting.value;
        if (oldLogoPath.startsWith('/uploads/settings/')) {
          const oldFilename = oldLogoPath.replace('/uploads/settings/', '');
          const oldFilePath = path.join(process.cwd(), 'uploads', 'settings', oldFilename);
          try {
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath);
              MyLogger.info('Deleted old invoice logo', { oldLogoPath });
            }
          } catch (deleteError) {
            MyLogger.warn('Failed to delete old logo file', { oldLogoPath, error: deleteError });
          }
        }
      }
      
      // Save the logo URL to settings
      const setting = await settingsMediator.setSetting({
        category: 'company',
        key: 'invoice_logo',
        value: logoUrl,
        data_type: 'string',
        description: 'Invoice logo URL'
      });
      
      MyLogger.success(action, { logoUrl });
      serializeSuccessResponse(res, { 
        logoUrl,
        setting 
      }, 'Invoice logo uploaded successfully');
    } catch (error) {
      MyLogger.error(action, error);
      // Clean up uploaded file on error
      if (req.file) {
        try {
          const filePath = path.join(process.cwd(), 'uploads', 'settings', req.file.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (cleanupError) {
          MyLogger.warn('Failed to cleanup uploaded file after error', { error: cleanupError });
        }
      }
      next(error);
    }
  })
);

// Delete invoice logo
router.delete('/upload/invoice-logo', 
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.SETTINGS_UPDATE),
  expressAsyncHandler(async (req, res, next) => {
    let action = 'Delete Invoice Logo API';
    MyLogger.info(action);
    
    try {
      // Get current logo setting
      const currentLogoSetting = await settingsMediator.getSetting('company', 'invoice_logo');
      
      if (currentLogoSetting && typeof currentLogoSetting.value === 'string' && currentLogoSetting.value) {
        const logoPath = currentLogoSetting.value;
        if (logoPath.startsWith('/uploads/settings/')) {
          const filename = logoPath.replace('/uploads/settings/', '');
          const filePath = path.join(process.cwd(), 'uploads', 'settings', filename);
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              MyLogger.info('Deleted invoice logo file', { logoPath });
            }
          } catch (deleteError) {
            MyLogger.warn('Failed to delete logo file', { logoPath, error: deleteError });
          }
        }
      }
      
      // Remove the logo setting
      await settingsMediator.setSetting({
        category: 'company',
        key: 'invoice_logo',
        value: '',
        data_type: 'string',
        description: 'Invoice logo URL'
      });
      
      MyLogger.success(action);
      serializeSuccessResponse(res, null, 'Invoice logo deleted successfully');
    } catch (error) {
      MyLogger.error(action, error);
      next(error);
    }
  })
);

export default router;
