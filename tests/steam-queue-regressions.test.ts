import { EventEmitter } from 'node:events';
import { SteamClient, SteamClientStatus, DEFAULT_STEAM_CONFIG, analyzeUrl } from '../src';

// Use the installed node-cs2 request implementation with a mocked outgoing transport.
// No Steam login, network traffic or real account is involved.
const NodeCS2 = require('node-cs2');
function setup(overrides = {}) {
    const gc = Object.assign(new EventEmitter(), {
        _send: jest.fn(), _inspectTimeout: 50, inspectItem: NodeCS2.prototype.inspectItem
    });
    const client: SteamClient = Object.create(SteamClient.prototype);
    EventEmitter.call(client);
    Object.assign(client, {
        config: { ...DEFAULT_STEAM_CONFIG, requestTimeout: 10, rateLimitDelay: 1, queueTimeout: 100, ...overrides },
        csgoClient: gc, steamClient: Object.assign(new EventEmitter(), { logOff: jest.fn() }),
        queue: [], queueRun: 0, processing: false, debugMode: false, status: SteamClientStatus.READY
    });
    return { client, gc };
}
const url = (id: string) => analyzeUrl(`S76561198084749846A${id}D123456789`);
function deliver(gc: EventEmitter, itemid: string) {
    const item = { itemid, defindex: 7, paintindex: 44, paintwear: 0.1 };
    gc.emit('inspectItemInfo', item);
    gc.emit(`inspectItemInfo#${itemid}`, item);
}

describe('Steam queue lifecycle', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('does not use a late response for a different queued asset', async () => {
        const { client, gc } = setup();
        const first = client.inspectItem(url('100'));
        const firstResult = expect(first).rejects.toThrow('timed out');
        const second = client.inspectItem(url('200'));
        await jest.advanceTimersByTimeAsync(11);
        await firstResult;
        let secondResolved = false;
        void second.then(() => { secondResolved = true; });
        deliver(gc, '100');
        await Promise.resolve();
        expect(secondResolved).toBe(false);
        deliver(gc, '200');
        await expect(second).resolves.toHaveProperty('itemid', '200');
        await jest.runAllTimersAsync();
        expect(client.getQueueLength()).toBe(0);
        expect(jest.getTimerCount()).toBe(0);
    });

    it('recovers when every waiting item expires', async () => {
        const { client, gc } = setup({ queueTimeout: 2, rateLimitDelay: 3 });
        const results = Promise.allSettled([client.inspectItem(url('100')), client.inspectItem(url('200'))]);
        await jest.advanceTimersByTimeAsync(14);
        expect((await results).map(r => r.status)).toEqual(['rejected', 'rejected']);
        expect((client as any).processing).toBe(false);
        const next = client.inspectItem(url('300'));
        deliver(gc, '300');
        await expect(next).resolves.toHaveProperty('itemid', '300');
        await jest.runAllTimersAsync(); // upstream's earlier request timeout is observed, not unhandled
        expect(jest.getTimerCount()).toBe(0);
    });

    it('rejects active and queued work on disconnect and ignores old responses after reconnect', async () => {
        const { client, gc } = setup();
        const results = Promise.allSettled([client.inspectItem(url('100')), client.inspectItem(url('200'))]);
        await client.disconnect();
        expect((await results).map(r => r.status)).toEqual(['rejected', 'rejected']);
        expect(client.getQueueLength()).toBe(0);
        (client as any).status = SteamClientStatus.READY;
        const next = client.inspectItem(url('300'));
        deliver(gc, '100');
        deliver(gc, '300');
        await expect(next).resolves.toHaveProperty('itemid', '300');
        await jest.runAllTimersAsync();
        expect(client.getQueueLength()).toBe(0);
        expect(jest.getTimerCount()).toBe(0);
    });

    it('does not revive a disconnected client when delayed GC events arrive', async () => {
        const { client, gc } = setup();
        (client as any).setupEventHandlers();
        await client.disconnect();
        gc.emit('disconnectedFromGC', 'logged off');
        gc.emit('connectedToGC');
        expect(client.getStatus()).toBe(SteamClientStatus.DISCONNECTED);
    });

    it('cancels a rate-limit wait on disconnect', async () => {
        const { client, gc } = setup({ rateLimitDelay: 10000 });
        const first = client.inspectItem(url('100'));
        const second = client.inspectItem(url('200'));
        const secondResult = expect(second).rejects.toThrow('disconnected');
        deliver(gc, '100');
        await first;
        await client.disconnect();
        await secondResult;
        await jest.runAllTimersAsync();
        expect(jest.getTimerCount()).toBe(0);
        expect(gc._send).toHaveBeenCalledTimes(1);
    });

    it('recovers from a synchronous transport failure and observes upstream rejection', async () => {
        const { client, gc } = setup({ requestTimeout: 100 });
        gc._send.mockImplementationOnce(() => { throw new Error('transport failed'); });
        await expect(client.inspectItem(url('100'))).rejects.toMatchObject({
            message: expect.stringContaining('transport failed'),
            code: 'STEAM_INSPECTION_ERROR',
            context: { originalError: { code: 'SEND_FAILED' } }
        });
        const pending = expect(client.inspectItem(url('200'))).rejects.toThrow('Steam inspection failed');
        await jest.advanceTimersByTimeAsync(50);
        await pending;
        expect((client as any).processing).toBe(false);
        expect(jest.getTimerCount()).toBe(0);
    });
});

describe('per-request queue cancellation', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());
    it('removes an aborted queued read without sending it', async () => {
        const { client, gc } = setup();
        const first=client.inspectItem(url('100'));
        const controller=new AbortController();
        const second=client.inspectItem(url('200'),{signal:controller.signal});
        const failure=expect(second).rejects.toThrow('cancelled');controller.abort();await failure;
        deliver(gc,'100');await first;await jest.runAllTimersAsync();
        expect(gc._send).toHaveBeenCalledTimes(1);expect(client.getQueueLength()).toBe(0);
    });
    it('an aborted active read retains its slot until its response arrives',async()=>{
        const {client,gc}=setup();const controller=new AbortController();
        const first=client.inspectItem(url('100'),{signal:controller.signal});
        const failure=expect(first).rejects.toThrow('cancelled');
        const second=client.inspectItem(url('200'));controller.abort();await failure;
        expect(gc._send).toHaveBeenCalledTimes(1);
        deliver(gc,'100');await jest.advanceTimersByTimeAsync(1);
        expect(gc._send).toHaveBeenCalledTimes(2);deliver(gc,'200');await second;
        await jest.runAllTimersAsync();expect(jest.getTimerCount()).toBe(0);
    });
});
