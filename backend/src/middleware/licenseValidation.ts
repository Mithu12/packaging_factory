import { Request, Response, NextFunction } from 'express';
import LicenseManager from '../utils/licenseManager';

/**
 * Middleware to validate license before processing requests
 */
export const validateLicense = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await LicenseManager.validateLicense();
    
    if (!result.valid) {
      res.status(403).json({
        success: false,
        message: 'License validation failed',
        error: result.error || 'Invalid or expired license',
      });
      return;
    }

    // Attach license info to request for later use
    (req as any).license = result.data;
    
    next();
  } catch (error) {
    console.error('License validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating license',
    });
  }
};

/**
 * Middleware to check for specific feature
 */
export const requireFeature = (feature: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const hasFeature = await LicenseManager.hasFeature(feature);
      
      if (!hasFeature) {
        res.status(403).json({
          success: false,
          message: `Feature '${feature}' is not enabled in your license`,
        });
        return;
      }
      
      next();
    } catch (error) {
      console.error('Feature check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking feature availability',
      });
    }
  };
};

/**
 * Middleware to warn about upcoming license expiry
 */
export const checkLicenseExpiry = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const daysRemaining = await LicenseManager.getDaysUntilExpiry();
    
    if (daysRemaining <= 30 && daysRemaining > 0) {
      // Add warning header
      res.setHeader('X-License-Warning', `License expires in ${daysRemaining} days`);
    }
    
    next();
  } catch (error) {
    // Don't block the request, just log the error
    console.error('License expiry check error:', error);
    next();
  }
};

