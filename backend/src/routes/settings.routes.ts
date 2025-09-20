import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import { serializeSuccessResponse } from '@/utils/responseHelper';
import SettingsMediator from '@/mediators/settings/SettingsMediator';
import { validateSettings } from '@/validation/settingsValidation';
import { MyLogger } from '@/utils/new-logger';
import { authenticate } from '@/middleware/auth';
import { requirePermission, requireSystemAdmin, PERMISSIONS } from '@/middleware/permission';
import { auditMiddleware } from '@/middleware/audit';

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

export default router;
