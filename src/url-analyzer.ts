/**
 * Enhanced URL analysis and formatting utilities
 */

import { AnalyzedInspectURL, CS2InspectConfig, DEFAULT_CONFIG } from './types';
import { parseInspectUrl, formatInspectUrl as formatInspectUrlPure } from './utils/url-parser';

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
        return parseInspectUrl(url, this.config);
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
        return formatInspectUrlPure(urlInfo, options);
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

    /**
     * Check if URL requires Steam client for inspection
     */
    requiresSteamClient(url: string): boolean {
        try {
            const analyzed = this.analyzeInspectUrl(url);
            return analyzed.url_type === 'unmasked';
        } catch {
            return false;
        }
    }
}

/**
 * Static convenience functions - No instance creation needed
 * These functions use pure parsing logic for maximum performance
 */

export function analyzeInspectUrl(url: string, config?: CS2InspectConfig): AnalyzedInspectURL {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    return parseInspectUrl(url, mergedConfig);
}

export function formatInspectUrl(
    urlInfo: AnalyzedInspectURL,
    options?: { quote?: boolean; includeSteamPrefix?: boolean },
    _config?: CS2InspectConfig  // Kept for backward compatibility but not used
): string {
    return formatInspectUrlPure(urlInfo, options);
}

export function isValidInspectUrl(url: string, config?: CS2InspectConfig): boolean {
    try {
        analyzeInspectUrl(url, config);
        return true;
    } catch {
        return false;
    }
}

export function normalizeInspectUrl(url: string, config?: CS2InspectConfig): string {
    const analyzed = analyzeInspectUrl(url, config);
    return formatInspectUrlPure(analyzed, { quote: true, includeSteamPrefix: true });
}

export function requiresSteamClient(url: string, config?: CS2InspectConfig): boolean {
    try {
        const analyzed = analyzeInspectUrl(url, config);
        return analyzed.url_type === 'unmasked';
    } catch {
        return false;
    }
}
