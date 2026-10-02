/** Browser-safe local codecs. This entry never imports authenticated Steam code. */
export * from './types';
export * from './errors';
export * from './weapon-paints';
export * from './weapon-paint-types';
export * from './url-analyzer';
export { Validator } from './validation';
export { ProtobufReader, ProtobufReader as Protobuf } from './protobuf-reader';
export { ProtobufWriter } from './protobuf-writer';
export * from './item-tools';
export * from './inspect-document';
export * from './diagnostics';
import { EconItem, CS2InspectConfig, AnalyzedInspectURL } from './types';
import { ProtobufReader } from './protobuf-reader';
import { ProtobufWriter } from './protobuf-writer';
import { analyzeInspectUrl } from './url-analyzer';
import { InvalidUrlError } from './errors';
/**
 * Helper: Decodes masked protobuf data from an analyzed URL.
 * Throws appropriate errors for unmasked or invalid URLs.
 */
export function decodeMaskedFromAnalyzed(analyzed: AnalyzedInspectURL, config?: CS2InspectConfig): EconItem {
    if (analyzed.url_type === 'masked' && analyzed.hex_data) {
        return ProtobufReader.decodeMaskedData(analyzed.hex_data, config);
    }

    if (analyzed.url_type === 'unmasked') {
        throw new InvalidUrlError(
            'This is an unmasked URL (market/inventory link). Use inspectItem() instead for Steam client inspection.',
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


export * from './batch';
