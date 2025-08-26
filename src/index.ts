/**
 * CS2 Inspect URL Library - Enhanced Version
 * 
 * A comprehensive TypeScript library for encoding and decoding CS2 inspect URLs
 * with full protobuf support, validation, and error handling.
 */

// Export all types
export * from './types';
export * from "./weapon-paints";

// Export error classes
export * from './errors';

// Export validation utilities
export { Validator } from './validation';

// Export protobuf classes and static methods
export { ProtobufReader } from './protobuf-reader';
export { ProtobufWriter } from './protobuf-writer';

// Export direct protobuf methods for convenience
export { ProtobufReader as Protobuf } from './protobuf-reader';

// Export URL utilities
export * from './url-analyzer';

// Export Steam client utilities
export { SteamClient } from './steam-client';
export { SteamClientManager } from './steam-client-manager';

// Main API class
import { EconItem, CS2InspectConfig, DEFAULT_CONFIG, AnalyzedInspectURL, SteamInspectResult } from './types';
import { ProtobufReader } from './protobuf-reader';
import { ProtobufWriter } from './protobuf-writer';
import { UrlAnalyzer } from './url-analyzer';
import { Validator } from './validation';
import { SteamClientManager } from './steam-client-manager';

/**
 * Main CS2 Inspect URL API class
 */
export class CS2Inspect {
    private config: Required<CS2InspectConfig>;
    private urlAnalyzer: UrlAnalyzer;
    private steamManager: SteamClientManager;

    constructor(config: CS2InspectConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.urlAnalyzer = new UrlAnalyzer(this.config);
        this.steamManager = new SteamClientManager(this.config.steamClient);
    }

    /**
     * Creates an inspect URL from an EconItem
     * 
     * @param item - The item data to encode
     * @returns The generated inspect URL
     * 
     * @example
     * ```typescript
     * const cs2 = new CS2Inspect();
     * const item: EconItem = {
     *   defindex: WeaponType.AK_47,
     *   paintindex: 44, // Fire Serpent
     *   paintseed: 661,
     *   paintwear: 0.15
     * };
     * const url = cs2.createInspectUrl(item);
     * ```
     */
    createInspectUrl(item: EconItem): string {
        return ProtobufWriter.createInspectUrl(item, this.config);
    }

    /**
     * Decodes a MASKED inspect URL into an EconItem (synchronous, offline)
     *
     * ⚠️  ONLY works with MASKED URLs (URLs containing encoded protobuf data)
     * ❌ Does NOT work with UNMASKED URLs (market/inventory links) - use inspectItem() instead
     *
     * @param url - The MASKED inspect URL to decode
     * @returns The decoded item data
     * @throws Error if URL is unmasked or invalid
     *
     * @example
     * ```typescript
     * const cs2 = new CS2Inspect();
     * // This works - masked URL with protobuf data
     * const maskedUrl = "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20001807A8...";
     * const item = cs2.decodeMaskedUrl(maskedUrl);
     *
     * // This will throw an error - unmasked URL
     * const unmaskedUrl = "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S76561198123456789A987654321D456789123";
     * // cs2.decodeMaskedUrl(unmaskedUrl); // ❌ Throws error
     * ```
     */
    decodeMaskedUrl(url: string): EconItem {
        const analyzed = this.urlAnalyzer.analyzeInspectUrl(url);

        if (analyzed.url_type === 'masked' && analyzed.hex_data) {
            return ProtobufReader.decodeMaskedData(analyzed.hex_data, this.config);
        }

        if (analyzed.url_type === 'unmasked') {
            throw new Error('This is an unmasked URL (market/inventory link). Use inspectItem() instead for Steam client inspection.');
        }

        throw new Error('Invalid URL format or missing data');
    }

    /**
     * Decodes a MASKED inspect URL into an EconItem (synchronous, offline)
     *
     * @deprecated Use decodeMaskedUrl() instead for clearer naming
     * @param url - The MASKED inspect URL to decode
     * @returns The decoded item data
     */
    decodeInspectUrl(url: string): EconItem {
        return this.decodeMaskedUrl(url);
    }

    /**
     * Analyzes an inspect URL structure
     * 
     * @param url - The URL to analyze
     * @returns Analyzed URL information
     */
    analyzeUrl(url: string): AnalyzedInspectURL {
        return this.urlAnalyzer.analyzeInspectUrl(url);
    }

    /**
     * Validates an EconItem
     * 
     * @param item - The item to validate
     * @returns Validation result
     */
    validateItem(item: any) {
        return Validator.validateEconItem(item);
    }

    /**
     * Validates an inspect URL
     * 
     * @param url - The URL to validate
     * @returns Validation result
     */
    validateUrl(url: string) {
        return Validator.validateInspectUrl(url);
    }

    /**
     * Checks if a URL is a valid inspect URL
     *
     * @deprecated Use analyzeUrl() and check for errors instead, or use validateUrl() for detailed validation
     * @param url - The URL to check
     * @returns True if valid, false otherwise
     */
    isValidUrl(url: string): boolean {
        try {
            this.urlAnalyzer.analyzeInspectUrl(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Normalizes an inspect URL to standard format
     * 
     * @param url - The URL to normalize
     * @returns Normalized URL
     */
    normalizeUrl(url: string): string {
        return this.urlAnalyzer.normalizeUrl(url);
    }

    /**
     * Gets basic URL information without full decoding
     *
     * @param url - The URL to analyze
     * @returns Basic URL information
     */
    getUrlInfo(url: string) {
        return this.urlAnalyzer.getUrlInfo(url);
    }

    /**
     * Inspects ANY inspect URL (both masked and unmasked) - Universal method
     *
     * ✅ Works with MASKED URLs (decoded offline using protobuf data)
     * ✅ Works with UNMASKED URLs (fetched via Steam client)
     * 🔄 Automatically detects URL type and uses appropriate method
     *
     * @param url - Any valid inspect URL (masked or unmasked)
     * @returns Promise resolving to the decoded item data
     * @throws Error if Steam client is required but not available
     *
     * @example
     * ```typescript
     * const cs2 = new CS2Inspect({
     *   steamClient: {
     *     enabled: true,
     *     username: 'your_username',
     *     password: 'your_password'
     *   }
     * });
     * await cs2.initializeSteamClient();
     *
     * // Works with masked URLs (offline)
     * const maskedUrl = "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20001807A8...";
     * const maskedItem = await cs2.inspectItem(maskedUrl);
     *
     * // Works with unmasked URLs (via Steam client)
     * const unmaskedUrl = "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S76561198123456789A987654321D456789123";
     * const unmaskedItem = await cs2.inspectItem(unmaskedUrl);
     * ```
     */
    async inspectItem(url: string): Promise<EconItem | SteamInspectResult> {
        const analyzed = this.urlAnalyzer.analyzeInspectUrl(url);

        if (analyzed.url_type === 'masked' && analyzed.hex_data) {
            return ProtobufReader.decodeMaskedData(analyzed.hex_data, this.config);
        }

        if (analyzed.url_type === 'unmasked') {
            if (!this.steamManager.isAvailable()) {
                throw new Error('Steam client is not available. Please initialize it first with initializeSteamClient()');
            }
            return await this.steamManager.inspectUnmaskedUrl(analyzed);
        }

        throw new Error('Invalid URL format or missing data');
    }

    /**
     * Inspects ANY inspect URL (both masked and unmasked) - Universal method
     *
     * @deprecated Use inspectItem() instead for clearer naming
     * @param url - Any valid inspect URL (masked or unmasked)
     * @returns Promise resolving to the decoded item data
     */
    async decodeInspectUrlAsync(url: string): Promise<EconItem | SteamInspectResult> {
        return this.inspectItem(url);
    }

    /**
     * Initialize Steam client for unmasked URL support
     *
     * @returns Promise that resolves when Steam client is ready
     */
    async initializeSteamClient(): Promise<void> {
        await this.steamManager.initialize();
    }

    /**
     * Check if Steam client is available and ready
     *
     * @returns True if Steam client is ready for inspection
     */
    isSteamClientReady(): boolean {
        return this.steamManager.isAvailable();
    }

    /**
     * Get Steam client status and statistics
     *
     * @returns Steam client status information
     */
    getSteamClientStats() {
        return this.steamManager.getStats();
    }

    /**
     * Check if a URL requires Steam client for inspection
     *
     * @param url - The URL to check
     * @returns True if URL requires Steam client
     */
    requiresSteamClient(url: string): boolean {
        return this.urlAnalyzer.requiresSteamClient(url);
    }

    /**
     * Disconnect Steam client
     */
    async disconnectSteamClient(): Promise<void> {
        await this.steamManager.disconnect();
    }

    /**
     * Updates the configuration
     *
     * @param newConfig - New configuration options
     */
    updateConfig(newConfig: Partial<CS2InspectConfig>): void {
        // Handle Steam client config merging separately
        if (newConfig.steamClient) {
            this.config = {
                ...this.config,
                ...newConfig,
                steamClient: { ...this.config.steamClient, ...newConfig.steamClient }
            };
            this.steamManager.updateConfig(newConfig.steamClient);
        } else {
            this.config = { ...this.config, ...newConfig };
        }

        this.urlAnalyzer = new UrlAnalyzer(this.config);
    }

    /**
     * Gets current configuration
     * 
     * @returns Current configuration
     */
    getConfig(): Required<CS2InspectConfig> {
        return { ...this.config };
    }
}

/**
 * Static convenience functions for quick usage without instantiating the class
 * These are optimized to avoid creating unnecessary instances
 */

/**
 * Creates an inspect URL from an EconItem (convenience function)
 */
export function createInspectUrl(item: EconItem, config?: CS2InspectConfig): string {
    return ProtobufWriter.createInspectUrl(item, config);
}

/**
 * Decodes a MASKED inspect URL into an EconItem (convenience function)
 * ⚠️  ONLY works with MASKED URLs - use inspectItem() for universal support
 */
export function decodeMaskedUrl(url: string, config?: CS2InspectConfig): EconItem {
    const cs2 = new CS2Inspect(config);
    return cs2.decodeMaskedUrl(url);
}

/**
 * Decodes a MASKED inspect URL into an EconItem (convenience function)
 * @deprecated Use decodeMaskedUrl() instead for clearer naming
 */
export function decodeInspectUrl(url: string, config?: CS2InspectConfig): EconItem {
    const cs2 = new CS2Inspect(config);
    return cs2.decodeInspectUrl(url);
}

/**
 * Inspects ANY inspect URL (masked or unmasked) - Universal convenience function
 * Automatically handles Steam client initialization if needed
 */
export async function inspectItem(url: string, config?: CS2InspectConfig): Promise<EconItem | SteamInspectResult> {
    const cs2 = new CS2Inspect(config);
    if (cs2.requiresSteamClient(url)) {
        await cs2.initializeSteamClient();
    }
    return await cs2.inspectItem(url);
}

/**
 * Inspects ANY inspect URL (masked or unmasked) - Universal convenience function
 * @deprecated Use inspectItem() instead for clearer naming
 */
export async function decodeInspectUrlAsync(url: string, config?: CS2InspectConfig): Promise<EconItem | SteamInspectResult> {
    const cs2 = new CS2Inspect(config);
    if (cs2.requiresSteamClient(url)) {
        await cs2.initializeSteamClient();
    }
    return await cs2.decodeInspectUrlAsync(url);
}

/**
 * Validates an EconItem (convenience function)
 */
export function validateItem(item: any) {
    return Validator.validateEconItem(item);
}

/**
 * Validates an inspect URL (convenience function)
 */
export function validateUrl(url: string) {
    return Validator.validateInspectUrl(url);
}

// ============================================================================
// OPTIMIZED STATIC METHODS - No instance creation needed
// ============================================================================

/**
 * Analyzes an inspect URL structure (static, optimized)
 * ⚡ More efficient than creating a CS2Inspect instance
 */
export function analyzeUrl(url: string, config?: CS2InspectConfig): AnalyzedInspectURL {
    const analyzer = new UrlAnalyzer(config);
    return analyzer.analyzeInspectUrl(url);
}

/**
 * Decodes masked protobuf data directly (static, fastest)
 * ⚡ Direct access to ProtobufReader.decodeMaskedData
 * 🔥 Use this for maximum performance with known hex data
 */
export function decodeMaskedData(hexData: string, config?: CS2InspectConfig): EconItem {
    return ProtobufReader.decodeMaskedData(hexData, config);
}

/**
 * Checks if URL requires Steam client (static, optimized)
 * ⚡ More efficient than creating a CS2Inspect instance
 */
export function requiresSteamClient(url: string, config?: CS2InspectConfig): boolean {
    try {
        const analyzed = analyzeUrl(url, config);
        return analyzed.url_type === 'unmasked';
    } catch {
        return false;
    }
}

/**
 * Normalizes an inspect URL to standard format (static, optimized)
 * ⚡ More efficient than creating a CS2Inspect instance
 */
export function normalizeUrl(url: string, config?: CS2InspectConfig): string {
    const analyzer = new UrlAnalyzer(config);
    return analyzer.normalizeUrl(url);
}

/**
 * Quick URL validation check (static, optimized)
 * ⚡ More efficient than creating a CS2Inspect instance
 * 💡 Prefer analyzeUrl() for more detailed information
 */
export function isValidUrl(url: string, config?: CS2InspectConfig): boolean {
    try {
        analyzeUrl(url, config);
        return true;
    } catch {
        return false;
    }
}

/**
 * Default CS2Inspect instance for quick usage
 */
export const cs2inspect = new CS2Inspect();

/**
 * Version information
 */
export const VERSION = '3.0.6';

/**
 * Library information
 */
export const LIBRARY_INFO = {
    name: 'cs2-inspect-lib',
    version: VERSION,
    description: 'Enhanced CS2 Inspect library with full protobuf support and Steam client integration',
    features: [
        'Complete protobuf encoding/decoding',
        'Steam client integration for unmasked URLs',
        'Support for both masked and unmasked inspect URLs',
        'Input validation and error handling',
        'TypeScript support with comprehensive types',
        'Support for all CS2 item fields including new additions',
        'URL analysis and normalization',
        'Configurable validation and limits',
        'Queue system with rate limiting for Steam API calls'
    ]
} as const;
