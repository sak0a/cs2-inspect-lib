// Compile-only public declaration consumer; intentionally outside Jest matching.
import { CS2Inspect, inspectBatch as rootBatch, SteamClientManager, SteamClient, type EconItem } from 'cs2-inspect-lib';
import { inspectBatch as steamBatch } from 'cs2-inspect-lib/steam';
import {
    createInspectUrl, decodeMaskedUrl, diagnoseInspectLink, decodeInspectDocument,
    compareItems, validateWireItem, validateItemData, inspectBatch,
    BatchInspectionError, type BatchInspectOptions, type BatchItemResult,
    type BatchProgress, type ItemDiagnostic, type ItemDifference, type ItemEdit,
    type AttachmentCollection, type ItemValidation
} from 'cs2-inspect-lib/core';

export async function publicUsage(manager: SteamClientManager, steam: SteamClient, signal: AbortSignal) {
    const item: EconItem = { defindex: 7, paintindex: 44, paintseed: 0, paintwear: 0.1, itemid: 18446744073709551615n };
    const url: string = createInspectUrl(item);
    const decoded: EconItem = decodeMaskedUrl(url);
    const validation: ItemValidation = validateWireItem(decoded);
    const game: ItemValidation = validateItemData(decoded, { mode: 'permissive' });
    const diagnostics: ItemDiagnostic[] = diagnoseInspectLink(url).diagnostics;
    const differences: ItemDifference[] = compareItems(item, { customname: '' });
    const patch: ItemEdit = { customnames: ['名', '😀'], blobdata: Uint8Array.of(0, 255) };
    const collection: AttachmentCollection = 'keychains';
    const document = decodeInspectDocument(url).edit(patch);
    const edit = () => document.editAttachment(collection, 0, { offset_x: 0.2 });
    const options: BatchInspectOptions = {
        steamClient: manager, signal, concurrency: 2,
        onProgress(progress: BatchProgress) {
            if (progress.result.status === 'success') {
                const resultItem: EconItem = progress.result.item;
                void resultItem;
            } else {
                const error: Error = progress.result.error;
                if (error instanceof BatchInspectionError) {
                    const code: 'CANCELLED' | 'STEAM_REQUIRED' | 'INSPECTION_FAILED' = error.code;
                    void code;
                }
            }
        }
    };
    const results: BatchItemResult[] = await inspectBatch([url], options);
    await rootBatch([url], options);
    await steamBatch([url], options);
    await new CS2Inspect().inspectBatch([url], { signal });
    // Old no-options forms remain valid alongside cancellation-aware overloads.
    const analyzed = { original_url: 'M1A2D3', cleaned_url: 'M1A2D3', url_type: 'unmasked' as const, is_quoted: false, market_id: '1', asset_id: '2', class_id: '3' };
    await manager.inspectUnmaskedUrl(analyzed);
    await manager.inspectUnmaskedUrl(analyzed, { signal });
    await steam.inspectItem(analyzed);
    await steam.inspectItem(analyzed, { signal });
    // @ts-expect-error Attachment edits require the occurrence-preserving method.
    document.edit({ stickers: [] });
    // @ts-expect-error Unknown policy names must fail at compile time.
    validateItemData(item, { mode: 'allow-all' });
    // @ts-expect-error A discriminated error result has no successful item.
    const missing = ({} as Extract<BatchItemResult, { status: 'error' }>).item;
    return { validation, game, diagnostics, differences, edit, results, missing };
}
