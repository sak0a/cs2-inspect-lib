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
     * Initialize Steam client if enabled and credentials are provided
     */
    public async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        if (!this.config.enabled) {
            console.log('[Steam Manager] Steam client disabled in configuration');
            return;
        }

        if (!this.config.username || !this.config.password) {
            console.warn('[Steam Manager] Steam credentials not provided - unmasked URL support disabled');
            return;
        }

        try {
            this.client = SteamClient.getInstance(this.config);
            await this.client.connect();
            this.initialized = true;
            console.log('[Steam Manager] Steam client initialized successfully');
        } catch (error) {
            console.error('[Steam Manager] Failed to initialize Steam client:', error);
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
            console.error('[Steam Manager] Failed to inspect item:', error);
            throw error;
        }
    }

    /**
     * Convert Steam API data to EconItem format
     */
    private convertSteamDataToEconItem(steamData: any): EconItem {
        // This is a basic conversion - you may need to adjust based on actual Steam API response
        const econItem: EconItem = {
            defindex: steamData.defindex || 0,
            paintindex: steamData.paintindex || 0,
            paintseed: steamData.paintseed || 0,
            paintwear: steamData.paintwear || 0,
            rarity: steamData.rarity || 0,
            quality: steamData.quality || 0
        };

        // Add optional fields if present
        if (steamData.killeaterscoretype !== undefined) {
            econItem.killeaterscoretype = steamData.killeaterscoretype;
        }
        if (steamData.killeatervalue !== undefined) {
            econItem.killeatervalue = steamData.killeatervalue;
        }
        if (steamData.customname) {
            econItem.customname = steamData.customname;
        }
        if (steamData.stickers && Array.isArray(steamData.stickers)) {
            econItem.stickers = steamData.stickers;
        }
        if (steamData.keychains && Array.isArray(steamData.keychains)) {
            econItem.keychains = steamData.keychains;
        }
        if (steamData.style !== undefined) {
            econItem.style = steamData.style;
        }
        if (steamData.upgrade_level !== undefined) {
            econItem.upgrade_level = steamData.upgrade_level;
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
        console.log('[Steam Manager] Steam client disconnected');
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
