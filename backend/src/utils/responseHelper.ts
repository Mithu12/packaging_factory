import {Response} from 'express'

export const serializeSuccessResponse = (res: Response, data: any, message: string) => {
    return res.json({
        success: true,
        data,
        message
    });
}

export const serializeErrorResponse = (res: Response, data: any, code: string, message: string, ) => {
    return res.json({
        success: true,
        data,
        errorCode: code,
        message
    });
}