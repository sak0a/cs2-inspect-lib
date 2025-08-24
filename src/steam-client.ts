/**
 * Steam client implementation for CS2 inspect URL library
 * Handles unmasked URL inspection via Steam's Game Coordinator
 */

import { EventEmitter } from 'events';
import {
    SteamClientConfig,
    SteamClientStatus,
    SteamInspectQueueItem,
    AnalyzedInspectURL,
    DEFAULT_STEAM_CONFIG
} from './types';
import {
    SteamAuthenticationError,
    SteamTimeoutError,
    SteamQueueFullError,
    SteamNotReadyError,
    SteamInspectionError
} from './errors';

// Dynamic imports for optional Steam dependencies
let SteamUser: any;
let NodeCS2: any;

/**
 * Steam client class with singleton pattern for CS2 item inspection
 */
export class SteamClient extends EventEmitter {
    private static instance: SteamClient | null = null;
    private steamClient: any = null;
    private csgoClient: any = null;
    private queue: SteamInspectQueueItem[] = [];
    private processing: boolean = false;
    private status: SteamClientStatus = SteamClientStatus.DISCONNECTED;
    private config: Required<SteamClientConfig>;
    private debugMode: boolean = false;

    private constructor(config: SteamClientConfig = {}) {
        super();
        this.config = { ...DEFAULT_STEAM_CONFIG, ...config };
        this.debugMode = config.enableLogging || false;
        this.loadSteamDependencies();
    }

    /**
     * Enable or disable debug mode
     */
    public setDebugMode(enabled: boolean): void {
        this.debugMode = enabled;
    }

    /**
     * Debug logging helper
     */
    private debugLog(message: string, data?: any): void {
        if (this.debugMode) {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] [STEAM DEBUG] ${message}`);
            if (data) {
                console.log('[STEAM DEBUG DATA]', JSON.stringify(data, null, 2));
            }
        }
    }

    /**
     * Get singleton instance of Steam client
     */
    public static getInstance(config?: SteamClientConfig): SteamClient {
        if (!SteamClient.instance) {
            SteamClient.instance = new SteamClient(config);
        }
        return SteamClient.instance;
    }

    /**
     * Reset singleton instance (for testing purposes)
     */
    public static async resetInstance(): Promise<void> {
        if (SteamClient.instance) {
            await SteamClient.instance.disconnect();
            SteamClient.instance = null;
        }
    }



    /**
     * Load Steam dependencies dynamically
     */
    private async loadSteamDependencies(): Promise<void> {
        try {
            if (!SteamUser) {
                SteamUser = (await import('steam-user')).default;
            }
            if (!NodeCS2) {
                NodeCS2 = (await import('node-cs2')).default;
            }
        } catch (error) {
            throw new Error(
                'Steam dependencies not found. Please install: npm install steam-user node-cs2'
            );
        }
    }

    /**
     * Initialize Steam clients
     */
    private async initializeClients(): Promise<void> {
        await this.loadSteamDependencies();
        
        this.steamClient = new SteamUser();
        this.csgoClient = new NodeCS2(this.steamClient);
        this.setupEventHandlers();
    }

    /**
     * Setup event handlers for Steam clients
     */
    private setupEventHandlers(): void {
        if (!this.steamClient || !this.csgoClient) return;

        // Steam client events
        this.steamClient.on('error', (err: Error) => {
            console.error('[Steam Client] Error:', err.message);
            this.status = SteamClientStatus.ERROR;
            this.emit('error', { type: 'steam', error: err });
        });

        this.steamClient.on('loggedOn', () => {
            console.log('[Steam Client] Logged into Steam');
            this.status = SteamClientStatus.CONNECTED;
            this.steamClient.setPersona(1); // Online
            this.steamClient.gamesPlayed([730]); // CS2 app ID
        });

        // CS2 client events
        this.csgoClient.on('debug', (message: string) => {
            // Only log debug messages if explicitly enabled
            console.log('[CS2 Client]', message);
        });

        this.csgoClient.on('connectedToGC', () => {
            this.status = SteamClientStatus.READY;
            console.log('[CS2 Client] Connected to CS2 Game Coordinator');
            this.emit('ready');
            this.processQueue();
        });

        this.csgoClient.on('disconnectedFromGC', (reason: any) => {
            console.log('[CS2 Client] Disconnected from CS2 Game Coordinator:', reason);
            this.status = SteamClientStatus.CONNECTED;
            this.emit('disconnected', reason);
        });

        this.csgoClient.on('inspectItemInfo', (item: any) => {
            console.log('[CS2 Client] Received item info:', item);
        });

        this.csgoClient.on('connectionStatus', (status: any) => {
            console.log(`[CS2 Client] Server connection status:`, status);
            this.emit('serverConnectionStatus', status);
        });
    }

    /**
     * Connect to Steam and CS2 Game Coordinator
     */
    public async connect(): Promise<void> {
        if (this.status === SteamClientStatus.READY) {
            return; // Already connected
        }

        if (!this.config.username || !this.config.password) {
            throw new SteamAuthenticationError('Steam credentials are required for unmasked URL support');
        }

        this.status = SteamClientStatus.CONNECTING;

        if (!this.steamClient) {
            await this.initializeClients();
        }

        // Check if already logged in
        if (this.steamClient.steamID) {
            console.log('[CS2 Client] Already logged into Steam, checking CS2 connection...');
            this.status = SteamClientStatus.CONNECTED;

            // If CS2 client is already connected, we're ready
            if (this.csgoClient && this.csgoClient.haveGCSession) {
                this.status = SteamClientStatus.READY;
                console.log('[CS2 Client] Already connected to CS2 Game Coordinator');
                return Promise.resolve();
            }

            // Wait for CS2 connection if not ready
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new SteamTimeoutError('CS2 Game Coordinator connection timeout'));
                }, 30000);

                const onReady = () => {
                    clearTimeout(timeout);
                    this.removeListener('error', onError);
                    resolve();
                };

                const onError = (err: any) => {
                    clearTimeout(timeout);
                    this.removeListener('ready', onReady);
                    reject(err.error || err);
                };

                this.once('ready', onReady);
                this.once('error', onError);
            });
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new SteamTimeoutError('Steam connection timeout'));
            }, 30000);

            this.steamClient.logOn({
                accountName: this.config.username,
                password: this.config.password
            });

            const onReady = () => {
                clearTimeout(timeout);
                this.removeListener('error', onError);
                resolve();
            };

            const onError = (err: any) => {
                clearTimeout(timeout);
                this.removeListener('ready', onReady);
                reject(err.error || err);
            };

            this.once('ready', onReady);
            this.once('error', onError);
        });
    }

    /**
     * Disconnect from Steam
     */
    public async disconnect(): Promise<void> {
        this.queue = [];
        this.processing = false;
        this.status = SteamClientStatus.DISCONNECTED;
        
        if (this.steamClient) {
            this.steamClient.logOff();
        }
    }

    /**
     * Get current connection status
     */
    public getStatus(): SteamClientStatus {
        return this.status;
    }

    /**
     * Check if client is ready for inspection
     */
    public isReady(): boolean {
        return this.status === SteamClientStatus.READY;
    }

    /**
     * Get current queue length
     */
    public getQueueLength(): number {
        return this.queue.length;
    }

    /**
     * Update configuration
     */
    public updateConfig(config: Partial<SteamClientConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Inspect an item using Steam's Game Coordinator
     */
    public async inspectItem(inspectData: AnalyzedInspectURL): Promise<any> {
        this.debugLog('Starting item inspection', {
            url: inspectData.original_url,
            urlType: inspectData.url_type,
            marketId: inspectData.market_id,
            ownerId: inspectData.owner_id,
            assetId: inspectData.asset_id
        });

        if (this.queue.length >= this.config.maxQueueSize) {
            this.debugLog('Queue is full', { queueLength: this.queue.length, maxQueueSize: this.config.maxQueueSize });
            throw new SteamQueueFullError('Inspection queue is full', {
                queueLength: this.queue.length,
                maxQueueSize: this.config.maxQueueSize
            });
        }

        return new Promise((resolve, reject) => {
            this.debugLog('Adding item to queue', { queueLength: this.queue.length + 1 });
            this.queue.push({
                inspectData,
                resolve,
                reject,
                timestamp: Date.now()
            });

            if (!this.processing) {
                this.processQueue();
            }
        });
    }

    /**
     * Process the inspection queue
     */
    private async processQueue(): Promise<void> {
        if (this.processing || this.queue.length === 0) {
            this.debugLog('Skipping processQueue', { processing: this.processing, queueLength: this.queue.length });
            return;
        }

        this.debugLog('Starting processQueue', { queueLength: this.queue.length });
        this.processing = true;

        while (this.queue.length > 0) {
            this.cleanExpiredItems();

            const item = this.queue[0];
            this.debugLog('Processing queue item', {
                url: item.inspectData.original_url,
                queuePosition: 0,
                remainingItems: this.queue.length
            });

            try {
                if (!this.isReady()) {
                    this.debugLog('Steam client not ready', { status: this.status });
                    throw new SteamNotReadyError('CS2 client is not ready', {
                        status: this.status
                    });
                }

                this.debugLog('Fetching item info...');
                const itemData = await this.fetchItemInfo(item.inspectData);
                this.debugLog('Item info fetched successfully');
                item.resolve(itemData);
            } catch (error) {
                this.debugLog('Error processing queue item', { error: (error as Error).message });
                item.reject(error);
            }

            this.queue.shift();
            this.debugLog('Item removed from queue', { remainingItems: this.queue.length });

            // Rate limiting delay
            if (this.queue.length > 0) {
                this.debugLog('Applying rate limit delay', { delay: this.config.rateLimitDelay });
                await new Promise(resolve => setTimeout(resolve, this.config.rateLimitDelay));
            }
        }

        this.debugLog('Queue processing completed');
        this.processing = false;
    }

    /**
     * Clean expired items from queue
     */
    private cleanExpiredItems(): void {
        const now = Date.now();
        const expiredItems = this.queue.filter(item =>
            now - item.timestamp > this.config.queueTimeout
        );

        expiredItems.forEach(item => {
            item.reject(new SteamTimeoutError('Request timeout', {
                queueTimeout: this.config.queueTimeout
            }));
            const index = this.queue.indexOf(item);
            if (index > -1) {
                this.queue.splice(index, 1);
            }
        });
    }

    /**
     * Fetch item information from Steam
     */
    private fetchItemInfo(inspectData: AnalyzedInspectURL): Promise<any> {
        this.debugLog('Starting fetchItemInfo', { url: inspectData.original_url });

        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            const timeoutId = setTimeout(() => {
                const elapsed = Date.now() - startTime;
                this.debugLog('Request timed out', {
                    elapsed,
                    timeout: this.config.requestTimeout,
                    url: inspectData.original_url
                });
                this.csgoClient.removeListener('inspectItemInfo', handleInspectItemInfo);
                reject(new SteamTimeoutError(`Steam API request timed out after ${this.config.requestTimeout}ms`, {
                    requestTimeout: this.config.requestTimeout
                }));
            }, this.config.requestTimeout);

            const handleInspectItemInfo = (item: any) => {
                const elapsed = Date.now() - startTime;
                this.debugLog('Received inspectItemInfo response', {
                    elapsed,
                    hasItem: !!item,
                    itemKeys: item ? Object.keys(item) : []
                });

                clearTimeout(timeoutId);
                if (item) {
                    resolve(item);
                } else {
                    reject(new SteamInspectionError('Failed to inspect item'));
                }
            };

            try {
                this.debugLog('Setting up inspectItemInfo listener and sending request');
                this.csgoClient.once('inspectItemInfo', handleInspectItemInfo);

                this.debugLog('Calling csgoClient.inspectItem', { url: inspectData.original_url });
                this.csgoClient.inspectItem(inspectData.original_url);

                this.debugLog('inspectItem call completed, waiting for response...');
            } catch (error) {
                this.debugLog('Error in fetchItemInfo try block', { error: (error as Error).message });
                clearTimeout(timeoutId);
                this.csgoClient.removeListener('inspectItemInfo', handleInspectItemInfo);
                reject(error);
            }
        });
    }
}
