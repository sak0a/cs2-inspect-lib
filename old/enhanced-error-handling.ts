// Enhanced error handling and validation

import { EconItem, Sticker } from './base';

export class EnhancedProtoReader {
    private pos: number = 0;
    private view: DataView;
    private maxSize: number;

    constructor(private buffer: Uint8Array, maxSize: number = 10 * 1024 * 1024) { // 10MB limit
        this.view = new DataView(buffer.buffer);
        this.maxSize = maxSize;
        
        if (buffer.length > maxSize) {
            throw new ProtobufError(
                `Buffer size ${buffer.length} exceeds maximum allowed size ${maxSize}`,
                ErrorCodes.BUFFER_OVERFLOW
            );
        }
    }

    readVarintSafe(): number {
        if (this.pos >= this.buffer.length) {
            throw new ProtobufError(
                'Unexpected end of buffer while reading varint',
                ErrorCodes.DECODING_ERROR,
                { position: this.pos, bufferLength: this.buffer.length }
            );
        }

        let result = 0;
        let shift = 0;
        let bytesRead = 0;

        while (this.pos < this.buffer.length && bytesRead < 5) { // Max 5 bytes for 32-bit
            const byte = this.buffer[this.pos++];
            result |= (byte & 0x7F) << shift;
            bytesRead++;
            
            if ((byte & 0x80) === 0) {
                return result >>> 0;
            }
            shift += 7;
        }

        throw new ProtobufError(
            'Invalid varint encoding - too many bytes',
            ErrorCodes.DECODING_ERROR,
            { position: this.pos, bytesRead }
        );
    }

    readStringSafe(): string {
        const length = this.readVarintSafe();
        
        if (length > 1024) { // Reasonable string length limit
            throw new ProtobufError(
                `String length ${length} exceeds maximum allowed length 1024`,
                ErrorCodes.DECODING_ERROR
            );
        }

        if (this.pos + length > this.buffer.length) {
            throw new ProtobufError(
                'String extends beyond buffer boundary',
                ErrorCodes.DECODING_ERROR,
                { position: this.pos, length, bufferLength: this.buffer.length }
            );
        }

        try {
            const value = new (globalThis as any).TextDecoder('utf-8', { fatal: true })
                .decode(this.buffer.slice(this.pos, this.pos + length));
            this.pos += length;
            return value;
        } catch (error) {
            throw new ProtobufError(
                'Invalid UTF-8 string encoding',
                ErrorCodes.DECODING_ERROR,
                { position: this.pos, length, originalError: error }
            );
        }
    }

    static decodeMaskedDataSafe(hexData: string): EconItem {
        try {
            // Validate hex data format
            if (!/^[0-9A-Fa-f]+$/.test(hexData)) {
                throw new ProtobufError(
                    'Invalid hex data format',
                    ErrorCodes.INVALID_INPUT,
                    { hexData: hexData.substring(0, 50) + '...' }
                );
            }

            if (hexData.length < 16) { // Minimum reasonable size
                throw new ProtobufError(
                    'Hex data too short',
                    ErrorCodes.INVALID_INPUT,
                    { length: hexData.length }
                );
            }

            // Remove prefix and CRC as before
            let processedHex = hexData;
            if (processedHex.startsWith('00')) {
                processedHex = processedHex.slice(2);
            }
            processedHex = processedHex.slice(0, -8);

            const bytes = hexToBytesSafe(processedHex);
            const reader = new EnhancedProtoReader(bytes);

            const decoded: EconItem = {
                defindex: 0,
                paintindex: 0,
                paintseed: 0,
                paintwear: 0,
                stickers: [],
                keychains: [],
                variations: []
            };

            let fieldsProcessed = 0;
            const maxFields = 100; // Prevent infinite loops

            while (reader.hasMore() && fieldsProcessed < maxFields) {
                try {
                    const [fieldNumber, wireType] = reader.readTagSafe();
                    
                    // Validate field number range
                    if (fieldNumber < 1 || fieldNumber > 50) {
                        console.warn(`Unexpected field number: ${fieldNumber}, skipping`);
                        reader.skipFieldSafe(wireType);
                        continue;
                    }

                    // Process field based on number...
                    // (Implementation would continue here)
                    fieldsProcessed++;
                    
                } catch (error) {
                    if (error instanceof ProtobufError) {
                        throw error;
                    }
                    throw new ProtobufError(
                        'Error processing protobuf field',
                        ErrorCodes.DECODING_ERROR,
                        { fieldsProcessed, originalError: error }
                    );
                }
            }

            if (fieldsProcessed >= maxFields) {
                throw new ProtobufError(
                    'Too many fields processed, possible infinite loop',
                    ErrorCodes.DECODING_ERROR,
                    { fieldsProcessed }
                );
            }

            return decoded;

        } catch (error) {
            if (error instanceof ProtobufError) {
                throw error;
            }
            throw new ProtobufError(
                'Failed to decode masked data',
                ErrorCodes.DECODING_ERROR,
                { originalError: error }
            );
        }
    }

    readTagSafe(): [number, number] {
        const tag = this.readVarintSafe();
        const fieldNumber = tag >>> 3;
        const wireType = tag & 0x7;
        
        // Validate wire type
        if (wireType > 5) {
            throw new ProtobufError(
                `Invalid wire type: ${wireType}`,
                ErrorCodes.DECODING_ERROR,
                { fieldNumber, wireType }
            );
        }

        return [fieldNumber, wireType];
    }

    skipFieldSafe(wireType: number): void {
        switch (wireType) {
            case 0: // varint
                this.readVarintSafe();
                break;
            case 1: // 64-bit
                if (this.pos + 8 > this.buffer.length) {
                    throw new ProtobufError('Buffer underrun while skipping 64-bit field', ErrorCodes.DECODING_ERROR);
                }
                this.pos += 8;
                break;
            case 2: // length-delimited
                const length = this.readVarintSafe();
                if (this.pos + length > this.buffer.length) {
                    throw new ProtobufError('Buffer underrun while skipping length-delimited field', ErrorCodes.DECODING_ERROR);
                }
                this.pos += length;
                break;
            case 5: // 32-bit
                if (this.pos + 4 > this.buffer.length) {
                    throw new ProtobufError('Buffer underrun while skipping 32-bit field', ErrorCodes.DECODING_ERROR);
                }
                this.pos += 4;
                break;
            default:
                throw new ProtobufError(`Cannot skip unknown wire type: ${wireType}`, ErrorCodes.DECODING_ERROR);
        }
    }

    hasMore(): boolean {
        return this.pos < this.buffer.length;
    }
}

function hexToBytesSafe(hexStr: string): Uint8Array {
    if (hexStr.length % 2 !== 0) {
        throw new ProtobufError(
            'Hex string must have even length',
            ErrorCodes.INVALID_INPUT,
            { length: hexStr.length }
        );
    }

    const bytes = new Uint8Array(hexStr.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        const hex = hexStr.substr(i * 2, 2);
        const byte = parseInt(hex, 16);
        if (isNaN(byte)) {
            throw new ProtobufError(
                `Invalid hex byte: ${hex}`,
                ErrorCodes.INVALID_INPUT,
                { position: i * 2 }
            );
        }
        bytes[i] = byte;
    }
    return bytes;
}

// Import the error classes from performance-improvements.ts
class ProtobufError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly context?: any
    ) {
        super(message);
        this.name = 'ProtobufError';
    }
}

enum ErrorCodes {
    INVALID_INPUT = 'INVALID_INPUT',
    ENCODING_ERROR = 'ENCODING_ERROR',
    DECODING_ERROR = 'DECODING_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    BUFFER_OVERFLOW = 'BUFFER_OVERFLOW'
}
