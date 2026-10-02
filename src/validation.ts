/**
 * Input validation utilities for CS2 Inspect URL library
 */

import { EconItem, ValidationResult, CS2InspectConfig, DEFAULT_CONFIG, isWeaponType, isItemRarity, isValidSticker } from './types';
import { ValidationError } from './errors';
import { isUint32, isInt32, isUint64, isFloat32 } from './utils/numbers';

/**
 * Validation utility class
 */
export class Validator {
    /**
     * Validates a complete EconItem object
     */
    static validateEconItem(item: any, config: CS2InspectConfig = {}): ValidationResult {
        const maxNameBytes = config.maxCustomNameLength ?? DEFAULT_CONFIG.maxCustomNameLength;
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!item || typeof item !== 'object') {
            return { valid: false, errors: ['Item must be a non-null object'] };
        }

        // Required fields validation
        if (!isUint32(item.defindex)) {
            errors.push('defindex must be a positive number');
        } else if (!isWeaponType(item.defindex) && item.defindex > 65535) {
            warnings.push(`defindex ${item.defindex} is not a known weapon type`);
        }

        if (!isUint32(item.paintindex)) {
            errors.push('paintindex must be a non-negative number');
        } else if (item.paintindex > 65535) {
            warnings.push('paintindex is unusually high, may be invalid');
        }

        if (!isUint32(item.paintseed)) {
            errors.push('paintseed must be a non-negative number');
        } else if (item.paintseed > 1000) {
            warnings.push('paintseed is unusually high, typical range is 0-1000');
        }

        if (!isFloat32(item.paintwear) || item.paintwear < 0 || item.paintwear > 1) {
            errors.push('paintwear must be a number between 0 and 1');
        }

        // Optional fields validation
        if (item.accountid !== undefined) {
            if (!isUint32(item.accountid)) {
                errors.push('accountid must be a positive number');
            }
        }

        if (item.itemid !== undefined) {
            if (!isUint64(item.itemid)) {
                errors.push('itemid must be a non-negative uint64 bigint or safe integer');
            }
        }

        if (item.rarity !== undefined) {
            if (typeof item.rarity === 'number') {
                if (!isUint32(item.rarity)) errors.push('rarity must be a uint32 integer');
                if (!isItemRarity(item.rarity) && item.rarity !== 99) {
                    warnings.push(`rarity ${item.rarity} is not a standard rarity value`);
                }
            } else if (typeof item.rarity === 'string') {
                // Allow string rarity values
            } else {
                errors.push('rarity must be a number or string');
            }
        }

        if (item.quality !== undefined && (!isUint32(item.quality))) {
            errors.push('quality must be a non-negative number');
        }

        if (item.customname !== undefined) {
            if (typeof item.customname !== 'string') {
                errors.push('customname must be a string');
            } else if (new TextEncoder().encode(item.customname).length > maxNameBytes) {
                errors.push(`customname must be ${maxNameBytes} UTF-8 bytes or less`);
            }
        }

        if (item.customnames !== undefined) {
            if (!Array.isArray(item.customnames) || item.customnames.some((name: unknown) =>
                typeof name !== 'string' || new TextEncoder().encode(name).length > maxNameBytes)) {
                errors.push(`customnames must be an array of strings of ${maxNameBytes} UTF-8 bytes or less`);
            }
        }
        if (item.pet_food_expiration_date !== undefined &&
            (!Number.isInteger(item.pet_food_expiration_date) ||
             item.pet_food_expiration_date < 0 || item.pet_food_expiration_date > 0xFFFFFFFF)) {
            errors.push('pet_food_expiration_date must be a uint32 integer');
        }
        if (item.blobdata !== undefined && !(item.blobdata instanceof Uint8Array)) {
            errors.push('blobdata must be a Uint8Array or Buffer');
        }

        if (item.entindex !== undefined && !isInt32(item.entindex)) {
            errors.push('entindex must be a signed int32 integer');
        }

        for (const field of ['killeaterscoretype', 'killeatervalue', 'inventory', 'origin',
            'questid', 'dropreason', 'musicindex', 'petindex', 'style', 'upgrade_level']) {
            if (item[field] !== undefined && !isUint32(item[field])) errors.push(`${field} must be a uint32 integer`);
        }

        // Array fields validation
        if (item.stickers !== undefined) {
            const stickerValidation = this.validateStickersArray(item.stickers);
            errors.push(...stickerValidation.errors);
            warnings.push(...(stickerValidation.warnings || []));
        }

        if (item.keychains !== undefined) {
            const keychainValidation = this.validateStickersArray(item.keychains, 'keychain');
            errors.push(...keychainValidation.errors);
            warnings.push(...(keychainValidation.warnings || []));
        }

        if (item.variations !== undefined) {
            const variationValidation = this.validateStickersArray(item.variations, 'variation');
            errors.push(...variationValidation.errors);
            warnings.push(...(variationValidation.warnings || []));
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings: warnings.length > 0 ? warnings : undefined
        };
    }

    /**
     * Validates an array of stickers/keychains/variations
     */
    static validateStickersArray(stickers: any, type: string = 'sticker'): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!Array.isArray(stickers)) {
            return { valid: false, errors: [`${type}s must be an array`] };
        }

        if (stickers.length > 10) {
            warnings.push(`${type}s array is unusually large (${stickers.length} items)`);
        }

        const usedSlots = new Set<number>();

        stickers.forEach((sticker, index) => {
            const stickerValidation = this.validateSticker(sticker);
            if (!stickerValidation.valid) {
                errors.push(...stickerValidation.errors.map(err => `${type}[${index}]: ${err}`));
            }
            if (stickerValidation.warnings) {
                warnings.push(...stickerValidation.warnings.map(warn => `${type}[${index}]: ${warn}`));
            }

            // Check for duplicate slots
            if (isValidSticker(sticker)) {
                if (usedSlots.has(sticker.slot)) {
                    warnings.push(`${type}[${index}]: duplicate slot ${sticker.slot}`);
                }
                usedSlots.add(sticker.slot);
            }
        });

        return {
            valid: errors.length === 0,
            errors,
            warnings: warnings.length > 0 ? warnings : undefined
        };
    }

    /**
     * Validates a single sticker object
     */
    static validateSticker(sticker: any): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!sticker || typeof sticker !== 'object') {
            return { valid: false, errors: ['Sticker must be a non-null object'] };
        }

        // Required fields
        if (!isUint32(sticker.slot) || sticker.slot < 0 || sticker.slot > 4) {
            errors.push('slot must be a number between 0 and 4');
        }

        if (!isUint32(sticker.sticker_id)) {
            errors.push('sticker_id must be a positive number');
        }

        // Optional fields
        if (sticker.wear !== undefined) {
            if (!isFloat32(sticker.wear) || sticker.wear < 0 || sticker.wear > 1) {
                errors.push('wear must be a number between 0 and 1');
            }
        }

        if (sticker.scale !== undefined) {
            if (!isFloat32(sticker.scale) || sticker.scale <= 0) {
                errors.push('scale must be a positive number');
            } else if (sticker.scale > 10) {
                warnings.push('scale is unusually high, typical range is 0.1-2.0');
            }
        }

        if (sticker.rotation !== undefined) {
            if (!isFloat32(sticker.rotation)) {
                errors.push('rotation must be a number');
            } else if (Math.abs(sticker.rotation) > 360) {
                warnings.push('rotation is outside typical range (-360 to 360 degrees)');
            }
        }

        if (sticker.tint_id !== undefined && (!isUint32(sticker.tint_id))) {
            errors.push('tint_id must be a non-negative number');
        }

        // Offset validation
        ['offset_x', 'offset_y', 'offset_z'].forEach(field => {
            if (sticker[field] !== undefined) {
                if (!isFloat32(sticker[field])) {
                    errors.push(`${field} must be a number`);
                } else if (Math.abs(sticker[field]) > 10) {
                    warnings.push(`${field} is unusually large, typical range is -1.0 to 1.0`);
                }
            }
        });

        if (sticker.pattern !== undefined && (!isUint32(sticker.pattern))) {
            errors.push('pattern must be a non-negative number');
        }

        if (sticker.highlight_reel !== undefined && (!isUint32(sticker.highlight_reel))) {
            errors.push('highlight_reel must be a non-negative number');
        }

        if (sticker.wrapped_sticker !== undefined && (!isUint32(sticker.wrapped_sticker))) {
            errors.push('wrapped_sticker must be a non-negative number');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings: warnings.length > 0 ? warnings : undefined
        };
    }

    /**
     * Validates hex data format
     */
    static validateHexData(hexData: string, maxLength = 4096): ValidationResult {
        const errors: string[] = [];

        if (typeof hexData !== 'string') {
            return { valid: false, errors: ['Hex data must be a string'] };
        }

        if (hexData.length === 0) {
            return { valid: false, errors: ['Hex data cannot be empty'] };
        }

        if (hexData.length % 2 !== 0) {
            errors.push('Hex data must have even length');
        }

        if (!/^[0-9A-Fa-f]+$/.test(hexData)) {
            errors.push('Hex data contains invalid characters (must be 0-9, A-F, a-f)');
        }

        if (hexData.length < 16) {
            errors.push('Hex data is too short (minimum 8 bytes)');
        }

        if (hexData.length > maxLength) {
            errors.push(`Hex data is too long (maximum ${maxLength / 2} bytes)`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validates inspect URL format
     */
    static validateInspectUrl(url: string, config: CS2InspectConfig = {}): ValidationResult {
        const maxLength = config.maxUrlLength ?? DEFAULT_CONFIG.maxUrlLength;
        const errors: string[] = [];
        const warnings: string[] = [];

        if (typeof url !== 'string') {
            return { valid: false, errors: ['URL must be a string'] };
        }

        if (url.length === 0) {
            return { valid: false, errors: ['URL cannot be empty'] };
        }

        if (url.length > maxLength) {
            errors.push(`URL is too long (maximum ${maxLength} characters)`);
        }

        // Check for basic URL patterns
        const hasValidPrefix = url.includes('steam://') || 
                              url.includes('csgo_econ_action_preview') || 
                              /^[0-9A-Fa-f]+$/.test(url.trim()) ||
                              /^[SM]\d+A\d+D\d+$/.test(url.trim());

        if (!hasValidPrefix) {
            warnings.push('URL format may be invalid - expected Steam URL, preview command, or hex data');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings: warnings.length > 0 ? warnings : undefined
        };
    }

    /**
     * Throws ValidationError if validation fails
     */
    static assertValid(item: any, config: CS2InspectConfig = {}): asserts item is EconItem {
        const result = this.validateEconItem(item, config);
        if (!result.valid) {
            throw new ValidationError(
                `Item validation failed: ${result.errors.join(', ')}`,
                { errors: result.errors, warnings: result.warnings }
            );
        }
    }

    /**
     * Throws ValidationError if hex data validation fails
     */
    static assertValidHexData(hexData: string, maxLength = 4096): asserts hexData is string {
        const result = this.validateHexData(hexData, maxLength);
        if (!result.valid) {
            throw new ValidationError(
                `Hex data validation failed: ${result.errors.join(', ')}`,
                { errors: result.errors }
            );
        }
    }
}
