/**
 * Tests for Steam client functionality
 */

import { SteamClient } from '../src/steam-client';
import { SteamClientManager } from '../src/steam-client-manager';
import { 
    SteamClientStatus, 
    SteamClientConfig, 
    AnalyzedInspectURL 
} from '../src/types';
import { 
    SteamAuthenticationError, 
    SteamQueueFullError, 
    SteamNotReadyError 
} from '../src/errors';

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

jest.mock('globaloffensive', () => {
    return jest.fn().mockImplementation(() => ({
        on: jest.fn(),
        inspectItem: jest.fn(),
        requestGame: jest.fn(),
        removeListener: jest.fn(),
        once: jest.fn()
    }));
});

describe('SteamClient', () => {
    beforeEach(() => {
        // Reset singleton instance before each test
        SteamClient.resetInstance();
        jest.clearAllMocks();
    });

    describe('getInstance', () => {
        it('should return singleton instance', () => {
            const instance1 = SteamClient.getInstance();
            const instance2 = SteamClient.getInstance();
            expect(instance1).toBe(instance2);
        });

        it('should accept configuration', () => {
            const config: SteamClientConfig = {
                username: 'testuser',
                password: 'testpass',
                rateLimitDelay: 2000
            };
            const instance = SteamClient.getInstance(config);
            expect(instance).toBeDefined();
        });
    });

    describe('connect', () => {
        it('should throw error without credentials', async () => {
            const client = SteamClient.getInstance();
            await expect(client.connect()).rejects.toThrow(SteamAuthenticationError);
        });

        it('should throw error with empty credentials', async () => {
            const client = SteamClient.getInstance({
                username: '',
                password: ''
            });
            await expect(client.connect()).rejects.toThrow(SteamAuthenticationError);
        });
    });

    describe('getStatus', () => {
        it('should return disconnected status initially', () => {
            const client = SteamClient.getInstance();
            expect(client.getStatus()).toBe(SteamClientStatus.DISCONNECTED);
        });
    });

    describe('isReady', () => {
        it('should return false initially', () => {
            const client = SteamClient.getInstance();
            expect(client.isReady()).toBe(false);
        });
    });

    describe('getQueueLength', () => {
        it('should return 0 initially', () => {
            const client = SteamClient.getInstance();
            expect(client.getQueueLength()).toBe(0);
        });
    });

    describe('inspectItem', () => {
        it('should throw error when queue is full', async () => {
            const client = SteamClient.getInstance({
                maxQueueSize: 0 // Set queue size to 0 to test full queue
            });

            const mockUrl: AnalyzedInspectURL = {
                original_url: 'test',
                cleaned_url: 'test',
                url_type: 'unmasked',
                is_quoted: false,
                owner_id: '123',
                asset_id: '456',
                class_id: '789'
            };

            await expect(client.inspectItem(mockUrl)).rejects.toThrow(SteamQueueFullError);
        });
    });

    describe('updateConfig', () => {
        it('should update configuration', () => {
            const client = SteamClient.getInstance();
            const newConfig = { rateLimitDelay: 3000 };
            
            expect(() => client.updateConfig(newConfig)).not.toThrow();
        });
    });
});

describe('SteamClientManager', () => {
    let manager: SteamClientManager;

    beforeEach(() => {
        SteamClient.resetInstance();
        manager = new SteamClientManager();
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create manager with default config', () => {
            expect(manager).toBeDefined();
            expect(manager.isAvailable()).toBe(false);
        });

        it('should create manager with custom config', () => {
            const config: SteamClientConfig = {
                enabled: true,
                username: 'testuser',
                password: 'testpass'
            };
            const customManager = new SteamClientManager(config);
            expect(customManager).toBeDefined();
        });
    });

    describe('isAvailable', () => {
        it('should return false when not initialized', () => {
            expect(manager.isAvailable()).toBe(false);
        });
    });

    describe('getStatus', () => {
        it('should return disconnected when no client', () => {
            expect(manager.getStatus()).toBe(SteamClientStatus.DISCONNECTED);
        });
    });

    describe('getQueueLength', () => {
        it('should return 0 when no client', () => {
            expect(manager.getQueueLength()).toBe(0);
        });
    });

    describe('inspectUnmaskedUrl', () => {
        it('should throw error when not available', async () => {
            const mockUrl: AnalyzedInspectURL = {
                original_url: 'test',
                cleaned_url: 'test',
                url_type: 'unmasked',
                is_quoted: false,
                owner_id: '123',
                asset_id: '456',
                class_id: '789'
            };

            await expect(manager.inspectUnmaskedUrl(mockUrl)).rejects.toThrow(SteamNotReadyError);
        });

        it('should throw error for non-unmasked URL', async () => {
            const mockUrl: AnalyzedInspectURL = {
                original_url: 'test',
                cleaned_url: 'test',
                url_type: 'masked',
                is_quoted: false,
                hex_data: 'abc123'
            };

            await expect(manager.inspectUnmaskedUrl(mockUrl)).rejects.toThrow();
        });
    });

    describe('isUnmaskedUrlSupportEnabled', () => {
        it('should return false with default config', () => {
            expect(manager.isUnmaskedUrlSupportEnabled()).toBe(false);
        });

        it('should return true with proper config', () => {
            const enabledManager = new SteamClientManager({
                enabled: true,
                username: 'testuser',
                password: 'testpass'
            });
            expect(enabledManager.isUnmaskedUrlSupportEnabled()).toBe(true);
        });
    });

    describe('getConfigInfo', () => {
        it('should return config without sensitive data', () => {
            const config = manager.getConfigInfo();
            expect(config).not.toHaveProperty('username');
            expect(config).not.toHaveProperty('password');
            expect(config).not.toHaveProperty('apiKey');
        });
    });

    describe('getStats', () => {
        it('should return stats object', () => {
            const stats = manager.getStats();
            expect(stats).toHaveProperty('status');
            expect(stats).toHaveProperty('queueLength');
            expect(stats).toHaveProperty('isAvailable');
            expect(stats).toHaveProperty('unmaskedSupport');
        });
    });

    describe('updateConfig', () => {
        it('should update configuration', () => {
            const newConfig = { rateLimitDelay: 3000 };
            expect(() => manager.updateConfig(newConfig)).not.toThrow();
        });
    });

    describe('disconnect', () => {
        it('should disconnect without error', async () => {
            await expect(manager.disconnect()).resolves.not.toThrow();
        });
    });
});

describe('Steam Client Integration', () => {
    beforeEach(() => {
        SteamClient.resetInstance();
        jest.clearAllMocks();
    });

    it('should handle manager and client lifecycle', async () => {
        const manager = new SteamClientManager({
            enabled: false // Disabled to avoid actual connection
        });

        expect(manager.isAvailable()).toBe(false);
        expect(manager.getStatus()).toBe(SteamClientStatus.DISCONNECTED);
        
        await manager.disconnect();
        expect(manager.isAvailable()).toBe(false);
    });

    it('should handle configuration updates', () => {
        const manager = new SteamClientManager();
        const client = SteamClient.getInstance();

        const newConfig = { rateLimitDelay: 5000 };
        
        expect(() => manager.updateConfig(newConfig)).not.toThrow();
        expect(() => client.updateConfig(newConfig)).not.toThrow();
    });
});
