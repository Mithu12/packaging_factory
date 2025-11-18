import { MyLogger } from '@/utils/new-logger';
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validateRequest = (schema: Joi.ObjectSchema, target: 'body' | 'query' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const dataToValidate = target === 'query' ? req.query : req.body;
    const { error } = schema.validate(dataToValidate);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    return next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return validateRequest(schema, 'query');
};
export const validateParams = (schema: any) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const action = "Validate Route Parameters";
    try {
      MyLogger.info(action, { endpoint: req.originalUrl, method: req.method });
      const { error, value } = schema.validate(req.params);
      if (error) {
        MyLogger.warn(action, {
          endpoint: req.originalUrl,
          method: req.method,
          validationErrors: error.details,
        });
        res.status(400).json({
          success: false,
          message: "Parameter validation error",
          errors: error.details
        });
        return;
      }
      req.params = value;
      next();
    } catch (error: any) {
      MyLogger.error(action, error, {
        endpoint: req.originalUrl,
        method: req.method,
      });
      next(error);
    }
  };
};