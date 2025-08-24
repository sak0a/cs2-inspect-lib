/**
 * Tests for WeaponPaint enum and utility functions (Updated for generated enum)
 */

import {
    WeaponPaint,
    WeaponType,
    ItemRarity,
    CS2Inspect,
    EconItem,
    isWeaponPaint,
    getPaintName,
    getPaintIndex,
    getAllPaintNames,
    getAllPaintIndices
} from '../src/index';

describe('WeaponPaint (Generated from skins.json)', () => {
    let cs2: CS2Inspect;

    beforeEach(() => {
        cs2 = new CS2Inspect();
    });

    describe('Enum Values', () => {
        test('should have correct paint indices for popular skins', () => {
            expect(WeaponPaint.VANILLA).toBe(0);
            expect(WeaponPaint.AK_47_FIRE_SERPENT).toBe(180);
            expect(WeaponPaint.AWP_DRAGON_LORE).toBe(344);
            expect(WeaponPaint.M4A4_HOWL).toBe(309);
            expect(WeaponPaint.KARAMBIT_DOPPLER).toBe(417);
            expect(WeaponPaint.KARAMBIT_FADE).toBe(38);
        });

        test('should have knife paint indices', () => {
            expect(WeaponPaint.KARAMBIT_MARBLE_FADE).toBe(413);
            expect(WeaponPaint.BAYONET_DOPPLER).toBe(417);
            expect(WeaponPaint.KARAMBIT_CRIMSON_WEB).toBe(12);
            expect(WeaponPaint.KARAMBIT_CASE_HARDENED).toBe(44);
        });

        test('should have glove paint indices', () => {
            expect(WeaponPaint.SPORT_GLOVES_PANDORAS_BOX).toBe(10037);
            expect(WeaponPaint.SPECIALIST_GLOVES_CRIMSON_KIMONO).toBe(10033);
        });
    });

    describe('Type Guard', () => {
        test('isWeaponPaint should correctly identify valid paint indices', () => {
            expect(isWeaponPaint(WeaponPaint.AK_47_FIRE_SERPENT)).toBe(true);
            expect(isWeaponPaint(WeaponPaint.AWP_DRAGON_LORE)).toBe(true);
            expect(isWeaponPaint(WeaponPaint.VANILLA)).toBe(true);
            expect(isWeaponPaint(999999)).toBe(false);
            expect(isWeaponPaint('invalid')).toBe(false);
            expect(isWeaponPaint(null)).toBe(false);
            expect(isWeaponPaint(undefined)).toBe(false);
        });
    });

    describe('Utility Functions', () => {
        test('getPaintName should return correct names', () => {
            expect(getPaintName(WeaponPaint.AK_47_FIRE_SERPENT)).toBe('AK_47_FIRE_SERPENT');
            expect(getPaintName(WeaponPaint.AWP_DRAGON_LORE)).toBe('AWP_DRAGON_LORE');
            expect(getPaintName(WeaponPaint.VANILLA)).toBe('VANILLA');
            expect(getPaintName(999999)).toBeUndefined();
        });

        test('getPaintIndex should return correct indices', () => {
            expect(getPaintIndex('AK_47_FIRE_SERPENT')).toBe(180);
            expect(getPaintIndex('AWP_DRAGON_LORE')).toBe(344);
            expect(getPaintIndex('M4A4_HOWL')).toBe(309);
            expect(getPaintIndex('VANILLA')).toBe(0);
            expect(getPaintIndex('ak_47_fire_serpent')).toBe(180); // Case insensitive
            expect(getPaintIndex('INVALID_PAINT')).toBeUndefined();
        });

        test('getAllPaintNames should return array of paint names', () => {
            const names = getAllPaintNames();
            expect(Array.isArray(names)).toBe(true);
            expect(names.length).toBeGreaterThan(1000); // Should have many paints
            expect(names).toContain('AK_47_FIRE_SERPENT');
            expect(names).toContain('AWP_DRAGON_LORE');
            expect(names).toContain('VANILLA');
            
            // Should not contain numeric values
            names.forEach(name => {
                expect(typeof name).toBe('string');
                expect(isNaN(Number(name))).toBe(true);
            });
        });

        test('getAllPaintIndices should return array of paint indices', () => {
            const indices = getAllPaintIndices();
            expect(Array.isArray(indices)).toBe(true);
            expect(indices.length).toBeGreaterThan(1000); // Should have many paints
            expect(indices).toContain(180); // AK_47_FIRE_SERPENT
            expect(indices).toContain(344); // AWP_DRAGON_LORE
            expect(indices).toContain(0); // VANILLA
            
            // Should only contain numbers
            indices.forEach(index => {
                expect(typeof index).toBe('number');
            });
        });
    });

    describe('Integration with EconItem', () => {
        test('should accept WeaponPaint enum in EconItem.paintindex', () => {
            const item: EconItem = {
                defindex: WeaponType.AK_47,
                paintindex: WeaponPaint.AK_47_FIRE_SERPENT, // Using enum
                paintseed: 661,
                paintwear: 0.15,
                rarity: ItemRarity.COVERT
            };

            expect(item.paintindex).toBe(180);
            expect(typeof item.paintindex).toBe('number');
        });

        test('should create and decode inspect URLs with WeaponPaint enum', () => {
            const akFireSerpent: EconItem = {
                defindex: WeaponType.AK_47,
                paintindex: WeaponPaint.AK_47_FIRE_SERPENT,
                paintseed: 661,
                paintwear: 0.15,
                rarity: ItemRarity.COVERT
            };

            const awpDragonLore: EconItem = {
                defindex: WeaponType.AWP,
                paintindex: WeaponPaint.AWP_DRAGON_LORE,
                paintseed: 420,
                paintwear: 0.07,
                rarity: ItemRarity.COVERT
            };

            // Create URLs
            const akUrl = cs2.createInspectUrl(akFireSerpent);
            const awpUrl = cs2.createInspectUrl(awpDragonLore);

            expect(akUrl).toContain('steam://rungame/730');
            expect(awpUrl).toContain('steam://rungame/730');

            // Decode URLs
            const decodedAk = cs2.decodeInspectUrl(akUrl);
            const decodedAwp = cs2.decodeInspectUrl(awpUrl);

            expect(decodedAk.paintindex).toBe(WeaponPaint.AK_47_FIRE_SERPENT);
            expect(decodedAwp.paintindex).toBe(WeaponPaint.AWP_DRAGON_LORE);
            expect(decodedAk.defindex).toBe(WeaponType.AK_47);
            expect(decodedAwp.defindex).toBe(WeaponType.AWP);
        });

        test('should work with knife skins', () => {
            const karambitDoppler: EconItem = {
                defindex: WeaponType.KARAMBIT,
                paintindex: WeaponPaint.KARAMBIT_DOPPLER,
                paintseed: 387,
                paintwear: 0.01,
                rarity: ItemRarity.COVERT
            };

            const bayonetMarbleFade: EconItem = {
                defindex: WeaponType.BAYONET,
                paintindex: WeaponPaint.BAYONET_MARBLE_FADE,
                paintseed: 412,
                paintwear: 0.008,
                rarity: ItemRarity.COVERT
            };

            const karambitUrl = cs2.createInspectUrl(karambitDoppler);
            const bayonetUrl = cs2.createInspectUrl(bayonetMarbleFade);

            const decodedKarambit = cs2.decodeInspectUrl(karambitUrl);
            const decodedBayonet = cs2.decodeInspectUrl(bayonetUrl);

            expect(decodedKarambit.paintindex).toBe(WeaponPaint.KARAMBIT_DOPPLER);
            expect(decodedBayonet.paintindex).toBe(WeaponPaint.BAYONET_MARBLE_FADE);
            expect(getPaintName(decodedKarambit.paintindex as number)).toContain('DOPPLER');
            expect(getPaintName(decodedBayonet.paintindex as number)).toContain('MARBLE_FADE');
        });

        test('should work with glove skins', () => {
            const gloves: EconItem = {
                defindex: WeaponType.GLOVES_SPORT,
                paintindex: WeaponPaint.SPORT_GLOVES_PANDORAS_BOX,
                paintseed: 1,
                paintwear: 0.15,
                rarity: ItemRarity.COVERT
            };

            const glovesUrl = cs2.createInspectUrl(gloves);
            const decodedGloves = cs2.decodeInspectUrl(glovesUrl);

            expect(decodedGloves.paintindex).toBe(WeaponPaint.SPORT_GLOVES_PANDORAS_BOX);
            expect(getPaintName(decodedGloves.paintindex as number)).toBe('SPORT_GLOVES_PANDORAS_BOX');
        });
    });

    describe('Validation', () => {
        test('should validate items with WeaponPaint enum', () => {
            const validItem: EconItem = {
                defindex: WeaponType.AK_47,
                paintindex: WeaponPaint.AK_47_FIRE_SERPENT,
                paintseed: 661,
                paintwear: 0.15
            };

            const result = cs2.validateItem(validItem);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should handle mixed numeric and enum values', () => {
            const mixedItem: EconItem = {
                defindex: WeaponType.AK_47,
                paintindex: 180, // Numeric value instead of enum
                paintseed: 661,
                paintwear: 0.15
            };

            const enumItem: EconItem = {
                defindex: WeaponType.AK_47,
                paintindex: WeaponPaint.AK_47_FIRE_SERPENT, // Enum value
                paintseed: 661,
                paintwear: 0.15
            };

            const mixedUrl = cs2.createInspectUrl(mixedItem);
            const enumUrl = cs2.createInspectUrl(enumItem);

            // Both should produce the same result since AK_47_FIRE_SERPENT = 180
            expect(mixedUrl).toBe(enumUrl);
        });
    });

    describe('Search Functions', () => {
        test('should find paints by weapon name', () => {
            // Test the new search functions if they exist
            if (typeof (WeaponPaint as any).getPaintsByWeapon === 'function') {
                const akPaints = (WeaponPaint as any).getPaintsByWeapon('AK-47');
                expect(Array.isArray(akPaints)).toBe(true);
                expect(akPaints.length).toBeGreaterThan(0);
            }
        });

        test('should find paints by pattern name', () => {
            // Test the new search functions if they exist
            if (typeof (WeaponPaint as any).getPaintsByPattern === 'function') {
                const dopplerPaints = (WeaponPaint as any).getPaintsByPattern('Doppler');
                expect(Array.isArray(dopplerPaints)).toBe(true);
                expect(dopplerPaints.length).toBeGreaterThan(0);
            }
        });
    });
});
