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
import { analyzeInspectUrl, requiresSteamClient as requiresSteamClientStatic, normalizeInspectUrl } from './url-analyzer';

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
     * Get the SteamClientManager instance (for use with convenience functions)
     *
     * @returns The SteamClientManager instance
     */
    getSteamClientManager(): SteamClientManager {
        return this.steamManager;
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
 * 
 * ⚡ OPTIMIZED: Uses static methods directly - no instance creation
 * 
 * @param url - The MASKED inspect URL to decode
 * @param config - Optional configuration
 * @returns The decoded item data
 * @throws Error if URL is unmasked or invalid
 * 
 * @example
 * ```typescript
 * // Fast offline decoding for masked URLs
 * const item = decodeMaskedUrl(maskedUrl);
 * 
 * // For better performance in loops, analyze once:
 * const analyzed = analyzeUrl(url);
 * if (analyzed.url_type === 'masked' && analyzed.hex_data) {
 *     const item = decodeMaskedData(analyzed.hex_data);
 * }
 * ```
 */
export function decodeMaskedUrl(url: string, config?: CS2InspectConfig): EconItem {
    const analyzed = analyzeInspectUrl(url, config);
    
    if (analyzed.url_type === 'masked' && analyzed.hex_data) {
        return ProtobufReader.decodeMaskedData(analyzed.hex_data, config);
    }
    
    if (analyzed.url_type === 'unmasked') {
        throw new Error(
            'This is an unmasked URL (market/inventory link). ' +
            'Use inspectItem() instead for Steam client inspection, ' +
            'or create a CS2Inspect instance and call cs2.inspectItem(url).'
        );
    }
    
    throw new Error('Invalid URL format or missing data');
}

/**
 * Decodes a MASKED inspect URL into an EconItem (convenience function)
 * @deprecated Use decodeMaskedUrl() instead for clearer naming
 * 
 * ⚡ OPTIMIZED: Uses static methods directly - no instance creation
 */
export function decodeInspectUrl(url: string, config?: CS2InspectConfig): EconItem {
    return decodeMaskedUrl(url, config);
}

/**
 * Inspects ANY inspect URL (masked or unmasked) - Universal convenience function
 * 
 * ⚡ OPTIMIZED: Uses static methods for masked URLs - no instance creation
 * 
 * @example
 * ```typescript
 * // Masked URL (offline, no Steam client needed) - OPTIMIZED
 * const item = await inspectItem(maskedUrl);
 * 
 * // Unmasked URL (requires Steam client) - explicit
 * const cs2 = new CS2Inspect({ steamClient: { enabled: true, ... } });
 * await cs2.initializeSteamClient();
 * const item = await inspectItem(unmaskedUrl, { 
 *     steamClient: cs2.getSteamClientManager() // Pass existing instance
 * });
 * 
 * // Or use instance method (recommended for unmasked URLs)
 * const item = await cs2.inspectItem(unmaskedUrl);
 * ```
 */
// Overload 1: No parameters (masked URL)
export function inspectItem(url: string): Promise<EconItem | SteamInspectResult>;
// Overload 2: New optimized API with explicit Steam client
export function inspectItem(
    url: string,
    options: {
        config?: CS2InspectConfig;
        steamClient?: SteamClientManager;
    }
): Promise<EconItem | SteamInspectResult>;
// Overload 3: Backward compatibility - config only
export function inspectItem(
    url: string,
    config: CS2InspectConfig
): Promise<EconItem | SteamInspectResult>;
// Implementation
export async function inspectItem(
    url: string,
    optionsOrConfig?: CS2InspectConfig | {
        config?: CS2InspectConfig;
        steamClient?: SteamClientManager;
    }
): Promise<EconItem | SteamInspectResult> {
    // Check if it's the new options format (has steamClient property)
    const isOptionsFormat = optionsOrConfig && 
        typeof optionsOrConfig === 'object' && 
        'steamClient' in optionsOrConfig;
    
    if (isOptionsFormat) {
        // New format: options object with explicit Steam client
        const options = optionsOrConfig as { config?: CS2InspectConfig; steamClient?: SteamClientManager };
        const analyzed = analyzeInspectUrl(url, options.config);
        
        // Handle masked URLs (offline, no Steam client needed)
        if (analyzed.url_type === 'masked' && analyzed.hex_data) {
            return ProtobufReader.decodeMaskedData(analyzed.hex_data, options.config);
        }
        
        // Handle unmasked URLs (requires Steam client)
        if (analyzed.url_type === 'unmasked') {
            if (!options.steamClient) {
                throw new Error(
                    'Unmasked URL requires Steam client. ' +
                    'Create a CS2Inspect instance, initialize Steam client, and use cs2.inspectItem(url). ' +
                    'Or pass a SteamClientManager instance: inspectItem(url, { steamClient: manager })'
                );
            }
            
            if (!options.steamClient.isAvailable()) {
                throw new Error(
                    'Steam client is not ready. ' +
                    'Ensure you have called steamClient.initialize() and it has connected successfully. ' +
                    'Current status: ' + options.steamClient.getStatus()
                );
            }
            
            return await options.steamClient.inspectUnmaskedUrl(analyzed);
        }
        
        throw new Error('Invalid URL format or missing data');
    } else {
        // Old format: config only (backward compatibility) or no config
        const config = optionsOrConfig as CS2InspectConfig | undefined;
        const analyzed = analyzeInspectUrl(url, config);
        
        if (analyzed.url_type === 'masked' && analyzed.hex_data) {
            // Masked URL - use optimized static method
            return ProtobufReader.decodeMaskedData(analyzed.hex_data, config);
        }
        
        // Unmasked URL with old API - create instance and auto-initialize (for backward compat)
        // Note: This is less optimal but maintains backward compatibility
        const cs2 = new CS2Inspect(config);
        if (!cs2.isSteamClientReady()) {
            await cs2.initializeSteamClient();
        }
        return await cs2.inspectItem(url);
    }
}

/**
 * Inspects ANY inspect URL (masked or unmasked) - Universal convenience function
 * @deprecated Use inspectItem() instead for clearer naming
 * 
 * ⚡ OPTIMIZED: Uses static methods - no instance creation for masked URLs
 */
export async function decodeInspectUrlAsync(
    url: string,
    optionsOrConfig?: CS2InspectConfig | {
        config?: CS2InspectConfig;
        steamClient?: SteamClientManager;
    }
): Promise<EconItem | SteamInspectResult> {
    return inspectItem(url, optionsOrConfig as any);
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
 * ⚡ Truly static - no instance creation, uses pure parsing function
 */
export function analyzeUrl(url: string, config?: CS2InspectConfig): AnalyzedInspectURL {
    return analyzeInspectUrl(url, config);
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
 * ⚡ Truly static - no instance creation, uses pure parsing function
 */
export function requiresSteamClient(url: string, config?: CS2InspectConfig): boolean {
    return requiresSteamClientStatic(url, config);
}

/**
 * Normalizes an inspect URL to standard format (static, optimized)
 * ⚡ Truly static - no instance creation, uses pure parsing and formatting functions
 */
export function normalizeUrl(url: string, config?: CS2InspectConfig): string {
    return normalizeInspectUrl(url, config);
}

/**
 * Quick URL validation check (static, optimized)
 * ⚡ Truly static - no instance creation, uses pure parsing function
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
