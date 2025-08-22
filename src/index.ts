/**
 * CS2 Inspect URL Library - Enhanced Version
 * 
 * A comprehensive TypeScript library for encoding and decoding CS2 inspect URLs
 * with full protobuf support, validation, and error handling.
 */

// Export all types
export * from './types';

// Export error classes
export * from './errors';

// Export validation utilities
export { Validator } from './validation';

// Export protobuf classes
export { ProtobufReader } from './protobuf-reader';
export { ProtobufWriter } from './protobuf-writer';

// Export URL utilities
export * from './url-analyzer';

// Main API class
import { EconItem, CS2InspectConfig, DEFAULT_CONFIG, AnalyzedInspectURL } from './types';
import { ProtobufReader } from './protobuf-reader';
import { ProtobufWriter } from './protobuf-writer';
import { UrlAnalyzer } from './url-analyzer';
import { Validator } from './validation';

/**
 * Main CS2 Inspect URL API class
 */
export class CS2Inspect {
    private config: Required<CS2InspectConfig>;
    private urlAnalyzer: UrlAnalyzer;

    constructor(config: CS2InspectConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.urlAnalyzer = new UrlAnalyzer(this.config);
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
     * Decodes an inspect URL into an EconItem
     * 
     * @param url - The inspect URL to decode
     * @returns The decoded item data
     * 
     * @example
     * ```typescript
     * const cs2 = new CS2Inspect();
     * const url = "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20...";
     * const item = cs2.decodeInspectUrl(url);
     * ```
     */
    decodeInspectUrl(url: string): EconItem {
        const analyzed = this.urlAnalyzer.analyzeInspectUrl(url);
        
        if (analyzed.url_type !== 'masked' || !analyzed.hex_data) {
            throw new Error('Can only decode masked URLs with protobuf data');
        }

        return ProtobufReader.decodeMaskedData(analyzed.hex_data, this.config);
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
     * @param url - The URL to check
     * @returns True if valid, false otherwise
     */
    isValidUrl(url: string): boolean {
        return this.urlAnalyzer.isValidInspectUrl(url);
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
     * Updates the configuration
     * 
     * @param newConfig - New configuration options
     */
    updateConfig(newConfig: Partial<CS2InspectConfig>): void {
        this.config = { ...this.config, ...newConfig };
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
 * Convenience functions for quick usage without instantiating the class
 */

/**
 * Creates an inspect URL from an EconItem (convenience function)
 */
export function createInspectUrl(item: EconItem, config?: CS2InspectConfig): string {
    return ProtobufWriter.createInspectUrl(item, config);
}

/**
 * Decodes an inspect URL into an EconItem (convenience function)
 */
export function decodeInspectUrl(url: string, config?: CS2InspectConfig): EconItem {
    const cs2 = new CS2Inspect(config);
    return cs2.decodeInspectUrl(url);
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

/**
 * Default CS2Inspect instance for quick usage
 */
export const cs2inspect = new CS2Inspect();

/**
 * Version information
 */
export const VERSION = '2.0.0';

/**
 * Library information
 */
export const LIBRARY_INFO = {
    name: 'cs2-inspect-lib',
    version: VERSION,
    description: 'Enhanced CS2 Inspect library with full protobuf support',
    features: [
        'Complete protobuf encoding/decoding',
        'Input validation and error handling',
        'TypeScript support with comprehensive types',
        'Support for all CS2 item fields including new additions',
        'URL analysis and normalization',
        'Configurable validation and limits'
    ]
} as const;
