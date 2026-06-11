/**
 * Steam client manager for CS2 inspect URL library
 * Provides high-level interface for Steam client operations
 */

import { SteamClient } from './steam-client';
import {
    SteamClientConfig,
    SteamClientStatus,
    AnalyzedInspectURL,
    SteamInspectResult,
    EconItem
} from './types';
import {
    SteamNotReadyError,
    SteamInspectionError
} from './errors';

/**
 * Manager class for Steam client operations
 */
export class SteamClientManager {
    private client: SteamClient | null = null;
    private config: SteamClientConfig;
    private initialized: boolean = false;

    constructor(config: SteamClientConfig = {}) {
        this.config = config;
    }

    /**
     * Debug logging helper - only logs when enableLogging is true
     */
    private debugLog(message: string, data?: any): void {
        if (this.config.enableLogging) {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] [Steam Manager] ${message}`);
            if (data) {
                console.log('[Steam Manager DATA]', JSON.stringify(data, null, 2));
            }
        }
    }

    /**
     * Initialize Steam client if enabled and credentials are provided
     */
    public async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        if (!this.config.enabled) {
            this.debugLog('Steam client disabled in configuration');
            return;
        }

        if (!this.config.username || !this.config.password) {
            this.debugLog('Steam credentials not provided - unmasked URL support disabled');
            return;
        }

        try {
            this.client = SteamClient.getInstance(this.config);
            await this.client.connect();
            this.initialized = true;
            this.debugLog('Steam client initialized successfully');
        } catch (error) {
            this.debugLog('Failed to initialize Steam client', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Check if Steam client is available and ready
     */
    public isAvailable(): boolean {
        return this.initialized && this.client !== null && this.client.isReady();
    }

    /**
     * Get current Steam client status
     */
    public getStatus(): SteamClientStatus {
        if (!this.client) {
            return SteamClientStatus.DISCONNECTED;
        }
        return this.client.getStatus();
    }

    /**
     * Get current queue length
     */
    public getQueueLength(): number {
        if (!this.client) {
            return 0;
        }
        return this.client.getQueueLength();
    }

    /**
     * Inspect an unmasked URL using Steam client
     */
    public async inspectUnmaskedUrl(urlInfo: AnalyzedInspectURL): Promise<SteamInspectResult> {
        if (!this.isAvailable()) {
            throw new SteamNotReadyError('Steam client is not available or not ready', {
                status: this.getStatus(),
                initialized: this.initialized
            });
        }

        if (urlInfo.url_type !== 'unmasked') {
            throw new SteamInspectionError('URL is not an unmasked inspect URL', {
                urlType: urlInfo.url_type,
                url: urlInfo.original_url
            });
        }

        if (!this.client) {
            throw new SteamNotReadyError('Steam client not initialized');
        }

        const startTime = Date.now();

        try {
            const steamData = await this.client.inspectItem(urlInfo);
            const fetchTime = Date.now() - startTime;

            // Convert Steam data to EconItem format
            const econItem = this.convertSteamDataToEconItem(steamData);

            const result: SteamInspectResult = {
                ...econItem,
                inspectUrl: urlInfo.original_url,
                queueStatus: {
                    length: this.client.getQueueLength()
                },
                steamMetadata: {
                    fetchTime
                }
            };

            return result;
        } catch (error) {
            this.debugLog('Failed to inspect item', { error: (error as Error).message });
            throw error;
        }
    }

    /**
     * Convert Steam API data to EconItem format
     */
    private convertSteamDataToEconItem(steamData: any): EconItem {
        const toNumber = (value: any, fallback = 0): number => {
            if (typeof value === 'number' && Number.isFinite(value)) {
                return value;
            }
            if (typeof value === 'string' && value.trim() !== '') {
                const numeric = Number(value);
                if (Number.isFinite(numeric)) {
                    return numeric;
                }
            }
            return fallback;
        };

        const toBigInt = (value: any): bigint | undefined => {
            if (typeof value === 'bigint') {
                return value;
            }
            if (typeof value === 'number' && Number.isInteger(value)) {
                return BigInt(value);
            }
            if (typeof value === 'string' && /^\d+$/.test(value)) {
                return BigInt(value);
            }
            return undefined;
        };

        const econItem: EconItem = {
            defindex: toNumber(steamData.defindex),
            paintindex: toNumber(steamData.paintindex),
            paintseed: toNumber(steamData.paintseed),
            paintwear: toNumber(steamData.paintwear),
            rarity: toNumber(steamData.rarity),
            quality: toNumber(steamData.quality)
        };

        const itemId = toBigInt(steamData.itemid);
        if (typeof itemId !== 'undefined') {
            econItem.itemid = itemId;
        }

        const numericFields: Array<keyof EconItem> = [
            'accountid',
            'killeaterscoretype',
            'killeatervalue',
            'inventory',
            'origin',
            'questid',
            'dropreason',
            'musicindex',
            'entindex',
            'petindex',
            'style',
            'upgrade_level'
        ];

        for (const field of numericFields) {
            if (steamData[field] !== undefined && steamData[field] !== null) {
                (econItem as any)[field] = toNumber(steamData[field]);
            }
        }

        if (steamData.customname !== undefined && steamData.customname !== null) {
            econItem.customname = steamData.customname;
        }
        if (steamData.stickers && Array.isArray(steamData.stickers)) {
            econItem.stickers = steamData.stickers;
        }
        if (steamData.keychains && Array.isArray(steamData.keychains)) {
            econItem.keychains = steamData.keychains;
        }
        if (steamData.variations && Array.isArray(steamData.variations)) {
            econItem.variations = steamData.variations;
        }

        return econItem;
    }

    /**
     * Update Steam client configuration
     */
    public updateConfig(config: Partial<SteamClientConfig>): void {
        this.config = { ...this.config, ...config };
        
        if (this.client) {
            this.client.updateConfig(config);
        }
    }

    /**
     * Disconnect and cleanup Steam client
     */
    public async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.disconnect();
            this.client = null;
        }
        this.initialized = false;
        this.debugLog('Steam client disconnected');
    }

    /**
     * Check if unmasked URL support is enabled
     */
    public isUnmaskedUrlSupportEnabled(): boolean {
        return this.config.enabled === true && 
               Boolean(this.config.username) && 
               Boolean(this.config.password);
    }

    /**
     * Get configuration information (without sensitive data)
     */
    public getConfigInfo(): Omit<SteamClientConfig, 'username' | 'password' | 'apiKey'> {
        const { username, password, apiKey, ...safeConfig } = this.config;
        return safeConfig;
    }

    /**
     * Get Steam client statistics
     */
    public getStats(): {
        status: SteamClientStatus;
        queueLength: number;
        isAvailable: boolean;
        unmaskedSupport: boolean;
    } {
        return {
            status: this.getStatus(),
            queueLength: this.getQueueLength(),
            isAvailable: this.isAvailable(),
            unmaskedSupport: this.isUnmaskedUrlSupportEnabled()
        };
    }
}
