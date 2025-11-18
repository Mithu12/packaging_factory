import {Response} from 'express'

export const serializeSuccessResponse = (res: Response, data: any, message: string, statusCode: number = 200) => {
    return res.status(statusCode).json({
        success: true,
        data,
        message
    });
}

export const serializeErrorResponse = (res: Response, data: any, code: string, message: string, ) => {
    return res.json({
        success: false,
        data,
        errorCode: code,
        message
    });
}

// Custom error class
export class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;

    constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        Error.captureStackTrace(this, this.constructor);
    }
}

// Helper function to create errors
export const createError = (message: string, statusCode: number = 500): AppError => {
    return new AppError(message, statusCode);
};