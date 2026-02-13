/**
 * Enhanced protobuf reader with error handling and validation
 */

import { EconItem, Sticker, CS2InspectConfig, DEFAULT_CONFIG } from './types';
import { DecodingError, ValidationError } from './errors';
import { Validator } from './validation';

/**
 * Utility functions
 */
function hexToBytes(hexStr: string): Uint8Array {
    Validator.assertValidHexData(hexStr);
    
    const bytes = new Uint8Array(hexStr.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        const hex = hexStr.slice(i * 2, i * 2 + 2);
        const byte = parseInt(hex, 16);
        if (isNaN(byte)) {
            throw new DecodingError(
                `Invalid hex byte: ${hex}`,
                { position: i * 2, hex }
            );
        }
        bytes[i] = byte;
    }
    return bytes;
}

function bytesToFloat(intValue: number): number {
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setUint32(0, intValue, false); // false for big-endian
    return view.getFloat32(0, false);
}

/**
 * Enhanced protobuf reader with comprehensive error handling
 */
export class ProtobufReader {
    private pos: number = 0;
    private view: DataView;
    private config: Required<CS2InspectConfig>;

    constructor(
        private buffer: Uint8Array, 
        config: CS2InspectConfig = {}
    ) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.view = new DataView(buffer.buffer);
        
        if (buffer.length === 0) {
            throw new DecodingError('Buffer cannot be empty');
        }
        
        if (buffer.length > 10 * 1024 * 1024) { // 10MB limit
            throw new DecodingError(
                'Buffer too large',
                { size: buffer.length, maxSize: 10 * 1024 * 1024 }
            );
        }
    }

    /**
     * Safely reads a varint with bounds checking
     */
    readVarint(): number {
        if (this.pos >= this.buffer.length) {
            throw new DecodingError(
                'Unexpected end of buffer while reading varint',
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

        throw new DecodingError(
            'Invalid varint encoding - too many bytes or unexpected end',
            { position: this.pos, bytesRead }
        );
    }

    /**
     * Safely reads a 64-bit varint
     */
    readVarint64(): bigint {
        if (this.pos >= this.buffer.length) {
            throw new DecodingError(
                'Unexpected end of buffer while reading varint64',
                { position: this.pos, bufferLength: this.buffer.length }
            );
        }

        let result = 0n;
        let shift = 0n;
        let bytesRead = 0;

        while (this.pos < this.buffer.length && bytesRead < 10) { // Max 10 bytes for 64-bit
            const byte = BigInt(this.buffer[this.pos++]);
            result |= (byte & 0x7Fn) << shift;
            bytesRead++;
            
            if ((byte & 0x80n) === 0n) {
                return result;
            }
            shift += 7n;
        }

        throw new DecodingError(
            'Invalid varint64 encoding - too many bytes or unexpected end',
            { position: this.pos, bytesRead }
        );
    }

    /**
     * Safely reads a signed 32-bit integer (ZigZag decoded)
     */
    readSInt32(): number {
        const encoded = this.readVarint();
        return (encoded >>> 1) ^ (-(encoded & 1));
    }

    /**
     * Safely reads a float value
     */
    readFloat(): number {
        if (this.pos + 4 > this.buffer.length) {
            throw new DecodingError(
                'Buffer underrun while reading float',
                { position: this.pos, needed: 4, available: this.buffer.length - this.pos }
            );
        }
        
        const value = this.view.getFloat32(this.pos, true);
        this.pos += 4;
        return value;
    }

    /**
     * Safely reads a string with length validation
     */
    readString(): string {
        const length = this.readVarint();
        
        if (length > this.config.maxCustomNameLength) {
            throw new DecodingError(
                `String length ${length} exceeds maximum allowed length ${this.config.maxCustomNameLength}`,
                { length, maxLength: this.config.maxCustomNameLength }
            );
        }

        if (this.pos + length > this.buffer.length) {
            throw new DecodingError(
                'String extends beyond buffer boundary',
                { position: this.pos, length, bufferLength: this.buffer.length }
            );
        }

        try {
            const value = new (globalThis as any).TextDecoder('utf-8', { fatal: true })
                .decode(this.buffer.slice(this.pos, this.pos + length));
            this.pos += length;
            return value;
        } catch (error) {
            throw new DecodingError(
                'Invalid UTF-8 string encoding',
                { position: this.pos, length, originalError: error }
            );
        }
    }

    /**
     * Safely reads length-delimited bytes
     */
    readBytes(): Uint8Array {
        const length = this.readVarint();
        
        if (length > 1024) { // Reasonable limit for embedded data
            throw new DecodingError(
                `Bytes length ${length} exceeds reasonable limit`,
                { length, maxLength: 1024 }
            );
        }

        if (this.pos + length > this.buffer.length) {
            throw new DecodingError(
                'Bytes extend beyond buffer boundary',
                { position: this.pos, length, bufferLength: this.buffer.length }
            );
        }

        const bytes = this.buffer.slice(this.pos, this.pos + length);
        this.pos += length;
        return bytes;
    }

    /**
     * Safely reads and parses a protobuf tag
     */
    readTag(): [number, number] {
        const tag = this.readVarint();
        const fieldNumber = tag >>> 3;
        const wireType = tag & 0x7;
        
        // Validate wire type
        if (wireType > 5) {
            throw new DecodingError(
                `Invalid wire type: ${wireType}`,
                { fieldNumber, wireType, tag }
            );
        }

        // Validate field number range
        if (fieldNumber < 1 || fieldNumber > 50) {
            if (this.config.enableLogging) {
                console.warn(`Unusual field number: ${fieldNumber}`);
            }
        }

        return [fieldNumber, wireType];
    }

    /**
     * Safely skips a field based on wire type
     */
    skipField(wireType: number): void {
        switch (wireType) {
            case 0: // varint
                this.readVarint();
                break;
            case 1: // 64-bit
                if (this.pos + 8 > this.buffer.length) {
                    throw new DecodingError(
                        'Buffer underrun while skipping 64-bit field',
                        { position: this.pos, needed: 8, available: this.buffer.length - this.pos }
                    );
                }
                this.pos += 8;
                break;
            case 2: // length-delimited
                const length = this.readVarint();
                if (this.pos + length > this.buffer.length) {
                    throw new DecodingError(
                        'Buffer underrun while skipping length-delimited field',
                        { position: this.pos, length, available: this.buffer.length - this.pos }
                    );
                }
                this.pos += length;
                break;
            case 5: // 32-bit
                if (this.pos + 4 > this.buffer.length) {
                    throw new DecodingError(
                        'Buffer underrun while skipping 32-bit field',
                        { position: this.pos, needed: 4, available: this.buffer.length - this.pos }
                    );
                }
                this.pos += 4;
                break;
            default:
                throw new DecodingError(
                    `Cannot skip unknown wire type: ${wireType}`,
                    { wireType }
                );
        }
    }

    /**
     * Checks if there's more data to read
     */
    hasMore(): boolean {
        return this.pos < this.buffer.length;
    }

    /**
     * Gets current position for debugging
     */
    getPosition(): number {
        return this.pos;
    }

    /**
     * Gets remaining bytes count
     */
    getRemainingBytes(): number {
        return this.buffer.length - this.pos;
    }

    /**
     * Decodes a sticker from protobuf data
     */
    static decodeSticker(reader: ProtobufReader): Sticker {
        const sticker: Sticker = {
            slot: 0,
            sticker_id: 0
        };

        let fieldsProcessed = 0;
        const maxFields = 20; // Prevent infinite loops

        while (reader.hasMore() && fieldsProcessed < maxFields) {
            const [fieldNumber, wireType] = reader.readTag();
            fieldsProcessed++;

            try {
                switch (fieldNumber) {
                    case 1: // slot
                        if (wireType !== 0) throw new DecodingError(`Invalid wire type for slot: ${wireType}`);
                        sticker.slot = reader.readVarint();
                        break;
                    case 2: // sticker_id
                        if (wireType !== 0) throw new DecodingError(`Invalid wire type for sticker_id: ${wireType}`);
                        sticker.sticker_id = reader.readVarint();
                        break;
                    case 3: // wear
                        if (wireType !== 5) throw new DecodingError(`Invalid wire type for wear: ${wireType}`);
                        sticker.wear = reader.readFloat();
                        break;
                    case 4: // scale
                        if (wireType !== 5) throw new DecodingError(`Invalid wire type for scale: ${wireType}`);
                        sticker.scale = reader.readFloat();
                        break;
                    case 5: // rotation
                        if (wireType !== 5) throw new DecodingError(`Invalid wire type for rotation: ${wireType}`);
                        sticker.rotation = reader.readFloat();
                        break;
                    case 6: // tint_id
                        if (wireType !== 0) throw new DecodingError(`Invalid wire type for tint_id: ${wireType}`);
                        sticker.tint_id = reader.readVarint();
                        break;
                    case 7: // offset_x
                        if (wireType !== 5) throw new DecodingError(`Invalid wire type for offset_x: ${wireType}`);
                        sticker.offset_x = reader.readFloat();
                        break;
                    case 8: // offset_y
                        if (wireType !== 5) throw new DecodingError(`Invalid wire type for offset_y: ${wireType}`);
                        sticker.offset_y = reader.readFloat();
                        break;
                    case 9: // offset_z
                        if (wireType !== 5) throw new DecodingError(`Invalid wire type for offset_z: ${wireType}`);
                        sticker.offset_z = reader.readFloat();
                        break;
                    case 10: // pattern
                        if (wireType !== 0) throw new DecodingError(`Invalid wire type for pattern: ${wireType}`);
                        sticker.pattern = reader.readVarint();
                        break;
                    case 11: // highlight_reel
                        if (wireType !== 0) throw new DecodingError(`Invalid wire type for highlight_reel: ${wireType}`);
                        sticker.highlight_reel = reader.readVarint();
                        break;
                    case 12: // wrapped_sticker
                        if (wireType !== 0) throw new DecodingError(`Invalid wire type for wrapped_sticker: ${wireType}`);
                        sticker.wrapped_sticker = reader.readVarint();
                        break;
                    default:
                        reader.skipField(wireType);
                        break;
                }
            } catch (error) {
                throw new DecodingError(
                    `Error decoding sticker field ${fieldNumber}`,
                    { fieldNumber, wireType, originalError: error }
                );
            }
        }

        if (fieldsProcessed >= maxFields) {
            throw new DecodingError(
                'Too many fields in sticker, possible corruption',
                { fieldsProcessed }
            );
        }

        return sticker;
    }

    /**
     * Decodes masked protobuf data into an EconItem
     */
    static decodeMaskedData(hexData: string, config: CS2InspectConfig = {}): EconItem {
        try {
            // Validate and process hex data
            let processedHex = hexData.trim().toUpperCase();

            if (processedHex.startsWith('00')) {
                processedHex = processedHex.slice(2);
            }

            if (processedHex.length < 16) {
                throw new DecodingError(
                    'Hex data too short after processing',
                    { originalLength: hexData.length, processedLength: processedHex.length }
                );
            }

            // Remove CRC checksum (last 4 bytes)
            processedHex = processedHex.slice(0, -8);

            const bytes = hexToBytes(processedHex);
            const reader = new ProtobufReader(bytes, config);

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
                const [fieldNumber, wireType] = reader.readTag();
                fieldsProcessed++;

                try {
                    switch (fieldNumber) {
                        case 1: // accountid
                            decoded.accountid = reader.readVarint();
                            break;
                        case 2: // itemid (uint64)
                            decoded.itemid = reader.readVarint64();
                            break;
                        case 3: // defindex
                            decoded.defindex = reader.readVarint();
                            break;
                        case 4: // paintindex
                            decoded.paintindex = reader.readVarint();
                            break;
                        case 5: // rarity
                            decoded.rarity = reader.readVarint();
                            break;
                        case 6: // quality
                            decoded.quality = reader.readVarint();
                            break;
                        case 7: // paintwear
                            const wearBytes = reader.readVarint();
                            decoded.paintwear = bytesToFloat(wearBytes);
                            break;
                        case 8: // paintseed
                            decoded.paintseed = reader.readVarint();
                            break;
                        case 9: // killeaterscoretype
                            decoded.killeaterscoretype = reader.readVarint();
                            break;
                        case 10: // killeatervalue
                            decoded.killeatervalue = reader.readVarint();
                            break;
                        case 11: // customname
                            decoded.customname = reader.readString();
                            break;
                        case 12: // stickers
                            const stickerBytes = reader.readBytes();
                            const stickerReader = new ProtobufReader(stickerBytes, config);
                            const sticker = this.decodeSticker(stickerReader);
                            decoded.stickers!.push(sticker);
                            break;
                        case 13: // inventory
                            decoded.inventory = reader.readVarint();
                            break;
                        case 14: // origin
                            decoded.origin = reader.readVarint();
                            break;
                        case 15: // questid
                            decoded.questid = reader.readVarint();
                            break;
                        case 16: // dropreason
                            decoded.dropreason = reader.readVarint();
                            break;
                        case 17: // musicindex
                            decoded.musicindex = reader.readVarint();
                            break;
                        case 18: // entindex (signed int32)
                            decoded.entindex = reader.readSInt32();
                            break;
                        case 19: // petindex
                            decoded.petindex = reader.readVarint();
                            break;
                        case 20: // keychains
                            const keychainBytes = reader.readBytes();
                            const keychainReader = new ProtobufReader(keychainBytes, config);
                            const keychain = this.decodeSticker(keychainReader);
                            decoded.keychains!.push(keychain);
                            break;
                        case 21: // style
                            decoded.style = reader.readVarint();
                            break;
                        case 22: // variations
                            const variationBytes = reader.readBytes();
                            const variationReader = new ProtobufReader(variationBytes, config);
                            const variation = this.decodeSticker(variationReader);
                            decoded.variations!.push(variation);
                            break;
                        case 23: // upgrade_level
                            decoded.upgrade_level = reader.readVarint();
                            break;
                        default:
                            if (config.enableLogging) {
                                console.warn(`Unknown field ${fieldNumber}, skipping`);
                            }
                            reader.skipField(wireType);
                            break;
                    }
                } catch (error) {
                    throw new DecodingError(
                        `Error decoding field ${fieldNumber}`,
                        { fieldNumber, wireType, fieldsProcessed, originalError: error }
                    );
                }
            }

            if (fieldsProcessed >= maxFields) {
                throw new DecodingError(
                    'Too many fields processed, possible infinite loop or corruption',
                    { fieldsProcessed }
                );
            }

            // Validate the decoded item if validation is enabled
            if (config.validateInput) {
                const validation = Validator.validateEconItem(decoded);
                if (!validation.valid) {
                    throw new ValidationError(
                        `Decoded item validation failed: ${validation.errors.join(', ')}`,
                        { errors: validation.errors, warnings: validation.warnings }
                    );
                }
            }

            return decoded;

        } catch (error) {
            if (error instanceof DecodingError || error instanceof ValidationError) {
                throw error;
            }
            throw new DecodingError(
                'Failed to decode masked data',
                { originalError: error, hexDataLength: hexData.length }
            );
        }
    }
}
