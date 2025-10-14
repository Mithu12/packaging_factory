import express from 'express';
import LicenseManager from '../utils/licenseManager';
import { authenticate, adminOnly } from '../middleware/auth';

const router = express.Router();

/**
 * Get current license info
 * @route GET /api/license/info
 * @access Private - Admin only
 */
router.get('/info', authenticate, adminOnly, async (req, res): Promise<void> => {
  try {
    const result = await LicenseManager.validateLicense(true);
    
    if (!result.valid) {
      res.status(200).json({
        success: true,
        valid: false,
        error: result.error,
      });
      return;
    }

    const daysRemaining = await LicenseManager.getDaysUntilExpiry();
    
    res.json({
      success: true,
      valid: true,
      license: {
        clientName: result.data?.clientName,
        clientId: result.data?.clientId,
        issueDate: result.data?.issueDate,
        expiryDate: result.data?.expiryDate,
        daysRemaining,
        maxUsers: result.data?.maxUsers,
        features: result.data?.features,
      },
    });
  } catch (error) {
    console.error('Error getting license info:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving license information',
    });
  }
});

/**
 * Install a new license key
 * @route POST /api/license/install
 * @access Private - Admin only
 */
router.post('/install', authenticate, adminOnly, async (req, res): Promise<void> => {
  try {
    const { licenseKey } = req.body;

    if (!licenseKey) {
      res.status(400).json({
        success: false,
        message: 'License key is required',
      });
      return;
    }

    const result = LicenseManager.installLicense(licenseKey);
    
    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to install license',
      });
      return;
    }

    // Validate the newly installed license
    const validation = await LicenseManager.validateLicense(true);
    
    res.json({
      success: true,
      message: 'License installed successfully',
      valid: validation.valid,
      license: validation.data,
    });
  } catch (error) {
    console.error('Error installing license:', error);
    res.status(500).json({
      success: false,
      message: 'Error installing license',
    });
  }
});

/**
 * Get current machine ID (for license generation)
 * @route GET /api/license/machine-id
 * @access Private - Admin only
 */
router.get('/machine-id', authenticate, adminOnly, async (req, res) => {
  try {
    const machineId = await LicenseManager.getCurrentMachineId();
    
    res.json({
      success: true,
      machineId,
    });
  } catch (error) {
    console.error('Error getting machine ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving machine ID',
    });
  }
});

export default router;

