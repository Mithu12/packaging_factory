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
