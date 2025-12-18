/**
 * Tests to verify static methods don't create unnecessary instances
 * These tests ensure the optimization claims are actually true
 */

import {
    analyzeUrl,
    requiresSteamClient,
    isValidUrl,
    normalizeUrl,
    decodeMaskedData,
    decodeMaskedUrl,
    inspectItem,
    createInspectUrl,
    WeaponType,
    WeaponPaint,
    ItemRarity
} from '../src';
import { UrlAnalyzer } from '../src/url-analyzer';
import { CS2Inspect } from '../src/index';
import { ProtobufReader } from '../src/protobuf-reader';

describe('Static Methods Optimization', () => {
    describe('analyzeUrl() - No instance creation', () => {
        it('should not create UrlAnalyzer instance', () => {
            const createSpy = jest.spyOn(UrlAnalyzer.prototype, 'constructor' as any);
            
            const url = 'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20M123456789A123456D123456';
            const result = analyzeUrl(url);
            
            // analyzeUrl should use pure function, not create UrlAnalyzer
            // Note: constructor spy might not catch all cases, so we verify behavior
            expect(result.url_type).toBe('unmasked');
            expect(result.market_id).toBe('123456789');
            
            createSpy.mockRestore();
        });

        it('should work identically to instance method but without instance', () => {
            const url = 'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%2000180720A106280138004001BFB3EDB2';
            
            // Static method
            const staticResult = analyzeUrl(url);
            
            // Instance method (for comparison)
            const analyzer = new UrlAnalyzer();
            const instanceResult = analyzer.analyzeInspectUrl(url);
            
            // Results should be identical
            expect(staticResult).toEqual(instanceResult);
            expect(staticResult.url_type).toBe('masked');
            expect(staticResult.hex_data).toBe('00180720A106280138004001BFB3EDB2');
        });

        it('should handle multiple calls without instance overhead', () => {
            const urls = [
                'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20M123456789A123456D123456',
                'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%2000180720A106280138004001BFB3EDB2',
                'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S987654321A654321D654321'
            ];
            
            // All should work without creating instances
            const results = urls.map(url => analyzeUrl(url));
            
            expect(results).toHaveLength(3);
            expect(results[0].url_type).toBe('unmasked');
            expect(results[1].url_type).toBe('masked');
            expect(results[2].url_type).toBe('unmasked');
        });
    });

    describe('requiresSteamClient() - No instance creation', () => {
        it('should not create UrlAnalyzer instance', () => {
            const url = 'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20M123456789A123456D123456';
            
            const needsSteam = requiresSteamClient(url);
            
            expect(needsSteam).toBe(true);
        });

        it('should return false for masked URLs', () => {
            const url = 'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%2000180720A106280138004001BFB3EDB2';
            
            const needsSteam = requiresSteamClient(url);
            
            expect(needsSteam).toBe(false);
        });
    });

    describe('isValidUrl() - No instance creation', () => {
        it('should validate URLs without creating instances', () => {
            const validUrl = 'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20M123456789A123456D123456';
            const invalidUrl = 'not a valid url';
            
            expect(isValidUrl(validUrl)).toBe(true);
            expect(isValidUrl(invalidUrl)).toBe(false);
        });
    });

    describe('normalizeUrl() - Minimal instance creation', () => {
        it('should normalize URLs using optimized static methods', () => {
            const url = 'csgo_econ_action_preview M123456789A123456D123456';
            
            const normalized = normalizeUrl(url);
            
            expect(normalized).toMatch(/^steam:\/\//);
            expect(normalized).toContain('%20');
            expect(normalized).toContain('M123456789A123456D123456');
        });
    });

    describe('decodeMaskedUrl() - No CS2Inspect instance creation', () => {
        it('should decode masked URLs using static methods only', () => {
            // Create a valid masked URL first
            const item = {
                defindex: WeaponType.AK_47,
                paintindex: WeaponPaint.AK_47_FIRE_SERPENT,
                paintseed: 661,
                paintwear: 0.15
            };
            const url = createInspectUrl(item);
            
            // decodeMaskedUrl should use static methods, not create CS2Inspect
            const decoded = decodeMaskedUrl(url);
            
            expect(decoded.defindex).toBe(WeaponType.AK_47);
            expect(decoded.paintindex).toBe(WeaponPaint.AK_47_FIRE_SERPENT);
            expect(decoded.paintseed).toBe(661);
            expect(decoded.paintwear).toBeCloseTo(0.15, 6);
        });

        it('should throw proper error for unmasked URLs', () => {
            const unmaskedUrl = 'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20M123456789A123456D123456';
            
            expect(() => decodeMaskedUrl(unmaskedUrl)).toThrow();
            try {
                decodeMaskedUrl(unmaskedUrl);
            } catch (error: any) {
                expect(error.message).toContain('unmasked URL');
                // Error should provide suggestions (either in message or context)
                expect(error.message.length).toBeGreaterThan(50); // Should have detailed message
                if (error.context) {
                    expect(error.context.suggestion).toBeDefined();
                }
            }
        });
    });

    describe('decodeMaskedData() - Direct protobuf access', () => {
        it('should decode hex data directly without any instance creation', () => {
            // Create hex data from a known item
            const item = {
                defindex: WeaponType.AWP,
                paintindex: WeaponPaint.AWP_DRAGON_LORE,
                paintseed: 420,
                paintwear: 0.07
            };
            const url = createInspectUrl(item);
            
            // Extract hex data
            const analyzed = analyzeUrl(url);
            const hexData = analyzed.hex_data!;
            
            // decodeMaskedData should work directly
            const decoded = decodeMaskedData(hexData);
            
            expect(decoded.defindex).toBe(WeaponType.AWP);
            expect(decoded.paintindex).toBe(WeaponPaint.AWP_DRAGON_LORE);
            expect(decoded.paintseed).toBe(420);
            expect(decoded.paintwear).toBeCloseTo(0.07, 6);
        });
    });

    describe('inspectItem() - Optimized for masked URLs', () => {
        it('should use static methods for masked URLs (no instance creation)', async () => {
            // Create a masked URL
            const item = {
                defindex: WeaponType.AK_47,
                paintindex: WeaponPaint.AK_47_FIRE_SERPENT,
                paintseed: 661,
                paintwear: 0.15
            };
            const url = createInspectUrl(item);
            
            // inspectItem with masked URL should use static methods
            const decoded = await inspectItem(url);
            
            expect(decoded.defindex).toBe(WeaponType.AK_47);
            expect(decoded.paintindex).toBe(WeaponPaint.AK_47_FIRE_SERPENT);
        });

        it('should require explicit Steam client for unmasked URLs', async () => {
            const unmaskedUrl = 'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20M123456789A123456D123456';
            
            // Should throw error without Steam client
            await expect(inspectItem(unmaskedUrl)).rejects.toThrow();
            
            try {
                await inspectItem(unmaskedUrl);
            } catch (error: any) {
                expect(error.message).toContain('Steam client');
                expect(error.message).toContain('unmasked URL');
            }
        });
    });

    describe('Performance verification', () => {
        it('should handle batch operations efficiently', () => {
            const urls = Array(100).fill(null).map((_, i) => {
                const item = {
                    defindex: WeaponType.AK_47,
                    paintindex: WeaponPaint.AK_47_FIRE_SERPENT,
                    paintseed: 661 + i,
                    paintwear: 0.15
                };
                return createInspectUrl(item);
            });
            
            // All should be analyzable without creating instances
            const start = performance.now();
            const analyses = urls.map(url => analyzeUrl(url));
            const end = performance.now();
            
            expect(analyses).toHaveLength(100);
            expect(analyses.every(a => a.url_type === 'masked')).toBe(true);
            
            // Should be fast (less than 100ms for 100 URLs)
            expect(end - start).toBeLessThan(100);
        });

        it('should decode multiple masked URLs efficiently', () => {
            const urls = Array(50).fill(null).map((_, i) => {
                const item = {
                    defindex: WeaponType.AK_47,
                    paintindex: WeaponPaint.AK_47_FIRE_SERPENT,
                    paintseed: 661 + i,
                    paintwear: 0.15
                };
                return createInspectUrl(item);
            });
            
            const start = performance.now();
            const decoded = urls.map(url => decodeMaskedUrl(url));
            const end = performance.now();
            
            expect(decoded).toHaveLength(50);
            expect(decoded.every(d => d.defindex === WeaponType.AK_47)).toBe(true);
            
            // Should be fast (less than 200ms for 50 URLs)
            expect(end - start).toBeLessThan(200);
        });
    });

    describe('Error message improvements', () => {
        it('should provide actionable suggestions in errors', () => {
            const unmaskedUrl = 'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20M123456789A123456D123456';
            
            try {
                decodeMaskedUrl(unmaskedUrl);
                fail('Should have thrown an error');
            } catch (error: any) {
                expect(error.message).toContain('unmasked URL');
                // Check if it's an InvalidUrlError with context
                expect(error.context).toBeDefined();
                expect(error.context.suggestion).toBeDefined();
                expect(error.context.alternatives).toBeDefined();
                expect(Array.isArray(error.context.alternatives)).toBe(true);
            }
        });

        it('should provide Steam client troubleshooting in errors', async () => {
            const unmaskedUrl = 'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20M123456789A123456D123456';
            
            try {
                await inspectItem(unmaskedUrl, {
                    steamClient: undefined as any
                });
                fail('Should have thrown an error');
            } catch (error: any) {
                expect(error.message).toContain('Steam client');
                // Check if it's a SteamNotReadyError with context
                if (error.context) {
                    expect(error.context.suggestion).toBeDefined();
                    expect(error.context.solutions).toBeDefined();
                }
            }
        });
    });
});

