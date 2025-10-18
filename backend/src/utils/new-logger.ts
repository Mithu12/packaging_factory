import winston, { createLogger } from 'winston';
// import LokiTransport from "winston-loki";

// Custom format for Winston
export const customFormat = winston.format.printf(({ level, message, timestamp, stack, data, traceId }) => {

    const logEntry: any = {
        timestamp,
        level,
        message,
        traceId,    // @ts-ignore
        ...(data && { data }), // Include data if present for info and warn levels
    };

    if (stack) {
        logEntry.stack = stack;
    }

    return JSON.stringify(logEntry);
});

// Format stack trace function
export function formatStackTrace(stack: string | undefined, isError: boolean = false): any {
    if (!stack) return { fileName: 'Unknown', methodName: 'Unknown', lineNumber: undefined };

    const lines = stack.split('\n');
    const relevantLine = isError ? lines[1] : lines[2];
    if (relevantLine == undefined) return { fileName: 'Unknown', methodName: 'Unknown', lineNumber: undefined };
    // Attempt to parse the relevant line with ReDoS-safe regex
    const match = relevantLine.trim().match(/^at\s+([^\s()]+(?:\s+[^\s()]+)*)\s+\(([^:)]+):(\d+):(\d+)\)$/);

    if (match) {
        const errMessage = lines[0]
        let methodName = match[1];
        const fileName = match[2];
        const lineNumber = parseInt(match[3], 10);

        // If the method name contains '<anonymous>', improve the name detection
        if (methodName.includes('<anonymous>')) {
            // Fallback to capturing the method from the line above if possible
            const previousLine = lines[isError ? 1 : 0].trim();
            const methodMatch = previousLine.match(/^at\s+([^\s]+(?:\s+[^\s]+)*)/);
            if (methodMatch) {
                methodName = methodMatch[1];
            } else {
                methodName = 'Anonymous';
            }
        }

        let serializedMessage: {
            methodName: string;
            fileName: string;
            lineNumber: number;
            errMessage?: string;
        } = { methodName, fileName, lineNumber }

        if (isError) {
            serializedMessage.errMessage = errMessage
        }

        return serializedMessage;
    }

    return { errMessage: 'Error: none', fileName: 'Unknown', methodName: 'Unknown', lineNumber: undefined };
}

const logger = createLogger({
    format: customFormat
});

logger.add(new winston.transports.Console({
    format: winston.format.combine(
        winston.format.colorize({ all: true }), // Ensure colorization is applied to message and level
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, stack, data, traceId }) => {
            let logEntry = `${timestamp} [${level}]: ${message}`; // Winston applies color to `level` automatically
            if (traceId) logEntry += `\nTrace ID: ${traceId}`;
            if (stack) logEntry += `\nStack: ${JSON.stringify(stack)}`;
            if (data) logEntry += `\nData: ${JSON.stringify(data, null, 2)}`;
            return logEntry;
        })
    ),
    level: 'debug'
}));

// logger.add(new LokiTransport({
//     host: `${process.env.LOKI_HOST_AND_PORT}`,
//     json: true,
//     labels: { job: `${process.env.LOKI_JOB_NAME_BACKEND}` }
// })
// )

// Logger class with specific methods for each log level
export class MyLogger {
    static info(message: string, data?: any, traceId?: string) {
        const logEntry: any = { message, traceId };
        if (data) {
            logEntry.data = data; // Optional data for info level
        }

        const errorForStack = new Error();
        logEntry.stack = formatStackTrace(errorForStack.stack, false);
        logger.info(logEntry);
    }

    static success(message: string, data?: any, traceId?: string) {
        this.info("Success: " + message, data, traceId);
    }

    static warn(message: string, data?: any, traceId?: string) {
        const logEntry: any = { message, traceId };
        if (data) {
            logEntry.data = data; // Optional data for warn level
        }

        const errorForStack = new Error();
        logEntry.stack = formatStackTrace(errorForStack.stack, false);
        logger.warn(logEntry);
    }

    static error(message: string, error: Error | any, data?: any, traceId?: string) {
        const logEntry: any = { message: 'Error: ' + message };
        // logEntry.stack = formatStackTrace(error.stack, true);
        logEntry.stack = error.stack
        logEntry.traceId = traceId
        if (data) {
            logEntry.data = data; // Optional data for error level
        }

        logger.error(logEntry);
    }
}

// Example:


//         MyLogger.info("get Details 1", { data: "fege1" })
//         MyLogger.error("get Details 2", new Error())
//         MyLogger.warn("get Details 3", { data: "fege3" })
//         MyLogger.info("get Details 4", { data: "fege4" })

