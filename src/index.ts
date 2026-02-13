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
import { InvalidUrlError, SteamNotReadyError } from './errors';

/**
 * Helper: Decodes masked protobuf data from an analyzed URL.
 * Throws appropriate errors for unmasked or invalid URLs.
 */
function decodeMaskedFromAnalyzed(analyzed: AnalyzedInspectURL, config?: CS2InspectConfig): EconItem {
    if (analyzed.url_type === 'masked' && analyzed.hex_data) {
        return ProtobufReader.decodeMaskedData(analyzed.hex_data, config);
    }

    if (analyzed.url_type === 'unmasked') {
        throw new InvalidUrlError(
            'This is an unmasked URL (market/inventory link). Use inspectItem() for Steam client inspection.',
            {
                urlType: analyzed.url_type,
                suggestion: 'For unmasked URLs, use inspectItem() with a Steam client, or create a CS2Inspect instance.',
                alternatives: [
                    'Use inspectItem(url, { steamClient: manager }) - pass existing SteamClientManager',
                    'Use cs2.inspectItem(url) - requires Steam client initialization',
                    'Use decodeMaskedUrl() only for masked URLs (containing hex data)'
                ]
            }
        );
    }

    throw new InvalidUrlError(
        'Invalid URL format or missing data',
        {
            url: analyzed.original_url,
            suggestion: 'Ensure the URL is a valid CS2 inspect URL.',
            expectedFormats: [
                'Masked: steam://rungame/730/.../+csgo_econ_action_preview%20[HEX_DATA]',
                'Unmasked: steam://rungame/730/.../+csgo_econ_action_preview%20[M|S][ID]A[ASSET]D[CLASS]'
            ]
        }
    );
}

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
     */
    createInspectUrl(item: EconItem): string {
        return ProtobufWriter.createInspectUrl(item, this.config);
    }

    /**
     * Decodes a MASKED inspect URL into an EconItem (synchronous, offline)
     *
     * Only works with MASKED URLs (URLs containing encoded protobuf data).
     * Does NOT work with UNMASKED URLs (market/inventory links) - use inspectItem() instead.
     *
     * @param url - The MASKED inspect URL to decode
     * @returns The decoded item data
     * @throws Error if URL is unmasked or invalid
     */
    decodeMaskedUrl(url: string): EconItem {
        const analyzed = this.urlAnalyzer.analyzeInspectUrl(url);
        return decodeMaskedFromAnalyzed(analyzed, this.config);
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
     * Works with MASKED URLs (decoded offline using protobuf data) and
     * UNMASKED URLs (fetched via Steam client). Automatically detects URL type.
     *
     * @param url - Any valid inspect URL (masked or unmasked)
     * @returns Promise resolving to the decoded item data
     * @throws Error if Steam client is required but not available
     */
    async inspectItem(url: string): Promise<EconItem | SteamInspectResult> {
        const analyzed = this.urlAnalyzer.analyzeInspectUrl(url);

        if (analyzed.url_type === 'masked' && analyzed.hex_data) {
            return ProtobufReader.decodeMaskedData(analyzed.hex_data, this.config);
        }

        if (analyzed.url_type === 'unmasked') {
            if (!this.steamManager.isAvailable()) {
                const status = this.steamManager.getStatus();
                throw new SteamNotReadyError(
                    'Steam client is required for unmasked URLs but is not available.',
                    {
                        urlType: analyzed.url_type,
                        steamClientStatus: status,
                        suggestion: 'Call cs2.initializeSteamClient() first. Ensure Steam client is configured with valid credentials in the CS2Inspect constructor.',
                        steps: [
                            '1. Configure Steam client: new CS2Inspect({ steamClient: { enabled: true, username: "...", password: "..." } })',
                            '2. Initialize: await cs2.initializeSteamClient()',
                            '3. Wait for ready: cs2.isSteamClientReady() should return true',
                            '4. Then call: await cs2.inspectItem(url)'
                        ],
                        alternative: 'For masked URLs (containing hex data), use decodeMaskedUrl() which works offline without Steam client.'
                    }
                );
            }
            return await this.steamManager.inspectUnmaskedUrl(analyzed);
        }

        throw new InvalidUrlError(
            'Invalid URL format or missing data',
            {
                url: analyzed.original_url,
                urlType: analyzed.url_type,
                suggestion: 'Ensure the URL is a valid CS2 inspect URL. Use analyzeUrl(url) to get detailed information about the URL structure.',
                expectedFormats: [
                    'Masked: steam://rungame/730/.../+csgo_econ_action_preview%20[HEX_DATA]',
                    'Unmasked: steam://rungame/730/.../+csgo_econ_action_preview%20[M|S][ID]A[ASSET]D[CLASS]'
                ]
            }
        );
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
 */

/**
 * Creates an inspect URL from an EconItem (convenience function)
 */
export function createInspectUrl(item: EconItem, config?: CS2InspectConfig): string {
    return ProtobufWriter.createInspectUrl(item, config);
}

/**
 * Decodes a MASKED inspect URL into an EconItem (convenience function)
 * Only works with MASKED URLs - use inspectItem() for universal support
 *
 * @param url - The MASKED inspect URL to decode
 * @param config - Optional configuration
 * @returns The decoded item data
 * @throws Error if URL is unmasked or invalid
 */
export function decodeMaskedUrl(url: string, config?: CS2InspectConfig): EconItem {
    const analyzed = analyzeInspectUrl(url, config);
    return decodeMaskedFromAnalyzed(analyzed, config);
}

/**
 * Decodes a MASKED inspect URL into an EconItem (convenience function)
 * @deprecated Use decodeMaskedUrl() instead for clearer naming
 */
export function decodeInspectUrl(url: string, config?: CS2InspectConfig): EconItem {
    return decodeMaskedUrl(url, config);
}

/**
 * Inspects ANY inspect URL (masked or unmasked) - Universal convenience function
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
    // Normalize arguments: extract config and steamClient from either format
    const isOptionsFormat = optionsOrConfig &&
        typeof optionsOrConfig === 'object' &&
        'steamClient' in optionsOrConfig;

    const config = isOptionsFormat
        ? (optionsOrConfig as { config?: CS2InspectConfig }).config
        : optionsOrConfig as CS2InspectConfig | undefined;

    const steamClient = isOptionsFormat
        ? (optionsOrConfig as { steamClient?: SteamClientManager }).steamClient
        : undefined;

    const analyzed = analyzeInspectUrl(url, config);

    // Handle masked URLs (offline, no Steam client needed)
    if (analyzed.url_type === 'masked' && analyzed.hex_data) {
        return ProtobufReader.decodeMaskedData(analyzed.hex_data, config);
    }

    // Handle unmasked URLs (requires Steam client)
    if (analyzed.url_type === 'unmasked') {
        // If steamClient was explicitly provided, use it
        if (steamClient) {
            if (!steamClient.isAvailable()) {
                const status = steamClient.getStatus();
                throw new SteamNotReadyError(
                    'Steam client is not ready for inspection.',
                    {
                        urlType: analyzed.url_type,
                        steamClientStatus: status,
                        suggestion: 'Ensure Steam client is initialized and connected before inspecting unmasked URLs.',
                        steps: [
                            '1. Create SteamClientManager or CS2Inspect with Steam client config',
                            '2. Call initialize() or initializeSteamClient()',
                            '3. Wait for status to be "ready" (check with getStatus() or isAvailable())',
                            '4. Then call inspectItem()'
                        ],
                        currentStatus: `Current status: ${status}`
                    }
                );
            }
            return await steamClient.inspectUnmaskedUrl(analyzed);
        }

        // No explicit steamClient: try auto-initialize (backward compat for config-only format)
        if (!isOptionsFormat) {
            const cs2 = new CS2Inspect(config);
            if (!cs2.isSteamClientReady()) {
                try {
                    await cs2.initializeSteamClient();
                } catch (error) {
                    throw new SteamNotReadyError(
                        'Failed to initialize Steam client for unmasked URL inspection.',
                        {
                            urlType: analyzed.url_type,
                            originalError: error,
                            suggestion: 'Ensure Steam client is properly configured with valid credentials.',
                            steps: [
                                '1. Verify credentials in config: { steamClient: { enabled: true, username: "...", password: "..." } }',
                                '2. Check network connection and Steam service status',
                                '3. For explicit error handling, use: inspectItem(url, { steamClient: manager })'
                            ],
                            alternative: 'For masked URLs, use decodeMaskedUrl(url) which works offline without Steam client.'
                        }
                    );
                }
            }
            return await cs2.inspectItem(url);
        }

        // Options format but no steamClient provided
        throw new SteamNotReadyError(
            'Unmasked URL requires Steam client but none was provided.',
            {
                urlType: analyzed.url_type,
                suggestion: 'Pass a SteamClientManager instance in the options, or use the CS2Inspect instance method instead.',
                solutions: [
                    {
                        method: 'Convenience function with Steam client',
                        code: 'const cs2 = new CS2Inspect({ steamClient: {...} });\nawait cs2.initializeSteamClient();\nconst item = await inspectItem(url, { steamClient: cs2.getSteamClientManager() });'
                    },
                    {
                        method: 'Instance method (recommended)',
                        code: 'const cs2 = new CS2Inspect({ steamClient: {...} });\nawait cs2.initializeSteamClient();\nconst item = await cs2.inspectItem(url);'
                    }
                ],
                alternative: 'For masked URLs, use decodeMaskedUrl(url) which works offline without Steam client.'
            }
        );
    }

    throw new InvalidUrlError(
        'Invalid URL format or missing data',
        {
            url: analyzed.original_url,
            urlType: analyzed.url_type,
            suggestion: 'Use analyzeUrl(url) to get detailed information about the URL structure.',
            expectedFormats: [
                'Masked: steam://rungame/730/.../+csgo_econ_action_preview%20[HEX_DATA]',
                'Unmasked: steam://rungame/730/.../+csgo_econ_action_preview%20[M|S][ID]A[ASSET]D[CLASS]'
            ]
        }
    );
}

/**
 * Inspects ANY inspect URL (masked or unmasked) - Universal convenience function
 * @deprecated Use inspectItem() instead for clearer naming
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
export const VERSION = '3.2.1';

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
