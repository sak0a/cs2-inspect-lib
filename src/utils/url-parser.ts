/**
 * Pure URL parsing functions - no class instances
 * These functions are used by static methods for optimal performance
 */

import { AnalyzedInspectURL, CS2InspectConfig } from '../types';
import { InvalidUrlError } from '../errors';
import { Validator } from '../validation';

export const INSPECT_BASE = "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20";

/**
 * Validates if a string represents a valid ID (numeric and reasonable length)
 */
function isValidId(id: string): boolean {
    if (!/^\d+$/.test(id)) {
        return false;
    }
    
    const num = parseInt(id, 10);
    return !isNaN(num) && num >= 0 && id.length <= 20; // Reasonable length limit
}

/**
 * Pure function to parse an inspect URL - no instance creation
 * This is the core parsing logic extracted from UrlAnalyzer
 */
export function parseInspectUrl(url: string, config: Required<CS2InspectConfig>): AnalyzedInspectURL {
    // Validate input if enabled
    if (config.validateInput) {
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
            if (!isValidId(idValue) || !isValidId(assetId) || !isValidId(classId)) {
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
            // Validate hex data if validation is enabled
            if (config.validateInput) {
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
 * Pure function to format an analyzed URL back to string format - no instance creation
 * This is the core formatting logic extracted from UrlAnalyzer
 */
export function formatInspectUrl(
    urlInfo: AnalyzedInspectURL,
    options: {
        quote?: boolean;
        includeSteamPrefix?: boolean;
    } = {}
): string {
    const { quote = true, includeSteamPrefix = true } = options;

    try {
        let base: string;
        if (includeSteamPrefix) {
            if (quote) {
                // INSPECT_BASE already includes %20
                base = INSPECT_BASE;
            } else {
                // Replace %20 with space for unquoted format
                base = INSPECT_BASE.replace('%20', ' ');
            }
        } else {
            const separator = quote ? "%20" : " ";
            base = "+csgo_econ_action_preview" + separator;
        }

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

