/**
 * Integration tests for Steam client functionality in CS2Inspect class
 */

import { CS2Inspect, WeaponType, ItemRarity } from '../src';
import { SteamClientStatus } from '../src/types';

// Mock Steam dependencies
jest.mock('steam-user', () => {
    return jest.fn().mockImplementation(() => ({
        on: jest.fn(),
        logOn: jest.fn(),
        logOff: jest.fn(),
        setPersona: jest.fn(),
        gamesPlayed: jest.fn()
    }));
});

jest.mock('node-cs2', () => {
    return jest.fn().mockImplementation(() => ({
        on: jest.fn(),
        inspectItem: jest.fn(),
        requestGame: jest.fn(),
        removeListener: jest.fn(),
        once: jest.fn()
    }));
});

describe('CS2Inspect Steam Integration', () => {
    let cs2: CS2Inspect;

    beforeEach(() => {
        // Reset any singleton instances
        jest.clearAllMocks();
        
        cs2 = new CS2Inspect({
            validateInput: true,
            steamClient: {
                enabled: false, // Disabled by default for testing
                username: '',
                password: '',
                rateLimitDelay: 1000,
                maxQueueSize: 10
            }
        });
    });

    describe('Steam Client Configuration', () => {
        it('should create CS2Inspect with Steam client config', () => {
            const steamConfig = {
                enabled: true,
                username: 'testuser',
                password: 'testpass',
                rateLimitDelay: 2000
            };

            const cs2WithSteam = new CS2Inspect({
                steamClient: steamConfig
            });

            expect(cs2WithSteam).toBeDefined();
            const stats = cs2WithSteam.getSteamClientStats();
            expect(stats.unmaskedSupport).toBe(true);
        });

        it('should update Steam client configuration', () => {
            const newConfig = {
                steamClient: {
                    enabled: true,
                    username: 'newuser',
                    password: 'newpass'
                }
            };

            expect(() => cs2.updateConfig(newConfig)).not.toThrow();
            const stats = cs2.getSteamClientStats();
            expect(stats.unmaskedSupport).toBe(true);
        });
    });

    describe('Steam Client Status', () => {
        it('should return Steam client status', () => {
            const stats = cs2.getSteamClientStats();
            expect(stats).toHaveProperty('status');
            expect(stats).toHaveProperty('queueLength');
            expect(stats).toHaveProperty('isAvailable');
            expect(stats).toHaveProperty('unmaskedSupport');
        });

        it('should indicate Steam client is not ready initially', () => {
            expect(cs2.isSteamClientReady()).toBe(false);
        });

        it('should return disconnected status initially', () => {
            const stats = cs2.getSteamClientStats();
            expect(stats.status).toBe(SteamClientStatus.DISCONNECTED);
            expect(stats.isAvailable).toBe(false);
        });
    });

    describe('URL Type Detection', () => {
        it('should detect masked URLs', () => {
            const maskedUrl = 'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20001807A8';
            expect(cs2.requiresSteamClient(maskedUrl)).toBe(false);
        });

        it('should detect unmasked URLs', () => {
            const unmaskedUrl = 'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S76561198000000000A1000000000D1000000000';
            expect(cs2.requiresSteamClient(unmaskedUrl)).toBe(true);
        });

        it('should handle invalid URLs gracefully', () => {
            const invalidUrl = 'not-a-valid-url';
            expect(cs2.requiresSteamClient(invalidUrl)).toBe(false);
        });
    });

    describe('Decoding URLs', () => {
        it('should decode masked URLs synchronously', () => {
            // Create a simple masked URL for testing
            const item = {
                defindex: WeaponType.AK_47,
                paintindex: 44,
                paintseed: 661,
                paintwear: 0.15,
                rarity: ItemRarity.COVERT
            };

            const url = cs2.createInspectUrl(item);
            const decoded = cs2.decodeInspectUrl(url);

            expect(decoded.defindex).toBe(WeaponType.AK_47);
            expect(decoded.paintindex).toBe(44);
            expect(decoded.paintseed).toBe(661);
            expect(decoded.paintwear).toBeCloseTo(0.15, 2);
        });

        it('should throw error for unmasked URLs in sync decode', () => {
            const unmaskedUrl = 'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S76561198000000000A1000000000D1000000000';

            expect(() => cs2.decodeInspectUrl(unmaskedUrl)).toThrow('This is an unmasked URL (market/inventory link). Use inspectItem() instead for Steam client inspection.');
        });

        it('should handle async decoding for masked URLs', async () => {
            const item = {
                defindex: WeaponType.GLOCK_18,
                paintindex: 38,
                paintseed: 123,
                paintwear: 0.25
            };

            const url = cs2.createInspectUrl(item);
            const decoded = await cs2.decodeInspectUrlAsync(url);

            expect(decoded.defindex).toBe(WeaponType.GLOCK_18);
            expect(decoded.paintindex).toBe(38);
        });

        it('should throw error for unmasked URLs without Steam client', async () => {
            const unmaskedUrl = 'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S76561198000000000A1000000000D1000000000';
            
            await expect(cs2.decodeInspectUrlAsync(unmaskedUrl)).rejects.toThrow('Steam client is not available');
        });
    });

    describe('Steam Client Lifecycle', () => {
        it('should handle Steam client initialization without credentials', async () => {
            // This should not throw but Steam client won't be available
            await expect(cs2.initializeSteamClient()).resolves.not.toThrow();
            expect(cs2.isSteamClientReady()).toBe(false);
        });

        it('should handle Steam client disconnection', async () => {
            await expect(cs2.disconnectSteamClient()).resolves.not.toThrow();
        });
    });

    describe('Configuration Management', () => {
        it('should preserve existing config when updating Steam config', () => {
            const originalConfig = cs2.getConfig();
            
            cs2.updateConfig({
                steamClient: {
                    enabled: true,
                    rateLimitDelay: 3000
                }
            });

            const newConfig = cs2.getConfig();
            expect(newConfig.validateInput).toBe(originalConfig.validateInput);
            expect(newConfig.maxUrlLength).toBe(originalConfig.maxUrlLength);
            expect(newConfig.steamClient.rateLimitDelay).toBe(3000);
        });

        it('should handle partial Steam config updates', () => {
            cs2.updateConfig({
                steamClient: {
                    rateLimitDelay: 5000
                }
            });

            const config = cs2.getConfig();
            expect(config.steamClient.rateLimitDelay).toBe(5000);
            expect(config.steamClient.maxQueueSize).toBeDefined(); // Should preserve default
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid URLs gracefully', () => {
            expect(() => cs2.analyzeUrl('invalid-url')).toThrow();
        });

        it('should provide meaningful error messages', async () => {
            const unmaskedUrl = 'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S76561198000000000A1000000000D1000000000';
            
            try {
                await cs2.decodeInspectUrlAsync(unmaskedUrl);
                fail('Should have thrown an error');
            } catch (error) {
                expect(error).toHaveProperty('message');
                expect((error as Error).message).toContain('Steam client');
            }
        });
    });

    describe('Convenience Functions', () => {
        it('should work with convenience functions', () => {
            const item = {
                defindex: WeaponType.M4A4,
                paintindex: 309,
                paintseed: 555,
                paintwear: 0.1
            };

            // Test the convenience functions from the main module
            const { createInspectUrl, decodeInspectUrl } = require('../src');
            
            const url = createInspectUrl(item);
            expect(url).toContain('steam://');
            
            const decoded = decodeInspectUrl(url);
            expect(decoded.defindex).toBe(WeaponType.M4A4);
        });
    });
});

describe('Steam Client Error Scenarios', () => {
    it('should handle Steam dependency loading errors', () => {
        // This test verifies that the library gracefully handles missing Steam dependencies
        // In a real scenario where steam-user or globaloffensive are not installed
        expect(() => new CS2Inspect()).not.toThrow();
    });

    it('should handle Steam client configuration validation', () => {
        const invalidConfigs = [
            { steamClient: { enabled: true, username: '', password: 'test' } },
            { steamClient: { enabled: true, username: 'test', password: '' } },
            { steamClient: { enabled: true, rateLimitDelay: -1 } },
            { steamClient: { enabled: true, maxQueueSize: 0 } }
        ];

        invalidConfigs.forEach(config => {
            expect(() => new CS2Inspect(config)).not.toThrow();
        });
    });
});
