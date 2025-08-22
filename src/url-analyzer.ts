/**
 * Enhanced URL analysis and formatting utilities
 */

import { AnalyzedInspectURL, CS2InspectConfig, DEFAULT_CONFIG } from './types';
import { InvalidUrlError } from './errors';
import { Validator } from './validation';

const INSPECT_BASE = "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20";

/**
 * Enhanced URL analyzer with comprehensive validation
 */
export class UrlAnalyzer {
    private config: Required<CS2InspectConfig>;

    constructor(config: CS2InspectConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Analyzes and parses an inspect URL
     */
    analyzeInspectUrl(url: string): AnalyzedInspectURL {
        if (this.config.validateInput) {
            const validation = Validator.validateInspectUrl(url);
            if (!validation.valid) {
                throw new InvalidUrlError(
                    `URL validation failed: ${validation.errors.join(', ')}`,
                    { errors: validation.errors, warnings: validation.warnings }
                );
            }
        }

        try {
            // Clean and normalize the URL
            let cleanedUrl = url.trim();
            const originalUrl = url;

            // Handle various URL formats
            if (!cleanedUrl.startsWith("steam://")) {
                const previewVariants = [
                    "csgo_econ_action_preview ",
                    "csgo_econ_action_preview%20",
                    "+csgo_econ_action_preview ",
                    "+csgo_econ_action_preview%20"
                ];

                for (const variant of previewVariants) {
                    if (cleanedUrl.startsWith(variant)) {
                        cleanedUrl = INSPECT_BASE + cleanedUrl.slice(variant.length);
                        break;
                    }
                }

                // Handle raw data
                if (!cleanedUrl.startsWith("steam://")) {
                    if (cleanedUrl.startsWith("M") || cleanedUrl.startsWith("S") || /^[0-9A-F]+$/i.test(cleanedUrl)) {
                        cleanedUrl = INSPECT_BASE + cleanedUrl;
                    }
                }
            }

            // Check if URL is quoted
            const isQuoted = cleanedUrl.includes("%20");

            // Normalize to quoted format
            if (!isQuoted) {
                cleanedUrl = cleanedUrl.replace(/ /g, "%20");
            }

            // Extract the payload
            const parts = cleanedUrl.split("csgo_econ_action_preview%20");
            if (parts.length < 2) {
                throw new InvalidUrlError(
                    'URL does not contain valid preview command',
                    { url: originalUrl, cleanedUrl }
                );
            }

            const payload = parts[1];

            if (!payload) {
                throw new InvalidUrlError(
                    'URL payload is empty',
                    { url: originalUrl, cleanedUrl }
                );
            }

            // Pattern for unmasked URLs (Market/Steam profile links)
            const unmaskedPattern = /^([SM])(\d+)A(\d+)D(\d+)$/;
            const unmaskedMatch = payload.match(unmaskedPattern);

            if (unmaskedMatch) {
                const [, typeChar, idValue, assetId, classId] = unmaskedMatch;
                
                // Validate numeric values
                if (!this.isValidId(idValue) || !this.isValidId(assetId) || !this.isValidId(classId)) {
                    throw new InvalidUrlError(
                        'Invalid numeric values in unmasked URL',
                        { typeChar, idValue, assetId, classId }
                    );
                }

                return {
                    original_url: originalUrl,
                    cleaned_url: cleanedUrl,
                    url_type: 'unmasked',
                    is_quoted: isQuoted,
                    market_id: typeChar === 'M' ? idValue : undefined,
                    owner_id: typeChar === 'S' ? idValue : undefined,
                    asset_id: assetId,
                    class_id: classId
                };
            }

            // Pattern for masked URLs (hex-encoded protobuf data)
            const maskedPattern = /^[0-9A-Fa-f]+$/;
            const maskedMatch = payload.match(maskedPattern);

            if (maskedMatch) {
                // Validate hex data
                if (this.config.validateInput) {
                    const hexValidation = Validator.validateHexData(payload);
                    if (!hexValidation.valid) {
                        throw new InvalidUrlError(
                            `Invalid hex data: ${hexValidation.errors.join(', ')}`,
                            { errors: hexValidation.errors }
                        );
                    }
                }

                return {
                    original_url: originalUrl,
                    cleaned_url: cleanedUrl,
                    url_type: 'masked',
                    is_quoted: isQuoted,
                    hex_data: payload.toUpperCase()
                };
            }

            throw new InvalidUrlError(
                'URL payload does not match any known format',
                { payload, expectedFormats: ['unmasked (M/S + numbers)', 'masked (hex data)'] }
            );

        } catch (error) {
            if (error instanceof InvalidUrlError) {
                throw error;
            }
            throw new InvalidUrlError(
                'Failed to analyze inspect URL',
                { url, originalError: error }
            );
        }
    }

    /**
     * Formats an analyzed URL back to string format
     */
    formatInspectUrl(
        urlInfo: AnalyzedInspectURL, 
        options: {
            quote?: boolean;
            includeSteamPrefix?: boolean;
        } = {}
    ): string {
        const { quote = true, includeSteamPrefix = true } = options;

        try {
            const separator = quote ? "%20" : " ";
            const prefix = includeSteamPrefix ? INSPECT_BASE : "+csgo_econ_action_preview";
            const base = prefix + separator;

            if (urlInfo.url_type === 'masked') {
                if (!urlInfo.hex_data) {
                    throw new InvalidUrlError(
                        'Masked URL missing hex data',
                        { urlInfo }
                    );
                }
                return base + urlInfo.hex_data;
            } else {
                const typeChar = urlInfo.market_id ? 'M' : 'S';
                const idValue = urlInfo.market_id || urlInfo.owner_id;
                
                if (!idValue || !urlInfo.asset_id || !urlInfo.class_id) {
                    throw new InvalidUrlError(
                        'Unmasked URL missing required fields',
                        { urlInfo }
                    );
                }

                return `${base}${typeChar}${idValue}A${urlInfo.asset_id}D${urlInfo.class_id}`;
            }

        } catch (error) {
            if (error instanceof InvalidUrlError) {
                throw error;
            }
            throw new InvalidUrlError(
                'Failed to format inspect URL',
                { urlInfo, options, originalError: error }
            );
        }
    }

    /**
     * Validates if a string represents a valid ID (numeric and reasonable length)
     */
    private isValidId(id: string): boolean {
        if (!/^\d+$/.test(id)) {
            return false;
        }
        
        const num = parseInt(id, 10);
        return !isNaN(num) && num >= 0 && id.length <= 20; // Reasonable length limit
    }

    /**
     * Extracts basic information from URL without full decoding
     */
    getUrlInfo(url: string): {
        type: 'masked' | 'unmasked' | 'invalid';
        isQuoted: boolean;
        hasValidFormat: boolean;
        estimatedSize?: number;
    } {
        try {
            const analyzed = this.analyzeInspectUrl(url);
            return {
                type: analyzed.url_type,
                isQuoted: analyzed.is_quoted,
                hasValidFormat: true,
                estimatedSize: analyzed.hex_data?.length || 0
            };
        } catch {
            return {
                type: 'invalid',
                isQuoted: url.includes('%20'),
                hasValidFormat: false
            };
        }
    }

    /**
     * Checks if URL is likely a valid inspect URL without throwing errors
     */
    isValidInspectUrl(url: string): boolean {
        try {
            this.analyzeInspectUrl(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Normalizes URL format (converts to quoted Steam URL)
     */
    normalizeUrl(url: string): string {
        const analyzed = this.analyzeInspectUrl(url);
        return this.formatInspectUrl(analyzed, { quote: true, includeSteamPrefix: true });
    }
}

/**
 * Static convenience functions
 */
export function analyzeInspectUrl(url: string, config?: CS2InspectConfig): AnalyzedInspectURL {
    const analyzer = new UrlAnalyzer(config);
    return analyzer.analyzeInspectUrl(url);
}

export function formatInspectUrl(
    urlInfo: AnalyzedInspectURL, 
    options?: { quote?: boolean; includeSteamPrefix?: boolean },
    config?: CS2InspectConfig
): string {
    const analyzer = new UrlAnalyzer(config);
    return analyzer.formatInspectUrl(urlInfo, options);
}

export function isValidInspectUrl(url: string, config?: CS2InspectConfig): boolean {
    const analyzer = new UrlAnalyzer(config);
    return analyzer.isValidInspectUrl(url);
}

export function normalizeInspectUrl(url: string, config?: CS2InspectConfig): string {
    const analyzer = new UrlAnalyzer(config);
    return analyzer.normalizeUrl(url);
}
