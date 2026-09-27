import {
    createInspectUrl, decodeMaskedUrl, decodeMaskedData, ProtobufWriter,
    ProtobufReader, validateItem, SteamClientManager
} from '../src';
import type { EconItem } from '../src';

// Independent generated schema from the upstream package, not this library's codec.
const { CEconItemPreviewDataBlock: Preview } = require('node-cs2/protobufs/generated/_load.js');
const decodeUpstreamLink = require('node-cs2/lib/inspect-link.js');
const base: EconItem = { defindex: 7, paintindex: 44, paintseed: 661, paintwear: 0.15 };

function frame(payload: Uint8Array, mask = 0): string {
    const token = Buffer.alloc(payload.length + 5);
    token[0] = mask;
    token.set(payload, 1);
    // Compute independently from the library's lookup-table implementation.
    let crc = 0xffffffff;
    for (const byte of token.subarray(0, -4)) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit++) {
            crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
        }
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    token.writeUInt32BE(((crc & 0xffff) ^ (payload.length * crc)) >>> 0, token.length - 4);
    for (let i = 1; i < token.length; i++) token[i] ^= mask;
    return token.toString('hex');
}

describe('September 2026 protocol compatibility', () => {
    it('encodes new fields using the upstream schema and keeps uint64 precision', () => {
        const input: EconItem = {
            ...base, itemid: 18446744073709551615n,
            customname: 'ignored', customnames: ['First', '名字', ''],
            pet_food_expiration_date: 0xffffffff,
            blobdata: Uint8Array.from([0, 255, 128, 42])
        };
        const decoded = Preview.decode(ProtobufWriter.encodeItemData(input));
        expect(decoded.customnames).toEqual(input.customnames);
        expect(decoded.itemid.toString()).toBe(input.itemid!.toString());
        expect(decoded.pet_food_expiration_date).toBe(0xffffffff);
        expect(Array.from(decoded.blobdata)).toEqual([0, 255, 128, 42]);
        const upstream = decodeUpstreamLink(createInspectUrl(input));
        expect(upstream.customnames).toEqual(input.customnames);
    });

    it.each([0, 0x08, 0x5a, 0xff])('decodes upstream fields with mask %i', mask => {
        const wear = Buffer.alloc(4);
        wear.writeFloatLE(0.15);
        const payload = Preview.encode(Preview.fromObject({
            ...base, itemid: '18446744073709551615', paintwear: wear.readUInt32LE(),
            customnames: ['First', 'Last'], pet_food_expiration_date: 1800000000,
            blobdata: Buffer.from([0, 128, 255]),
            stickers: [{ slot: 0, sticker_id: 1, rotation: 15.5 }]
        })).finish();
        const token = frame(payload, mask);
        const item = decodeMaskedData(token);
        expect(item.customnames).toEqual(['First', 'Last']);
        expect(item.customname).toBe('Last');
        expect(item.itemid).toBe(18446744073709551615n);
        expect(item.pet_food_expiration_date).toBe(1800000000);
        expect(item.blobdata).toEqual(Uint8Array.from([0, 128, 255]));
        expect(item.paintwear).toBeCloseTo(0.15);
        expect(item.stickers![0].rotation).toBeCloseTo(15.5);
        expect(decodeUpstreamLink(token).customnames).toEqual(item.customnames);
    });

    it('preserves singular customname input and explicit empty-name precedence', () => {
        const item = decodeMaskedUrl(createInspectUrl({ ...base, customname: 'Legacy' }));
        expect(item.customname).toBe('Legacy');
        expect(item.customnames).toEqual(['Legacy']);
        const empty = decodeMaskedUrl(createInspectUrl({ ...base, customname: 'Ignored', customnames: [] }));
        expect(empty.customname).toBeUndefined();
    });

    it('preserves explicitly empty bytes and zero timestamps', () => {
        const item = decodeMaskedUrl(createInspectUrl({
            ...base, blobdata: new Uint8Array(), pet_food_expiration_date: 0
        }));
        expect(item.blobdata).toEqual(new Uint8Array());
        expect(item.pet_food_expiration_date).toBe(0);
    });

    it('decodes blobs larger than the sticker-message limit', () => {
        const blob = new Uint8Array(1100).fill(0xff);
        const payload = Preview.encode({ defindex: 7, blobdata: blob }).finish();
        expect(decodeMaskedData(frame(payload)).blobdata).toEqual(blob);
    });

    it.each([
        { customnames: 'name' }, { customnames: [42] }, { customnames: ['x'.repeat(101)] },
        { pet_food_expiration_date: -1 }, { pet_food_expiration_date: 1.5 },
        { pet_food_expiration_date: 0x100000000 }, { pet_food_expiration_date: NaN },
        { blobdata: 'not bytes' }
    ])('rejects invalid new-field values: %j', fields => {
        expect(validateItem({ ...base, ...fields }).valid).toBe(false);
        expect(() => createInspectUrl({ ...base, ...fields } as EconItem)).toThrow();
    });

    it('honors configured name limits for each repeated name', () => {
        expect(() => createInspectUrl({ ...base, customnames: ['ok', 'long'] }, {
            maxCustomNameLength: 3
        })).toThrow();
        const payload = Preview.encode({ defindex: 7, customnames: ['ok', 'long'] }).finish();
        expect(() => decodeMaskedData(frame(payload), { maxCustomNameLength: 3 })).toThrow();
    });

    it('rejects incorrect wire types and truncated blobs', () => {
        for (const bytes of [[0x18, 7, 0xc2, 1, 0], [0x18, 7, 0xc8, 1, 1], [0x18, 7, 0xca, 1, 20, 1]]) {
            expect(() => decodeMaskedData(frame(Uint8Array.from(bytes)))).toThrow();
        }
    });

    it('reads floating point values from offset Buffer views', () => {
        const buffer = Buffer.alloc(16);
        buffer.writeFloatLE(0.25, 4);
        expect(new ProtobufReader(buffer.subarray(4, 8)).readFloat()).toBe(0.25);
    });

    it('retains new fields when converting Steam results without connecting', () => {
        const manager = new SteamClientManager();
        const result = (manager as any).convertSteamDataToEconItem({
            ...base, customname: 'stale', customnames: ['First', 'Last'],
            pet_food_expiration_date: 1800000000, blobdata: Buffer.from([0, 255])
        });
        expect(result.customnames).toEqual(['First', 'Last']);
        expect(result.customname).toBe('Last');
        expect(result.pet_food_expiration_date).toBe(1800000000);
        expect(result.blobdata).toEqual(Uint8Array.from([0, 255]));
    });
});
