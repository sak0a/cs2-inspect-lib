/**
 * Custom error classes for CS2 Inspect URL library
 */

export enum ErrorCode {
    INVALID_INPUT = 'INVALID_INPUT',
    ENCODING_ERROR = 'ENCODING_ERROR',
    DECODING_ERROR = 'DECODING_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    BUFFER_OVERFLOW = 'BUFFER_OVERFLOW',
    INVALID_URL_FORMAT = 'INVALID_URL_FORMAT',
    UNSUPPORTED_FIELD = 'UNSUPPORTED_FIELD'
}

/**
 * Base error class for all CS2 Inspect URL related errors
 */
export class CS2InspectError extends Error {
    public readonly code: ErrorCode;
    public readonly context?: Record<string, any>;

    constructor(message: string, code: ErrorCode, context?: Record<string, any>) {
        super(message);
        this.name = 'CS2InspectError';
        this.code = code;
        this.context = context;
        
        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, CS2InspectError);
        }
    }

    /**
     * Returns a detailed error message including context
     */
    getDetailedMessage(): string {
        let message = `[${this.code}] ${this.message}`;
        if (this.context) {
            message += `\nContext: ${JSON.stringify(this.context, null, 2)}`;
        }
        return message;
    }
}

/**
 * Error thrown when input validation fails
 */
export class ValidationError extends CS2InspectError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, ErrorCode.VALIDATION_ERROR, context);
        this.name = 'ValidationError';
    }
}

/**
 * Error thrown when encoding fails
 */
export class EncodingError extends CS2InspectError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, ErrorCode.ENCODING_ERROR, context);
        this.name = 'EncodingError';
    }
}

/**
 * Error thrown when decoding fails
 */
export class DecodingError extends CS2InspectError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, ErrorCode.DECODING_ERROR, context);
        this.name = 'DecodingError';
    }
}

/**
 * Error thrown when URL format is invalid
 */
export class InvalidUrlError extends CS2InspectError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, ErrorCode.INVALID_URL_FORMAT, context);
        this.name = 'InvalidUrlError';
    }
}
