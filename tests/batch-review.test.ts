import { EventEmitter, getEventListeners } from 'node:events';
import { inspectBatch, BatchInspectionError, createInspectUrl, type EconItem } from '../src/core';
import { SteamClient, SteamClientStatus, DEFAULT_STEAM_CONFIG, analyzeUrl } from '../src';

const item: EconItem = { defindex: 7, paintindex: 44, paintseed: 1, paintwear: 0.1 };
const legacy = (asset: number) => `S76561198000000000A${asset}D1`;
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

describe('batch independent cancellation and dedup review', () => {
    it('does not conflate different legacy coordinates and returns input order despite response order', async () => {
        const pending = new Map<string, (value: EconItem) => void>();
        const steamClient = { inspectUnmaskedUrl: jest.fn(url => new Promise<EconItem>(resolve => {
            pending.set(url.cleaned_url, resolve);
        })) };
        const progress = jest.fn();
        const inputs = ['M1A2D3', 'M1A2D4', 'M2A2D3', 'S1A2D3'];
        const batch = inspectBatch(inputs, { steamClient, onProgress: progress });
        await flush();
        expect(steamClient.inspectUnmaskedUrl).toHaveBeenCalledTimes(4);
        for (let index = 3; index >= 0; index--) {
            const url = analyzeUrl(inputs[index]).cleaned_url;
            pending.get(url)!({ ...item, paintseed: index });
            await flush();
        }
        const results = await batch;
        expect(results.map(r => r.status === 'success' ? r.item.paintseed : -1)).toEqual([0, 1, 2, 3]);
        expect(progress.mock.calls.map(([p]) => p.result.index)).toEqual([3, 2, 1, 0]);
    });
    it('deduplicates leading-zero legacy IDs, retains failures without retry, and scopes cache to one batch', async () => {
        const steamClient = { inspectUnmaskedUrl: jest.fn().mockRejectedValue('offline') };
        const inputs = ['M01A002D003', 'M1A2D3'];
        const results = await inspectBatch(inputs, { steamClient });
        expect(steamClient.inspectUnmaskedUrl).toHaveBeenCalledTimes(1);
        expect(results.every(r => r.status === 'error' && r.error instanceof BatchInspectionError && r.error.code === 'INSPECTION_FAILED')).toBe(true);
        await inspectBatch(inputs, { steamClient });
        expect(steamClient.inspectUnmaskedUrl).toHaveBeenCalledTimes(2);
    });
    it('removes abort listeners after success, error, and cancellation with late rejection', async () => {
        const controller = new AbortController();
        const signal = controller.signal;
        await inspectBatch([createInspectUrl(item), 'bad'], { signal });
        expect(getEventListeners(signal, 'abort')).toHaveLength(0);
        await inspectBatch([legacy(1)], { signal, steamClient: { inspectUnmaskedUrl: jest.fn().mockRejectedValue(new Error('offline')) } });
        expect(getEventListeners(signal, 'abort')).toHaveLength(0);
        let reject!: (error: Error) => void;
        const steamClient = { inspectUnmaskedUrl: jest.fn(() => new Promise<EconItem>((_, fail) => { reject = fail; })) };
        const batch = inspectBatch([legacy(1), legacy(1), legacy(2)], { signal, steamClient, concurrency: 2 });
        await flush();
        expect(getEventListeners(signal, 'abort')).toHaveLength(2);
        controller.abort();
        const results = await batch;
        expect(results.every(r => r.status === 'error' && r.error instanceof BatchInspectionError && r.error.code === 'CANCELLED')).toBe(true);
        expect(getEventListeners(signal, 'abort')).toHaveLength(0);
        reject(new Error('late transport rejection'));
        await flush();
        expect(steamClient.inspectUnmaskedUrl).toHaveBeenCalledTimes(1);
    });
    it('propagates the documented progress callback exception', async () => {
        const failure = new Error('application progress callback');
        await expect(inspectBatch([createInspectUrl(item)], { onProgress: () => { throw failure; } })).rejects.toBe(failure);
    });
});

function setupQueue() {
    const callbacks: Array<{ resolve: (value: EconItem) => void; reject: (error: Error) => void }> = [];
    const gc = Object.assign(new EventEmitter(), {
        inspectItem: jest.fn(() => new Promise<EconItem>((resolve, reject) => callbacks.push({ resolve, reject })))
    });
    const client: SteamClient = Object.create(SteamClient.prototype);
    EventEmitter.call(client);
    Object.assign(client, {
        config: { ...DEFAULT_STEAM_CONFIG, requestTimeout: 10, rateLimitDelay: 1, queueTimeout: 100 },
        csgoClient: gc, steamClient: Object.assign(new EventEmitter(), { logOff: jest.fn() }),
        queue: [], queueRun: 0, processing: false, debugMode: false, status: SteamClientStatus.READY
    });
    return { client, gc, callbacks };
}

describe('Steam queue signal cleanup', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());
    it('cleans active and queued signal listeners on disconnect, observes late upstream rejection', async () => {
        const { client, callbacks } = setupQueue();
        const first = new AbortController(), second = new AbortController();
        const results = Promise.allSettled([
            client.inspectItem(analyzeUrl(legacy(1)), { signal: first.signal }),
            client.inspectItem(analyzeUrl(legacy(2)), { signal: second.signal })
        ]);
        expect(getEventListeners(first.signal, 'abort')).toHaveLength(1);
        expect(getEventListeners(second.signal, 'abort')).toHaveLength(1);
        await client.disconnect();
        expect((await results).every(r => r.status === 'rejected')).toBe(true);
        expect(getEventListeners(first.signal, 'abort')).toHaveLength(0);
        expect(getEventListeners(second.signal, 'abort')).toHaveLength(0);
        callbacks[0].reject(new Error('late upstream'));
        await flush();
        await jest.runAllTimersAsync();
        expect(jest.getTimerCount()).toBe(0);
    });
    it('cleans signal listeners on timeout and successful completion', async () => {
        const { client, callbacks } = setupQueue();
        const first = new AbortController();
        const failed = expect(client.inspectItem(analyzeUrl(legacy(1)), { signal: first.signal })).rejects.toThrow('timed out');
        await jest.advanceTimersByTimeAsync(10);
        await failed;
        expect(getEventListeners(first.signal, 'abort')).toHaveLength(0);
        const second = new AbortController();
        const successful = client.inspectItem(analyzeUrl(legacy(2)), { signal: second.signal });
        callbacks[1].resolve(item);
        await successful;
        expect(getEventListeners(second.signal, 'abort')).toHaveLength(0);
        callbacks[0].resolve(item);
        await flush();
        expect(jest.getTimerCount()).toBe(0);
    });
    it('pre-aborted calls never register listeners or send requests', async () => {
        const { client, gc } = setupQueue();
        const controller = new AbortController(); controller.abort();
        await expect(client.inspectItem(analyzeUrl(legacy(1)), { signal: controller.signal })).rejects.toThrow('cancelled');
        expect(gc.inspectItem).not.toHaveBeenCalled();
        expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0);
        expect(jest.getTimerCount()).toBe(0);
    });
});
