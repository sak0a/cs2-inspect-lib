/**
 * Integration tests for the complete library
 */

import { CS2Inspect, WeaponType, ItemRarity, EconItem } from '../src';
import { ValidationError } from '../src/errors';

describe('Integration Tests', () => {
    let cs2: CS2Inspect;

    beforeEach(() => {
        cs2 = new CS2Inspect({ validateInput: true });
    });

    describe('complete encode/decode cycle', () => {
        it('should handle minimal item', () => {
            const originalItem: EconItem = {
                defindex: WeaponType.AK_47,
                paintindex: 44,
                paintseed: 661,
                paintwear: 0.15
            };

            const url = cs2.createInspectUrl(originalItem);
            expect(url).toMatch(/^steam:\/\/rungame\/730\/76561202255233023\/\+csgo_econ_action_preview%20[0-9A-F]+$/);

            const decoded = cs2.decodeInspectUrl(url);
            expect(decoded.defindex).toBe(originalItem.defindex);
            expect(decoded.paintindex).toBe(originalItem.paintindex);
            expect(decoded.paintseed).toBe(originalItem.paintseed);
            expect(decoded.paintwear).toBeCloseTo(originalItem.paintwear, 6);
        });

        it('should handle complex item with all fields', () => {
            const originalItem: EconItem = {
                accountid: 123456789,
                itemid: BigInt('9876543210'),
                defindex: WeaponType.AWP,
                paintindex: 309,
                rarity: ItemRarity.COVERT,
                quality: 4,
                paintwear: 0.15,
                paintseed: 420,
                killeaterscoretype: 1,
                killeatervalue: 1337,
                customname: 'Dragon Lore ★',
                inventory: 2147483647,
                origin: 8,
                questid: 12345,
                dropreason: 3,
                musicindex: 1,
                entindex: -1,
                petindex: 5,
                stickers: [
                    {
                        slot: 0,
                        sticker_id: 5032,
                        wear: 0.15,
                        scale: 1.2,
                        rotation: 45.0,
                        tint_id: 1,
                        offset_x: 0.1,
                        offset_y: -0.1,
                        offset_z: 0.05,
                        pattern: 10,
                        highlight_reel: 1
                    },
                    {
                        slot: 1,
                        sticker_id: 76,
                        wear: 0.0,
                        scale: 0.8,
                        rotation: -30.0,
                        tint_id: 2,
                        offset_x: 0.3,
                        offset_y: -0.1,
                        offset_z: 0.1,
                        pattern: 20,
                        highlight_reel: 2
                    }
                ],
                keychains: [
                    {
                        slot: 0,
                        sticker_id: 20,
                        wear: 0.05,
                        scale: 1.1,
                        rotation: 90.0,
                        tint_id: 3,
                        offset_x: 0.08810679614543915,
                        offset_y: 0.1325242668390274,
                        offset_z: 0.0,
                        pattern: 148,
                        highlight_reel: 3
                    }
                ],
                style: 7,
                variations: [
                    {
                        slot: 0,
                        sticker_id: 100,
                        wear: 0.25,
                        scale: 1.5,
                        rotation: 180.0,
                        tint_id: 4,
                        offset_x: 0.5,
                        offset_y: -0.5,
                        offset_z: 0.25,
                        pattern: 50,
                        highlight_reel: 4
                    }
                ],
                upgrade_level: 10
            };

            const url = cs2.createInspectUrl(originalItem);
            const decoded = cs2.decodeInspectUrl(url);

            // Verify all basic fields
            expect(decoded.accountid).toBe(originalItem.accountid);
            expect(decoded.itemid).toBe(originalItem.itemid);
            expect(decoded.defindex).toBe(originalItem.defindex);
            expect(decoded.paintindex).toBe(originalItem.paintindex);
            expect(decoded.rarity).toBe(originalItem.rarity);
            expect(decoded.quality).toBe(originalItem.quality);
            expect(decoded.paintwear).toBeCloseTo(originalItem.paintwear, 6);
            expect(decoded.paintseed).toBe(originalItem.paintseed);
            expect(decoded.killeaterscoretype).toBe(originalItem.killeaterscoretype);
            expect(decoded.killeatervalue).toBe(originalItem.killeatervalue);
            expect(decoded.customname).toBe(originalItem.customname);
            expect(decoded.inventory).toBe(originalItem.inventory);
            expect(decoded.origin).toBe(originalItem.origin);
            expect(decoded.questid).toBe(originalItem.questid);
            expect(decoded.dropreason).toBe(originalItem.dropreason);
            expect(decoded.musicindex).toBe(originalItem.musicindex);
            expect(decoded.entindex).toBe(originalItem.entindex);
            expect(decoded.petindex).toBe(originalItem.petindex);
            expect(decoded.style).toBe(originalItem.style);
            expect(decoded.upgrade_level).toBe(originalItem.upgrade_level);

            // Verify arrays
            expect(decoded.stickers).toHaveLength(2);
            expect(decoded.keychains).toHaveLength(1);
            expect(decoded.variations).toHaveLength(1);

            // Verify sticker details
            const decodedSticker = decoded.stickers![0];
            const originalSticker = originalItem.stickers![0];
            expect(decodedSticker.slot).toBe(originalSticker.slot);
            expect(decodedSticker.sticker_id).toBe(originalSticker.sticker_id);
            expect(decodedSticker.wear).toBeCloseTo(originalSticker.wear!, 6);
            expect(decodedSticker.scale).toBeCloseTo(originalSticker.scale!, 6);
            expect(decodedSticker.rotation).toBeCloseTo(originalSticker.rotation!, 6);
            expect(decodedSticker.tint_id).toBe(originalSticker.tint_id);
            expect(decodedSticker.offset_x).toBeCloseTo(originalSticker.offset_x!, 6);
            expect(decodedSticker.offset_y).toBeCloseTo(originalSticker.offset_y!, 6);
            expect(decodedSticker.offset_z).toBeCloseTo(originalSticker.offset_z!, 6);
            expect(decodedSticker.pattern).toBe(originalSticker.pattern);
            expect(decodedSticker.highlight_reel).toBe(originalSticker.highlight_reel);

            // Verify keychain details
            const decodedKeychain = decoded.keychains![0];
            const originalKeychain = originalItem.keychains![0];
            expect(decodedKeychain.highlight_reel).toBe(originalKeychain.highlight_reel);

            // Verify variation details
            const decodedVariation = decoded.variations![0];
            const originalVariation = originalItem.variations![0];
            expect(decodedVariation.highlight_reel).toBe(originalVariation.highlight_reel);
        });

        it('should handle Unicode in custom names', () => {
            const originalItem: EconItem = {
                defindex: WeaponType.AK_47,
                paintindex: 44,
                paintseed: 661,
                paintwear: 0.15,
                customname: '🔥 Fire Serpent 🐍 ★'
            };

            const url = cs2.createInspectUrl(originalItem);
            const decoded = cs2.decodeInspectUrl(url);

            expect(decoded.customname).toBe(originalItem.customname);
        });

        it('should handle edge case numeric values', () => {
            const originalItem: EconItem = {
                defindex: 65535, // Max uint16
                paintindex: 65535,
                paintseed: 1000,
                paintwear: 1.0, // Max wear
                itemid: BigInt('18446744073709551615'), // Max uint64
                accountid: 2147483647, // Max int32
                entindex: -2147483648, // Min int32
                upgrade_level: 255
            };

            const url = cs2.createInspectUrl(originalItem);
            const decoded = cs2.decodeInspectUrl(url);

            expect(decoded.defindex).toBe(originalItem.defindex);
            expect(decoded.paintindex).toBe(originalItem.paintindex);
            expect(decoded.paintseed).toBe(originalItem.paintseed);
            expect(decoded.paintwear).toBeCloseTo(originalItem.paintwear, 6);
            expect(decoded.itemid).toBe(originalItem.itemid);
            expect(decoded.accountid).toBe(originalItem.accountid);
            expect(decoded.entindex).toBe(originalItem.entindex);
            expect(decoded.upgrade_level).toBe(originalItem.upgrade_level);
        });
    });

    describe('validation integration', () => {
        it('should validate during encoding', () => {
            const invalidItem = {
                defindex: -1, // Invalid
                paintindex: 44,
                paintseed: 661,
                paintwear: 0.15
            };

            expect(() => cs2.createInspectUrl(invalidItem)).toThrow(ValidationError);
        });

        it('should validate during decoding', () => {
            // Create a valid item first
            const validItem: EconItem = {
                defindex: WeaponType.AK_47,
                paintindex: 44,
                paintseed: 661,
                paintwear: 0.15
            };

            const url = cs2.createInspectUrl(validItem);
            
            // Should decode successfully
            expect(() => cs2.decodeInspectUrl(url)).not.toThrow();

            // Test with invalid hex data
            const invalidUrl = 'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20invalid';
            expect(() => cs2.decodeInspectUrl(invalidUrl)).toThrow();
        });

        it('should work with validation disabled', () => {
            const lenientCs2 = new CS2Inspect({ validateInput: false });
            
            const questionableItem = {
                defindex: 99999, // Unknown weapon
                paintindex: 70000, // Very high paint index
                paintseed: 2000, // High seed
                paintwear: 0.15
            };

            // Should not throw with validation disabled
            expect(() => lenientCs2.createInspectUrl(questionableItem)).not.toThrow();
        });
    });

    describe('URL analysis integration', () => {
        it('should analyze generated URLs', () => {
            const item: EconItem = {
                defindex: WeaponType.AK_47,
                paintindex: 44,
                paintseed: 661,
                paintwear: 0.15
            };

            const url = cs2.createInspectUrl(item);
            const analyzed = cs2.analyzeUrl(url);

            expect(analyzed.url_type).toBe('masked');
            expect(analyzed.is_quoted).toBe(true);
            expect(analyzed.hex_data).toBeDefined();
            expect(analyzed.hex_data!.length).toBeGreaterThan(0);
        });

        it('should normalize and decode URLs', () => {
            const item: EconItem = {
                defindex: WeaponType.AK_47,
                paintindex: 44,
                paintseed: 661,
                paintwear: 0.15
            };

            const url = cs2.createInspectUrl(item);
            
            // Create an unquoted version
            const unquotedUrl = url.replace('%20', ' ');
            
            // Should still be able to decode
            const decoded = cs2.decodeInspectUrl(unquotedUrl);
            expect(decoded.defindex).toBe(item.defindex);

            // Normalize should work
            const normalized = cs2.normalizeUrl(unquotedUrl);
            expect(normalized).toBe(url);
        });
    });

    describe('error handling integration', () => {
        it('should provide detailed error context', () => {
            const invalidItem = {
                defindex: -1,
                paintindex: -1,
                paintseed: -1,
                paintwear: 2.0
            };

            try {
                cs2.createInspectUrl(invalidItem);
                fail('Should have thrown ValidationError');
            } catch (error) {
                expect(error).toBeInstanceOf(ValidationError);
                const validationError = error as ValidationError;
                expect(validationError.context).toBeDefined();
                if (validationError.context) {
                    expect(validationError.context.errors).toBeInstanceOf(Array);
                    expect(validationError.context.errors.length).toBeGreaterThan(0);
                }
            }
        });

        it('should handle corrupted protobuf data', () => {
            const corruptedUrl = 'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20001807CORRUPTED';

            // This will throw InvalidUrlError first due to URL analysis, then DecodingError during protobuf parsing
            expect(() => cs2.decodeInspectUrl(corruptedUrl)).toThrow();
        });

        it('should handle URL format errors', () => {
            const invalidUrls = [
                '',
                'not a url',
                'steam://invalid',
                'csgo_econ_action_preview'
            ];

            invalidUrls.forEach(url => {
                expect(() => cs2.decodeInspectUrl(url)).toThrow();
            });
        });
    });

    describe('configuration integration', () => {
        it('should respect custom configuration', () => {
            const customCs2 = new CS2Inspect({
                validateInput: true,
                maxCustomNameLength: 10,
                maxUrlLength: 100,
                enableLogging: false
            });

            const itemWithLongName: EconItem = {
                defindex: WeaponType.AK_47,
                paintindex: 44,
                paintseed: 661,
                paintwear: 0.15,
                customname: 'This name is too long'
            };

            expect(() => customCs2.createInspectUrl(itemWithLongName)).toThrow(); // Can be ValidationError or EncodingError
        });

        it('should update configuration', () => {
            cs2.updateConfig({ maxCustomNameLength: 5 });
            
            const config = cs2.getConfig();
            expect(config.maxCustomNameLength).toBe(5);

            const itemWithLongName: EconItem = {
                defindex: WeaponType.AK_47,
                paintindex: 44,
                paintseed: 661,
                paintwear: 0.15,
                customname: 'Too long'
            };

            expect(() => cs2.createInspectUrl(itemWithLongName)).toThrow(); // Can be ValidationError or EncodingError
        });
    });

    describe('real-world scenarios', () => {
        it('should handle typical market listing URL', () => {
            const marketUrl = 'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20M123456789A987654321D456789123';
            
            const analyzed = cs2.analyzeUrl(marketUrl);
            expect(analyzed.url_type).toBe('unmasked');
            expect(analyzed.market_id).toBe('123456789');
            expect(analyzed.asset_id).toBe('987654321');
            expect(analyzed.class_id).toBe('456789123');
        });

        it('should handle typical inventory URL', () => {
            const inventoryUrl = 'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S76561198123456789A987654321D456789123';
            
            const analyzed = cs2.analyzeUrl(inventoryUrl);
            expect(analyzed.url_type).toBe('unmasked');
            expect(analyzed.owner_id).toBe('76561198123456789');
            expect(analyzed.asset_id).toBe('987654321');
            expect(analyzed.class_id).toBe('456789123');
        });

        it('should handle copy-pasted URLs with extra whitespace', () => {
            const messyUrl = '  steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20M123456789A987654321D456789123  ';

            const analyzed = cs2.analyzeUrl(messyUrl);
            expect(analyzed.url_type).toBe('unmasked');
            expect(analyzed.market_id).toBe('123456789');
        });
    });

    describe('Steam client integration', () => {
        it('should create CS2Inspect with Steam client configuration', () => {
            const steamCs2 = new CS2Inspect({
                validateInput: true,
                steamClient: {
                    enabled: false, // Disabled for testing
                    username: 'testuser',
                    password: 'testpass',
                    rateLimitDelay: 2000,
                    maxQueueSize: 50
                }
            });

            expect(steamCs2).toBeDefined();
            const stats = steamCs2.getSteamClientStats();
            expect(stats).toHaveProperty('status');
            expect(stats).toHaveProperty('unmaskedSupport');
        });

        it('should detect URLs that require Steam client', () => {
            const maskedUrl = cs2.createInspectUrl({
                defindex: WeaponType.AK_47,
                paintindex: 44,
                paintseed: 661,
                paintwear: 0.15
            });

            const unmaskedUrl = 'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S76561198123456789A987654321D456789123';

            expect(cs2.requiresSteamClient(maskedUrl)).toBe(false);
            expect(cs2.requiresSteamClient(unmaskedUrl)).toBe(true);
        });

        it('should handle Steam client status queries', () => {
            const stats = cs2.getSteamClientStats();
            expect(stats.isAvailable).toBe(false); // Not configured
            expect(stats.unmaskedSupport).toBe(false); // No credentials
            expect(stats.queueLength).toBe(0);
        });

        it('should handle configuration updates with Steam client', () => {
            const originalConfig = cs2.getConfig();

            cs2.updateConfig({
                steamClient: {
                    enabled: true,
                    rateLimitDelay: 3000
                }
            });

            const newConfig = cs2.getConfig();
            expect(newConfig.validateInput).toBe(originalConfig.validateInput);
            expect(newConfig.steamClient.rateLimitDelay).toBe(3000);
            expect(newConfig.steamClient.enabled).toBe(true);
        });
    });
});
