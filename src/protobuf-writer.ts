/**
 * Enhanced protobuf writer with error handling and validation
 */

import { EconItem, Sticker, ItemRarity, CS2InspectConfig, DEFAULT_CONFIG } from './types';
import { EncodingError, ValidationError } from './errors';
import { Validator } from './validation';

/**
 * Utility functions
 */
function floatToBytes(floatValue: number): number {
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setFloat32(0, floatValue, false); // false for big-endian
    return view.getUint32(0, false);
}

function processRarity(rarityValue: ItemRarity | number | string): number {
    if (typeof rarityValue === 'number') {
        return rarityValue;
    } else if (typeof rarityValue === 'string') {
        const enumKey = rarityValue.toUpperCase();
        if (enumKey in ItemRarity) {
            return ItemRarity[enumKey as keyof typeof ItemRarity];
        }
        return ItemRarity.STOCK;
    }
    return rarityValue;
}

/**
 * Enhanced protobuf writer with comprehensive error handling
 */
export class ProtobufWriter {
    private buffer: Uint8Array;
    private pos: number = 0;
    private capacity: number;
    private config: Required<CS2InspectConfig>;

    constructor(initialCapacity: number = 1024, config: CS2InspectConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.capacity = initialCapacity;
        this.buffer = new Uint8Array(this.capacity);
    }

    /**
     * Ensures buffer has enough capacity, growing if necessary
     */
    private ensureCapacity(needed: number): void {
        if (this.pos + needed > this.capacity) {
            const newCapacity = Math.max(this.capacity * 2, this.pos + needed);
            const newBuffer = new Uint8Array(newCapacity);
            newBuffer.set(this.buffer.subarray(0, this.pos));
            this.buffer = newBuffer;
            this.capacity = newCapacity;
        }
    }

    /**
     * Writes a varint with bounds checking
     */
    writeVarint(value: number): void {
        if (value < 0) {
            throw new EncodingError(
                'Cannot encode negative number as varint',
                { value }
            );
        }

        this.ensureCapacity(5); // Max 5 bytes for 32-bit varint
        
        while (value > 0x7F) {
            this.buffer[this.pos++] = (value & 0x7F) | 0x80;
            value >>>= 7;
        }
        this.buffer[this.pos++] = value;
    }

    /**
     * Writes a 64-bit varint
     */
    writeVarint64(value: number | bigint): void {
        const bigValue = typeof value === 'bigint' ? value : BigInt(value);
        
        if (bigValue < 0n) {
            throw new EncodingError(
                'Cannot encode negative number as varint64',
                { value: value.toString() }
            );
        }

        this.ensureCapacity(10); // Max 10 bytes for 64-bit varint
        
        let val = bigValue;
        while (val > 0x7Fn) {
            this.buffer[this.pos++] = Number((val & 0x7Fn) | 0x80n);
            val >>= 7n;
        }
        this.buffer[this.pos++] = Number(val);
    }

    /**
     * Writes a signed 32-bit integer using ZigZag encoding
     */
    writeSInt32(value: number): void {
        if (!Number.isInteger(value)) {
            throw new EncodingError(
                'SInt32 value must be an integer',
                { value }
            );
        }

        // ZigZag encoding for signed integers
        const encoded = (value << 1) ^ (value >> 31);
        this.writeVarint(encoded >>> 0);
    }

    /**
     * Writes a protobuf tag
     */
    writeTag(fieldNumber: number, wireType: number): void {
        if (fieldNumber < 1 || fieldNumber > 536870911) { // 2^29 - 1
            throw new EncodingError(
                'Field number out of valid range',
                { fieldNumber, validRange: '1 to 536870911' }
            );
        }

        if (wireType < 0 || wireType > 5) {
            throw new EncodingError(
                'Invalid wire type',
                { wireType, validRange: '0 to 5' }
            );
        }

        this.writeVarint((fieldNumber << 3) | wireType);
    }

    /**
     * Writes a float value
     */
    writeFloat(value: number): void {
        if (!Number.isFinite(value)) {
            throw new EncodingError(
                'Float value must be finite',
                { value }
            );
        }

        this.ensureCapacity(4);
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);
        view.setFloat32(0, value, true); // true for little-endian
        
        for (let i = 0; i < 4; i++) {
            this.buffer[this.pos++] = view.getUint8(i);
        }
    }

    /**
     * Writes a string with length prefix
     */
    writeString(value: string): void {
        if (typeof value !== 'string') {
            throw new EncodingError(
                'Value must be a string',
                { type: typeof value }
            );
        }

        if (value.length > this.config.maxCustomNameLength) {
            throw new EncodingError(
                `String too long: ${value.length} > ${this.config.maxCustomNameLength}`,
                { length: value.length, maxLength: this.config.maxCustomNameLength }
            );
        }

        try {
            const encoder = new (globalThis as any).TextEncoder();
            const bytes = encoder.encode(value);
            this.writeVarint(bytes.length);
            this.ensureCapacity(bytes.length);
            this.buffer.set(bytes, this.pos);
            this.pos += bytes.length;
        } catch (error) {
            throw new EncodingError(
                'Failed to encode string',
                { string: value, originalError: error }
            );
        }
    }

    /**
     * Writes length-delimited bytes
     */
    writeLengthDelimited(bytes: Uint8Array): void {
        if (!(bytes instanceof Uint8Array)) {
            throw new EncodingError(
                'Value must be Uint8Array',
                { type: typeof bytes }
            );
        }

        this.writeVarint(bytes.length);
        this.ensureCapacity(bytes.length);
        this.buffer.set(bytes, this.pos);
        this.pos += bytes.length;
    }

    /**
     * Returns the encoded bytes
     */
    getBytes(): Uint8Array {
        return this.buffer.subarray(0, this.pos);
    }

    /**
     * Gets current position
     */
    getPosition(): number {
        return this.pos;
    }

    /**
     * Resets the writer for reuse
     */
    reset(): void {
        this.pos = 0;
    }

    /**
     * Encodes a sticker to protobuf bytes
     */
    static encodeSticker(sticker: Sticker, config: CS2InspectConfig = {}): Uint8Array {
        if (config.validateInput) {
            const validation = Validator.validateSticker(sticker);
            if (!validation.valid) {
                throw new ValidationError(
                    `Sticker validation failed: ${validation.errors.join(', ')}`,
                    { errors: validation.errors, warnings: validation.warnings }
                );
            }
        }

        const writer = new ProtobufWriter(256, config);

        try {
            // Required fields
            writer.writeTag(1, 0); // slot
            writer.writeVarint(sticker.slot);

            writer.writeTag(2, 0); // sticker_id
            writer.writeVarint(sticker.sticker_id);

            // Optional fields
            if (typeof sticker.wear === 'number') {
                writer.writeTag(3, 5); // wear (float)
                writer.writeFloat(sticker.wear);
            }

            if (typeof sticker.scale === 'number') {
                writer.writeTag(4, 5); // scale (float)
                writer.writeFloat(sticker.scale);
            }

            if (typeof sticker.rotation === 'number') {
                writer.writeTag(5, 5); // rotation (float)
                writer.writeFloat(sticker.rotation);
            }

            if (typeof sticker.tint_id === 'number') {
                writer.writeTag(6, 0); // tint_id (varint)
                writer.writeVarint(sticker.tint_id);
            }

            if (typeof sticker.offset_x === 'number') {
                writer.writeTag(7, 5); // offset_x (float)
                writer.writeFloat(sticker.offset_x);
            }

            if (typeof sticker.offset_y === 'number') {
                writer.writeTag(8, 5); // offset_y (float)
                writer.writeFloat(sticker.offset_y);
            }

            if (typeof sticker.offset_z === 'number') {
                writer.writeTag(9, 5); // offset_z (float)
                writer.writeFloat(sticker.offset_z);
            }

            if (typeof sticker.pattern === 'number') {
                writer.writeTag(10, 0); // pattern (varint)
                writer.writeVarint(sticker.pattern);
            }

            if (typeof sticker.highlight_reel === 'number') {
                writer.writeTag(11, 0); // highlight_reel (varint)
                writer.writeVarint(sticker.highlight_reel);
            }

            if (typeof sticker.wrapped_sticker === 'number') {
                writer.writeTag(12, 0); // wrapped_sticker (varint)
                writer.writeVarint(sticker.wrapped_sticker);
            }

            return writer.getBytes();

        } catch (error) {
            if (error instanceof EncodingError || error instanceof ValidationError) {
                throw error;
            }
            throw new EncodingError(
                'Failed to encode sticker',
                { sticker, originalError: error }
            );
        }
    }

    /**
     * Encodes an EconItem to protobuf bytes
     */
    static encodeItemData(item: EconItem, config: CS2InspectConfig = {}): Uint8Array {
        if (config.validateInput) {
            Validator.assertValid(item);
        }

        const writer = new ProtobufWriter(2048, config);

        try {
            // Write fields in ascending order by field number

            // Field 1: accountid (optional)
            if (typeof item.accountid !== 'undefined') {
                writer.writeTag(1, 0);
                writer.writeVarint(item.accountid);
            }

            // Field 2: itemid (optional, uint64)
            if (typeof item.itemid !== 'undefined') {
                writer.writeTag(2, 0);
                writer.writeVarint64(item.itemid);
            }

            // Field 3: defindex (required)
            writer.writeTag(3, 0);
            writer.writeVarint(typeof item.defindex === 'number' ? item.defindex : item.defindex);

            // Field 4: paintindex (required)
            writer.writeTag(4, 0);
            writer.writeVarint(item.paintindex);

            // Field 5: rarity (optional)
            if (typeof item.rarity !== 'undefined') {
                writer.writeTag(5, 0);
                writer.writeVarint(processRarity(item.rarity));
            }

            // Field 6: quality (optional)
            if (typeof item.quality !== 'undefined') {
                writer.writeTag(6, 0);
                writer.writeVarint(item.quality);
            }

            // Field 7: paintwear (required)
            writer.writeTag(7, 0);
            writer.writeVarint(floatToBytes(item.paintwear));

            // Field 8: paintseed (required)
            writer.writeTag(8, 0);
            writer.writeVarint(item.paintseed);

            // Field 9: killeaterscoretype (optional)
            if (typeof item.killeaterscoretype !== 'undefined') {
                writer.writeTag(9, 0);
                writer.writeVarint(item.killeaterscoretype);
            }

            // Field 10: killeatervalue (optional)
            if (typeof item.killeatervalue !== 'undefined') {
                writer.writeTag(10, 0);
                writer.writeVarint(item.killeatervalue);
            }

            // Field 11: customname (optional)
            if (item.customname) {
                writer.writeTag(11, 2);
                writer.writeString(item.customname);
            }

            // Field 12: stickers (repeated)
            if (item.stickers && item.stickers.length > 0) {
                for (const sticker of item.stickers) {
                    writer.writeTag(12, 2);
                    const stickerBytes = this.encodeSticker(sticker, config);
                    writer.writeLengthDelimited(stickerBytes);
                }
            }

            // Field 13: inventory (optional)
            if (typeof item.inventory !== 'undefined') {
                writer.writeTag(13, 0);
                writer.writeVarint(item.inventory);
            }

            // Field 14: origin (optional)
            if (typeof item.origin !== 'undefined') {
                writer.writeTag(14, 0);
                writer.writeVarint(item.origin);
            }

            // Field 15: questid (optional)
            if (typeof item.questid !== 'undefined') {
                writer.writeTag(15, 0);
                writer.writeVarint(item.questid);
            }

            // Field 16: dropreason (optional)
            if (typeof item.dropreason !== 'undefined') {
                writer.writeTag(16, 0);
                writer.writeVarint(item.dropreason);
            }

            // Field 17: musicindex (optional)
            if (typeof item.musicindex !== 'undefined') {
                writer.writeTag(17, 0);
                writer.writeVarint(item.musicindex);
            }

            // Field 18: entindex (optional, signed int32)
            if (typeof item.entindex !== 'undefined') {
                writer.writeTag(18, 0);
                writer.writeSInt32(item.entindex);
            }

            // Field 19: petindex (optional)
            if (typeof item.petindex !== 'undefined') {
                writer.writeTag(19, 0);
                writer.writeVarint(item.petindex);
            }

            // Field 20: keychains (repeated)
            if (item.keychains && item.keychains.length > 0) {
                for (const keychain of item.keychains) {
                    writer.writeTag(20, 2);
                    const keychainBytes = this.encodeSticker(keychain, config);
                    writer.writeLengthDelimited(keychainBytes);
                }
            }

            // Field 21: style (optional)
            if (typeof item.style !== 'undefined') {
                writer.writeTag(21, 0);
                writer.writeVarint(item.style);
            }

            // Field 22: variations (repeated)
            if (item.variations && item.variations.length > 0) {
                for (const variation of item.variations) {
                    writer.writeTag(22, 2);
                    const variationBytes = this.encodeSticker(variation, config);
                    writer.writeLengthDelimited(variationBytes);
                }
            }

            // Field 23: upgrade_level (optional)
            if (typeof item.upgrade_level !== 'undefined') {
                writer.writeTag(23, 0);
                writer.writeVarint(item.upgrade_level);
            }

            return writer.getBytes();

        } catch (error) {
            if (error instanceof EncodingError || error instanceof ValidationError) {
                throw error;
            }
            throw new EncodingError(
                'Failed to encode item data',
                { item, originalError: error }
            );
        }
    }

    /**
     * CRC32 calculation for checksum
     */
    static crc32(data: Uint8Array): number {
        let crc = -1;
        const table = new Int32Array(256);

        // Generate CRC table
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let j = 0; j < 8; j++) {
                c = ((c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
            }
            table[i] = c;
        }

        // Calculate CRC
        for (let i = 0; i < data.length; i++) {
            crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xFF];
        }

        return (crc ^ (-1)) >>> 0;
    }

    /**
     * Creates a complete inspect URL from an EconItem
     */
    static createInspectUrl(item: EconItem, config: CS2InspectConfig = {}): string {
        const INSPECT_BASE = "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20";

        try {
            const protoData = this.encodeItemData(item, config);

            // Create buffer with null byte prefix and space for checksum
            const buffer = new Uint8Array(protoData.length + 5);
            buffer[0] = 0; // Null byte prefix
            buffer.set(protoData, 1);

            // Calculate checksum
            const crc = this.crc32(buffer.subarray(0, buffer.length - 4));
            const xoredCrc = (crc & 0xFFFF) ^ (protoData.length * crc);

            // Add checksum (big-endian)
            const view = new DataView(buffer.buffer);
            view.setUint32(buffer.length - 4, xoredCrc, false);

            // Convert to hex string
            const hexString = Array.from(buffer)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')
                .toUpperCase();

            const finalUrl = `${INSPECT_BASE}${hexString}`;

            // Validate final URL length
            if (finalUrl.length > config.maxUrlLength!) {
                throw new EncodingError(
                    `Generated URL exceeds maximum length: ${finalUrl.length} > ${config.maxUrlLength}`,
                    { urlLength: finalUrl.length, maxLength: config.maxUrlLength }
                );
            }

            return finalUrl;

        } catch (error) {
            if (error instanceof EncodingError || error instanceof ValidationError) {
                throw error;
            }
            throw new EncodingError(
                'Failed to create inspect URL',
                { item, originalError: error }
            );
        }
    }
}
