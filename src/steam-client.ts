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
    private queueRun = 0;
    private activeItem?: SteamInspectQueueItem;
    private cancelInspection?: (error: Error) => void;
    private cancelDelay?: () => void;
    private status: SteamClientStatus = SteamClientStatus.DISCONNECTED;
    private config: Required<SteamClientConfig>;
    private debugMode: boolean = false;

    private constructor(config: SteamClientConfig = {}) {
        super();
        this.config = { ...DEFAULT_STEAM_CONFIG, ...config };
        this.debugMode = config.enableLogging || false;

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
        this.csgoClient._inspectTimeout = this.config.requestTimeout;
        this.setupEventHandlers();
    }

    /**
     * Setup event handlers for Steam clients
     */
    private setupEventHandlers(): void {
        if (!this.steamClient || !this.csgoClient) return;

        // Steam client events
        this.steamClient.on('error', (err: Error) => {
            this.debugLog('Steam client error: ' + err.message);
            this.status = SteamClientStatus.ERROR;
            this.emit('error', { type: 'steam', error: err });
        });

        this.steamClient.on('loggedOn', () => {
            this.debugLog('Logged into Steam');
            this.status = SteamClientStatus.CONNECTED;
            this.steamClient.setPersona(1); // Online
            this.steamClient.gamesPlayed([730]); // CS2 app ID
        });

        // CS2 client events
        this.csgoClient.on('debug', (message: string) => {
            this.debugLog(message);
        });

        this.csgoClient.on('connectedToGC', () => {
            if (this.status === SteamClientStatus.DISCONNECTED) return;
            this.status = SteamClientStatus.READY;
            this.debugLog('Connected to CS2 Game Coordinator');
            this.emit('ready');
            this.processQueue();
        });

        this.csgoClient.on('disconnectedFromGC', (reason: any) => {
            if (this.status === SteamClientStatus.DISCONNECTED) return;
            this.debugLog('Disconnected from CS2 Game Coordinator', { reason });
            this.status = SteamClientStatus.CONNECTED;
            this.emit('disconnected', reason);
        });

        this.csgoClient.on('inspectItemInfo', (item: any) => {
            this.debugLog('Received item info', { itemKeys: item ? Object.keys(item) : [] });
        });

        this.csgoClient.on('connectionStatus', (status: any) => {
            this.debugLog('Server connection status', { status });
            this.emit('serverConnectionStatus', status);
        });
    }

    /**
     * Waits for the 'ready' event with timeout and error handling
     */
    private waitForReady(timeoutMessage: string, timeoutMs: number = 30000): Promise<void> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.removeListener('ready', onReady);
                this.removeListener('error', onError);
                reject(new SteamTimeoutError(timeoutMessage));
            }, timeoutMs);

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
            this.debugLog('Already logged into Steam, checking CS2 connection...');
            this.status = SteamClientStatus.CONNECTED;

            // If CS2 client is already connected, we're ready
            if (this.csgoClient && this.csgoClient.haveGCSession) {
                this.status = SteamClientStatus.READY;
                this.debugLog('Already connected to CS2 Game Coordinator');
                return;
            }

            // Wait for CS2 connection if not ready
            return this.waitForReady('CS2 Game Coordinator connection timeout');
        }

        this.steamClient.logOn({
            accountName: this.config.username,
            password: this.config.password
        });

        return this.waitForReady('Steam connection timeout');
    }

    /**
     * Disconnect from Steam
     */
    public async disconnect(): Promise<void> {
        const error = new SteamNotReadyError('Steam client disconnected during inspection');
        this.queueRun++;
        this.status = SteamClientStatus.DISCONNECTED;
        this.cancelInspection?.(error);
        this.cancelDelay?.();
        this.activeItem?.reject(error);
        this.activeItem = undefined;
        for (const item of this.queue.splice(0)) item.reject(error);
        this.processing = false;

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
        return this.queue.length + (this.activeItem ? 1 : 0);
    }

    /**
     * Update configuration
     */
    public updateConfig(config: Partial<SteamClientConfig>): void {
        this.config = { ...this.config, ...config };
        if (this.csgoClient) this.csgoClient._inspectTimeout = this.config.requestTimeout;
        this.debugMode = this.config.enableLogging;
    }

    /**
     * Inspect an item using Steam's Game Coordinator
     */
    public async inspectItem(inspectData: AnalyzedInspectURL, options: { signal?: AbortSignal } = {}): Promise<any> {
        this.debugLog('Starting item inspection', {
            url: inspectData.original_url,
            urlType: inspectData.url_type,
            marketId: inspectData.market_id,
            ownerId: inspectData.owner_id,
            assetId: inspectData.asset_id
        });

        if (this.getQueueLength() >= this.config.maxQueueSize) {
            this.debugLog('Queue is full', { queueLength: this.queue.length, maxQueueSize: this.config.maxQueueSize });
            throw new SteamQueueFullError('Inspection queue is full', {
                queueLength: this.queue.length,
                maxQueueSize: this.config.maxQueueSize
            });
        }

        if (options.signal?.aborted) throw new Error('Inspection cancelled');
        return new Promise((resolve, reject) => {
            const cleanup = () => options.signal?.removeEventListener('abort', abort);
            const item: SteamInspectQueueItem = {
                inspectData,
                resolve: value => { cleanup(); resolve(value); },
                reject: error => { cleanup(); reject(error); },
                timestamp: Date.now()
            };
            const abort = () => {
                const index = this.queue.indexOf(item);
                if (index !== -1) this.queue.splice(index, 1);
                // An already sent read holds its queue slot until it finishes or
                // times out, preventing a late reply from resolving a successor.
                item.reject(new Error('Inspection cancelled'));
            };
            options.signal?.addEventListener('abort', abort, { once: true });
            this.queue.push(item);
            if (!this.processing) void this.processQueue();
        });
    }

    /**
     * Process the inspection queue
     */
    private async processQueue(): Promise<void> {
        if (this.processing || this.queue.length === 0) return;
        this.processing = true;
        const run = this.queueRun;
        try {
            while (run === this.queueRun && this.queue.length > 0) {
                this.cleanExpiredItems();
                const item = this.queue.shift();
                if (!item) break;
                this.activeItem = item;
                try {
                    if (!this.isReady()) throw new SteamNotReadyError('CS2 client is not ready', { status: this.status });
                    const data = await this.fetchItemInfo(item.inspectData);
                    if (run === this.queueRun) item.resolve(data);
                } catch (error) {
                    item.reject(error);
                } finally {
                    if (this.activeItem === item) this.activeItem = undefined;
                }
                if (run === this.queueRun && this.queue.length > 0) {
                    await new Promise<void>(resolve => {
                        const finish = () => {
                            clearTimeout(timer);
                            if (this.cancelDelay === finish) this.cancelDelay = undefined;
                            resolve();
                        };
                        const timer = setTimeout(finish, this.config.rateLimitDelay);
                        this.cancelDelay = finish;
                    });
                }
            }
        } finally {
            // A disconnected worker must not reset a new connection's worker.
            if (run === this.queueRun) this.processing = false;
        }
    }

    /**
     * Clean expired items from queue
     */
    private cleanExpiredItems(): void {
        const now = Date.now();
        for (let i = this.queue.length - 1; i >= 0; i--) {
            if (now - this.queue[i].timestamp > this.config.queueTimeout) {
                this.queue[i].reject(new SteamTimeoutError('Request timeout', {
                    queueTimeout: this.config.queueTimeout
                }));
                this.queue.splice(i, 1);
            }
        }
    }

    /**
     * Fetch item information from Steam
     */
    private fetchItemInfo(inspectData: AnalyzedInspectURL): Promise<any> {
        return new Promise((resolve, reject) => {
            let settled = false;
            const finish = (error?: Error, item?: any) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                if (this.cancelInspection === cancel) this.cancelInspection = undefined;
                if (error) reject(error);
                else if (!item) reject(new SteamInspectionError('Failed to inspect item'));
                else resolve(item);
            };
            const cancel = (error: Error) => finish(error);
            const timer = setTimeout(() => finish(new SteamTimeoutError(
                `Steam API request timed out after ${this.config.requestTimeout}ms`,
                { requestTimeout: this.config.requestTimeout }
            )), this.config.requestTimeout);
            this.cancelInspection = cancel;
            try {
                // node-cs2's Promise API matches inspectItemInfo#<assetid>. Never
                // resolve from the uncorrelated global inspectItemInfo event.
                // Attach both handlers even if our timeout/disconnect wins first.
                Promise.resolve(this.csgoClient.inspectItem(inspectData.cleaned_url)).then(
                    item => finish(undefined, item),
                    error => finish(new SteamInspectionError('Steam inspection failed', { originalError: error }))
                );
            } catch (error) {
                finish(error as Error);
            }
        });
    }
}
