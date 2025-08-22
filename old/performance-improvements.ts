// Performance improvements for the protobuf implementation

export class OptimizedProtoWriter {
    private buffer: Uint8Array;
    private pos: number = 0;
    private capacity: number;

    constructor(initialCapacity: number = 1024) {
        this.capacity = initialCapacity;
        this.buffer = new Uint8Array(this.capacity);
    }

    private ensureCapacity(needed: number): void {
        if (this.pos + needed > this.capacity) {
            const newCapacity = Math.max(this.capacity * 2, this.pos + needed);
            const newBuffer = new Uint8Array(newCapacity);
            newBuffer.set(this.buffer.subarray(0, this.pos));
            this.buffer = newBuffer;
            this.capacity = newCapacity;
        }
    }

    writeVarint(value: number): void {
        this.ensureCapacity(5); // Max 5 bytes for 32-bit varint
        while (value > 0x7F) {
            this.buffer[this.pos++] = (value & 0x7F) | 0x80;
            value >>>= 7;
        }
        this.buffer[this.pos++] = value;
    }

    getBytes(): Uint8Array {
        return this.buffer.subarray(0, this.pos);
    }
}

// Validation utilities
export class ValidationUtils {
    static validateSticker(sticker: any): boolean {
        if (!sticker || typeof sticker !== 'object') return false;
        
        // Required fields
        if (typeof sticker.slot !== 'number' || sticker.slot < 0 || sticker.slot > 4) return false;
        if (typeof sticker.sticker_id !== 'number' || sticker.sticker_id < 0) return false;
        
        // Optional fields validation
        if (sticker.wear !== undefined && (typeof sticker.wear !== 'number' || sticker.wear < 0 || sticker.wear > 1)) return false;
        if (sticker.scale !== undefined && (typeof sticker.scale !== 'number' || sticker.scale <= 0)) return false;
        if (sticker.rotation !== undefined && typeof sticker.rotation !== 'number') return false;
        
        return true;
    }

    static validateEconItem(item: any): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        if (!item || typeof item !== 'object') {
            return { valid: false, errors: ['Item must be an object'] };
        }

        // Required fields
        if (typeof item.defindex !== 'number' || item.defindex < 0) {
            errors.push('defindex must be a positive number');
        }
        if (typeof item.paintindex !== 'number' || item.paintindex < 0) {
            errors.push('paintindex must be a positive number');
        }
        if (typeof item.paintseed !== 'number' || item.paintseed < 0) {
            errors.push('paintseed must be a positive number');
        }
        if (typeof item.paintwear !== 'number' || item.paintwear < 0 || item.paintwear > 1) {
            errors.push('paintwear must be a number between 0 and 1');
        }

        // Validate stickers array
        if (item.stickers && Array.isArray(item.stickers)) {
            item.stickers.forEach((sticker: any, index: number) => {
                if (!ValidationUtils.validateSticker(sticker)) {
                    errors.push(`Invalid sticker at index ${index}`);
                }
            });
        }

        return { valid: errors.length === 0, errors };
    }
}

// Caching system for frequently used items
export class InspectUrlCache {
    private cache = new Map<string, string>();
    private maxSize: number;

    constructor(maxSize: number = 1000) {
        this.maxSize = maxSize;
    }

    private generateKey(item: any): string {
        // Create a deterministic key from item properties
        const keyData = {
            defindex: item.defindex,
            paintindex: item.paintindex,
            paintseed: item.paintseed,
            paintwear: Math.round(item.paintwear * 10000), // Round to avoid float precision issues
            stickers: item.stickers?.map((s: any) => ({ 
                slot: s.slot, 
                sticker_id: s.sticker_id, 
                wear: s.wear ? Math.round(s.wear * 1000) : 0 
            })) || [],
            keychains: item.keychains?.map((k: any) => ({ 
                slot: k.slot, 
                sticker_id: k.sticker_id, 
                pattern: k.pattern 
            })) || []
        };
        return JSON.stringify(keyData);
    }

    get(item: any): string | undefined {
        return this.cache.get(this.generateKey(item));
    }

    set(item: any, url: string): void {
        if (this.cache.size >= this.maxSize) {
            // Remove oldest entry (simple LRU)
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(this.generateKey(item), url);
    }

    clear(): void {
        this.cache.clear();
    }

    size(): number {
        return this.cache.size;
    }
}

// Error handling improvements
export class ProtobufError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly context?: any
    ) {
        super(message);
        this.name = 'ProtobufError';
    }
}

export enum ErrorCodes {
    INVALID_INPUT = 'INVALID_INPUT',
    ENCODING_ERROR = 'ENCODING_ERROR',
    DECODING_ERROR = 'DECODING_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    BUFFER_OVERFLOW = 'BUFFER_OVERFLOW'
}

// Utility functions for better developer experience
export class InspectUrlUtils {
    static extractItemInfo(url: string): { 
        weapon?: string; 
        skin?: string; 
        wear?: number; 
        pattern?: number;
        stickers?: number;
        keychains?: number;
    } {
        // This would require a weapon/skin database, but shows the concept
        return {
            weapon: "Unknown",
            skin: "Unknown", 
            wear: 0,
            pattern: 0,
            stickers: 0,
            keychains: 0
        };
    }

    static formatWearValue(wear: number): string {
        if (wear <= 0.07) return "Factory New";
        if (wear <= 0.15) return "Minimal Wear";
        if (wear <= 0.38) return "Field-Tested";
        if (wear <= 0.45) return "Well-Worn";
        return "Battle-Scarred";
    }

    static estimateUrlSize(item: any): number {
        // Estimate the final URL size before encoding
        let size = 100; // Base overhead
        size += (item.stickers?.length || 0) * 50;
        size += (item.keychains?.length || 0) * 30;
        size += (item.variations?.length || 0) * 40;
        size += item.customname ? item.customname.length * 2 : 0;
        return size;
    }
}
