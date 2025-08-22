/**
 * Unit tests for validation utilities
 */

import { Validator } from '../src/validation';
import { WeaponType, ItemRarity } from '../src/types';
import { ValidationError } from '../src/errors';

describe('Validator', () => {
    describe('validateEconItem', () => {
        it('should validate a minimal valid item', () => {
            const item = {
                defindex: WeaponType.AK_47,
                paintindex: 44,
                paintseed: 661,
                paintwear: 0.15
            };

            const result = Validator.validateEconItem(item);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should validate a complete valid item', () => {
            const item = {
                accountid: 123456789,
                itemid: BigInt('9876543210'),
                defindex: WeaponType.AK_47,
                paintindex: 44,
                rarity: ItemRarity.COVERT,
                quality: 4,
                paintwear: 0.15,
                paintseed: 661,
                killeaterscoretype: 1,
                killeatervalue: 100,
                customname: 'Fire Serpent',
                stickers: [
                    {
                        slot: 0,
                        sticker_id: 1,
                        wear: 0.1,
                        scale: 1.0,
                        rotation: 0.0
                    }
                ],
                keychains: [
                    {
                        slot: 0,
                        sticker_id: 20,
                        pattern: 148
                    }
                ],
                style: 5,
                variations: [],
                upgrade_level: 3
            };

            const result = Validator.validateEconItem(item);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject null or undefined items', () => {
            expect(Validator.validateEconItem(null).valid).toBe(false);
            expect(Validator.validateEconItem(undefined).valid).toBe(false);
            expect(Validator.validateEconItem('not an object').valid).toBe(false);
        });

        it('should reject items with invalid required fields', () => {
            const invalidItems = [
                { defindex: -1, paintindex: 44, paintseed: 661, paintwear: 0.15 },
                { defindex: WeaponType.AK_47, paintindex: -1, paintseed: 661, paintwear: 0.15 },
                { defindex: WeaponType.AK_47, paintindex: 44, paintseed: -1, paintwear: 0.15 },
                { defindex: WeaponType.AK_47, paintindex: 44, paintseed: 661, paintwear: -0.1 },
                { defindex: WeaponType.AK_47, paintindex: 44, paintseed: 661, paintwear: 1.5 }
            ];

            invalidItems.forEach(item => {
                const result = Validator.validateEconItem(item);
                expect(result.valid).toBe(false);
                expect(result.errors.length).toBeGreaterThan(0);
            });
        });

        it('should reject items with invalid optional fields', () => {
            const baseItem = {
                defindex: WeaponType.AK_47,
                paintindex: 44,
                paintseed: 661,
                paintwear: 0.15
            };

            const invalidItems = [
                { ...baseItem, accountid: -1 },
                { ...baseItem, itemid: -1 },
                { ...baseItem, quality: -1 },
                { ...baseItem, customname: 'a'.repeat(101) }, // Too long
                { ...baseItem, entindex: 'not a number' }
            ];

            invalidItems.forEach(item => {
                const result = Validator.validateEconItem(item);
                expect(result.valid).toBe(false);
                expect(result.errors.length).toBeGreaterThan(0);
            });
        });

        it('should generate warnings for unusual values', () => {
            const item = {
                defindex: 99999, // Unknown weapon
                paintindex: 70000, // Very high paint index
                paintseed: 2000, // High seed
                paintwear: 0.15
            };

            const result = Validator.validateEconItem(item);
            expect(result.valid).toBe(true);
            expect(result.warnings).toBeDefined();
            expect(result.warnings!.length).toBeGreaterThan(0);
        });
    });

    describe('validateSticker', () => {
        it('should validate a minimal valid sticker', () => {
            const sticker = {
                slot: 0,
                sticker_id: 1
            };

            const result = Validator.validateSticker(sticker);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should validate a complete valid sticker', () => {
            const sticker = {
                slot: 0,
                sticker_id: 1,
                wear: 0.1,
                scale: 1.2,
                rotation: 45.0,
                tint_id: 1,
                offset_x: 0.1,
                offset_y: -0.1,
                offset_z: 0.05,
                pattern: 10,
                highlight_reel: 1
            };

            const result = Validator.validateSticker(sticker);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject invalid stickers', () => {
            const invalidStickers = [
                null,
                undefined,
                'not an object',
                { slot: -1, sticker_id: 1 },
                { slot: 5, sticker_id: 1 }, // Slot too high
                { slot: 0, sticker_id: -1 },
                { slot: 0, sticker_id: 1, wear: -0.1 },
                { slot: 0, sticker_id: 1, wear: 1.5 },
                { slot: 0, sticker_id: 1, scale: 0 },
                { slot: 0, sticker_id: 1, scale: -1 }
            ];

            invalidStickers.forEach(sticker => {
                const result = Validator.validateSticker(sticker);
                expect(result.valid).toBe(false);
                expect(result.errors.length).toBeGreaterThan(0);
            });
        });

        it('should generate warnings for unusual values', () => {
            const sticker = {
                slot: 0,
                sticker_id: 1,
                scale: 15.0, // Very high scale
                rotation: 720, // Very high rotation
                offset_x: 50.0 // Very high offset
            };

            const result = Validator.validateSticker(sticker);
            expect(result.valid).toBe(true);
            expect(result.warnings).toBeDefined();
            expect(result.warnings!.length).toBeGreaterThan(0);
        });
    });

    describe('validateStickersArray', () => {
        it('should validate empty array', () => {
            const result = Validator.validateStickersArray([]);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should validate array with valid stickers', () => {
            const stickers = [
                { slot: 0, sticker_id: 1 },
                { slot: 1, sticker_id: 2 }
            ];

            const result = Validator.validateStickersArray(stickers);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject non-arrays', () => {
            const result = Validator.validateStickersArray('not an array' as any);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('stickers must be an array');
        });

        it('should detect duplicate slots', () => {
            const stickers = [
                { slot: 0, sticker_id: 1 },
                { slot: 0, sticker_id: 2 } // Duplicate slot
            ];

            const result = Validator.validateStickersArray(stickers);
            expect(result.valid).toBe(true); // Still valid, just a warning
            expect(result.warnings).toBeDefined();
            expect(result.warnings!.some(w => w.includes('duplicate slot'))).toBe(true);
        });

        it('should validate individual stickers in array', () => {
            const stickers = [
                { slot: 0, sticker_id: 1 },
                { slot: -1, sticker_id: 2 } // Invalid slot
            ];

            const result = Validator.validateStickersArray(stickers);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('slot must be a number between 0 and 4'))).toBe(true);
        });
    });

    describe('validateHexData', () => {
        it('should validate valid hex data', () => {
            const validHex = '00180720A106280138004001BFB3EDB2';
            const result = Validator.validateHexData(validHex);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject invalid hex data', () => {
            const invalidHexData = [
                '',
                'not hex',
                '123', // Odd length
                'GHIJ', // Invalid characters
                '12', // Too short
                'A'.repeat(5000) // Too long
            ];

            invalidHexData.forEach(hex => {
                const result = Validator.validateHexData(hex);
                expect(result.valid).toBe(false);
                expect(result.errors.length).toBeGreaterThan(0);
            });
        });
    });

    describe('validateInspectUrl', () => {
        it('should validate valid URLs', () => {
            const validUrls = [
                'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20M123456789A123456D123456',
                'csgo_econ_action_preview S123456789A123456D123456',
                '00180720A106280138004001BFB3EDB2'
            ];

            validUrls.forEach(url => {
                const result = Validator.validateInspectUrl(url);
                expect(result.valid).toBe(true);
                expect(result.errors).toHaveLength(0);
            });
        });

        it('should reject invalid URLs', () => {
            const invalidUrls = [
                '', // Empty URL
                'A'.repeat(3000) // Too long
            ];

            invalidUrls.forEach(url => {
                const result = Validator.validateInspectUrl(url);
                expect(result.valid).toBe(false);
                expect(result.errors.length).toBeGreaterThan(0);
            });
        });

        it('should generate warnings for suspicious URLs', () => {
            const suspiciousUrls = [
                'not a url', // No valid patterns
                'random text'
            ];

            suspiciousUrls.forEach(url => {
                const result = Validator.validateInspectUrl(url);
                expect(result.valid).toBe(true); // Valid but with warnings
                expect(result.warnings).toBeDefined();
                expect(result.warnings!.length).toBeGreaterThan(0);
            });
        });
    });

    describe('assertValid', () => {
        it('should not throw for valid items', () => {
            const item = {
                defindex: WeaponType.AK_47,
                paintindex: 44,
                paintseed: 661,
                paintwear: 0.15
            };

            expect(() => Validator.assertValid(item)).not.toThrow();
        });

        it('should throw ValidationError for invalid items', () => {
            const item = {
                defindex: -1,
                paintindex: 44,
                paintseed: 661,
                paintwear: 0.15
            };

            expect(() => Validator.assertValid(item)).toThrow(ValidationError);
        });
    });

    describe('assertValidHexData', () => {
        it('should not throw for valid hex data', () => {
            const hex = '00180720A106280138004001BFB3EDB2';
            expect(() => Validator.assertValidHexData(hex)).not.toThrow();
        });

        it('should throw ValidationError for invalid hex data', () => {
            const hex = 'invalid';
            expect(() => Validator.assertValidHexData(hex)).toThrow(ValidationError);
        });
    });
});
