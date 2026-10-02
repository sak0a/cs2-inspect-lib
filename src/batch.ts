import { AnalyzedInspectURL, CS2InspectConfig, EconItem } from './types';
import { analyzeInspectUrl } from './url-analyzer';
import { ProtobufReader } from './protobuf-reader';

export class BatchInspectionError extends Error {
    constructor(public readonly code: 'CANCELLED' | 'STEAM_REQUIRED' | 'INSPECTION_FAILED', message: string, public readonly cause?: unknown) {
        super(message); this.name = 'BatchInspectionError';
    }
}
export type BatchItemResult =
    | { index: number; input: string; status: 'success'; item: EconItem }
    | { index: number; input: string; status: 'error'; error: Error };
export interface BatchProgress { completed: number; total: number; result: BatchItemResult }
export interface BatchInspectOptions {
    config?: CS2InspectConfig;
    /** Existing authenticated manager; its queue/rate limiting is reused. */
    steamClient?: { inspectUnmaskedUrl(url: AnalyzedInspectURL, options?: { signal?: AbortSignal }): Promise<EconItem> };
    signal?: AbortSignal;
    /** Number of locally scheduled inputs, default 4. Steam still uses its existing queue. */
    concurrency?: number;
    onProgress?: (progress: BatchProgress) => void;
}
const cancelled = () => new BatchInspectionError('CANCELLED', 'Batch inspection cancelled');

/** Results retain input order. Duplicates share one lookup within this batch only. */
export async function inspectBatch(inputs: readonly string[], options: BatchInspectOptions = {}): Promise<BatchItemResult[]> {
    const concurrency = options.concurrency ?? 4;
    if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 100) throw new RangeError('concurrency must be an integer from 1 to 100');
    const results: BatchItemResult[] = new Array(inputs.length);
    const requests = new Map<string, Promise<EconItem>>();
    let cursor = 0, completed = 0;
    const lookup = (input: string): Promise<EconItem> => {
        if (options.signal?.aborted) return Promise.reject(cancelled());
        const analyzed = analyzeInspectUrl(input, options.config);
        const key = analyzed.hex_data ? `embedded:${analyzed.hex_data.toUpperCase()}`
            : `${analyzed.market_id ? 'M' : 'S'}${BigInt(analyzed.market_id ?? analyzed.owner_id!)}A${BigInt(analyzed.asset_id!)}D${BigInt(analyzed.class_id!)}`;
        let pending = requests.get(key);
        if (!pending) {
            pending = Promise.resolve().then(async () => {
                if (options.signal?.aborted) throw cancelled();
                if (analyzed.hex_data) return ProtobufReader.decodeMaskedData(analyzed.hex_data, options.config);
                if (!options.steamClient) throw new BatchInspectionError('STEAM_REQUIRED', 'Legacy inspect links require an authenticated Steam client');
                return options.steamClient.inspectUnmaskedUrl(analyzed, { signal: options.signal });
            });
            requests.set(key, pending);
        }
        // A structural resolver may not implement cancellation. Stop waiting but
        // retain rejection handlers; never retry or disconnect another caller.
        return new Promise((resolve, reject) => {
            const abort = () => { cleanup(); reject(cancelled()); };
            const cleanup = () => options.signal?.removeEventListener('abort', abort);
            options.signal?.addEventListener('abort', abort, { once: true });
            pending!.then(value => { cleanup(); resolve(value); }, error => { cleanup(); reject(error); });
            if (options.signal?.aborted) abort();
        });
    };
    const worker = async () => {
        while (cursor < inputs.length) {
            const index = cursor++; const input = inputs[index]; let result: BatchItemResult;
            try { result = { index, input, status:'success', item: await lookup(input) }; }
            catch (error) { result = { index, input, status:'error', error: error instanceof Error ? error : new BatchInspectionError('INSPECTION_FAILED', String(error), error) }; }
            results[index] = result;
            completed++;
            options.onProgress?.({ completed, total: inputs.length, result });
        }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, inputs.length) }, worker));
    return results;
}
