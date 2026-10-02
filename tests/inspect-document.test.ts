import { InspectDocument, decodeInspectDocument } from '../src/inspect-document';

// Hand-authored protobuf segments, independent of the library writer. Field 30
// deliberately uses a non-minimal varint and appears twice around known fields.
const unknown = [0xF0, 0x01, 0x81, 0x00];
const opaque = [0xCA, 0x01, 0x04, 0x00, 0xFF, 0x80, 0x00];
const nested = [0x08, 0x00, 0x10, 0x09, ...unknown, 0x1D, 0, 0, 0, 0, 0xFA, 0x01, 2, 0xFE, 0xFF];
const attachment = (tag: number[]) => [...tag, nested.length, ...nested];
const raw = Uint8Array.from([
    ...unknown, 0x18, 7, 0x20, 44, 0x38, 0, 0x40, 1,
    0x10, ...Array(9).fill(0xFF), 0x01,
    0x5A, 1, 0x41, ...attachment([0x62]), 0x5A, 0,
    ...opaque, ...attachment([0xA2, 1]), ...attachment([0xB2, 1]), ...unknown
]);

function contains(bytes: Uint8Array, part: number[]): boolean {
    return Array.from(bytes).some((_, i) => part.every((b, j) => bytes[i + j] === b));
}

describe('lossless protobuf document editing', () => {
    it('keeps the original bytes, ordering, duplicate unknown fields and uint64 precision', () => {
        const document = new InspectDocument(raw);
        expect(document.toProtobuf()).toEqual(raw);
        expect(document.edit({}).toProtobuf()).toEqual(raw);
        expect(document.item.itemid).toBe(0xFFFFFFFFFFFFFFFFn);
        expect(document.item.customnames).toEqual(['A', '']);
        expect(document.item.blobdata).toEqual(Uint8Array.of(0, 255, 128, 0));
        expect(decodeInspectDocument(document.toUrl()).toProtobuf()).toEqual(raw);
    });
    it('defensively owns bytes and exposes copies', () => {
        const input = raw.slice();
        const document = new InspectDocument(input);
        input.fill(0); document.toProtobuf().fill(0); document.item.blobdata!.fill(0);
        expect(document.toProtobuf()).toEqual(raw);
    });
    it('patches a scalar while retaining every other original segment verbatim', () => {
        const document = new InspectDocument(raw);
        const edited = document.edit({ paintseed: 127 });
        expect(edited.item.paintseed).toBe(127);
        expect(edited.toProtobuf()).toEqual(Uint8Array.from([...Array.from(raw).slice(0, 10), ...Array.from(raw).slice(12), 0x40, 127]));
        expect(document.toProtobuf()).toEqual(raw);
        expect(contains(edited.toProtobuf(), opaque)).toBe(true);
    });
    it.each(['stickers', 'keychains', 'variations'] as const)('preserves nested opaque fields when patching %s', collection => {
        const document = new InspectDocument(raw);
        const edited = document.editAttachment(collection, 0, { wear: 0.5 });
        expect(edited.item[collection]![0].wear).toBe(0.5);
        expect(document.item[collection]![0].wear).toBe(0);
        const unknownSuffix = [0xFA, 0x01, 2, 0xFE, 0xFF];
        expect(contains(edited.toProtobuf(), [...unknown, ...unknownSuffix, 0x1D, 0, 0, 0, 0x3F])).toBe(true);
        for (const other of ['stickers', 'keychains', 'variations'] as const) {
            if (other !== collection) expect(edited.item[other]).toEqual(document.item[other]);
        }
        expect(contains(edited.toProtobuf(), opaque)).toBe(true);
    });
    it('selects repeated attachments by occurrence even when slots repeat', () => {
        const document = new InspectDocument(Uint8Array.from([...raw, ...attachment([0x62])]));
        const edited = document.editAttachment('stickers', 1, { sticker_id: 42, offset_x: -0 });
        expect(edited.item.stickers![0]).toEqual({ slot: 0, sticker_id: 9, wear: 0 });
        expect(edited.item.stickers![1]).toEqual({ slot: 0, sticker_id: 42, wear: 0, offset_x: -0 });
        expect(Object.is(edited.item.stickers![1].offset_x, -0)).toBe(true);
        expect(contains(edited.toProtobuf(), attachment([0x62]))).toBe(true);
    });
    it('preserves unknown fixed32 and fixed64 segments during edits', () => {
        const fixedUnknowns = [0xFD, 1, 1, 2, 3, 4, 0xF9, 1, 1, 2, 3, 4, 5, 6, 7, 8];
        const document = new InspectDocument(Uint8Array.from([...raw, ...fixedUnknowns]));
        expect(contains(document.edit({ paintseed: 2 }).toProtobuf(), fixedUnknowns)).toBe(true);
    });
    it('deletes optional scalar and attachment fields without erasing their siblings', () => {
        const edited = new InspectDocument(raw).edit({ itemid: undefined }).editAttachment('stickers', 0, { wear: undefined });
        expect(edited.item.itemid).toBeUndefined();
        expect(edited.item.stickers![0]).toEqual({ slot: 0, sticker_id: 9 });
        expect(contains(edited.toProtobuf(), unknown)).toBe(true);
    });
    it('edits repeated names, the compatibility alias and empty names predictably', () => {
        const document = new InspectDocument(raw);
        expect(document.edit({ customnames: ['名', '😀', '名'] }).item.customnames).toEqual(['名', '😀', '名']);
        expect(document.edit({ customname: '' }).item.customnames).toEqual(['']);
        expect(document.edit({ customname: undefined }).item.customnames).toBeUndefined();
        expect(document.edit({ customnames: [] }).item.customnames).toBeUndefined();
        expect(document.edit({ customnames: undefined }).item.customnames).toBeUndefined();
    });
    it('rejects invalid edits and attachment indices', () => {
        const document = new InspectDocument(raw);
        expect(() => document.edit({ paintseed: undefined })).toThrow();
        expect(() => document.edit({ paintseed: -1 })).toThrow();
        for (const index of [-1, 1, 0.5, NaN]) expect(() => document.editAttachment('stickers', index, {})).toThrow(RangeError);
        expect(() => document.editAttachment('stickers', 0, { scale: Infinity })).toThrow();
    });
    it('rejects damaged framing, malformed wire data, and legacy links', () => {
        const url = new InspectDocument(raw).toUrl();
        const replacement = url.endsWith('00') ? '01' : '00';
        expect(() => decodeInspectDocument(url.slice(0, -2) + replacement)).toThrow(/Checksum/);
        expect(() => new InspectDocument(Uint8Array.of(0x18, 0x80))).toThrow();
        expect(() => decodeInspectDocument('S76561198000000000A123D456')).toThrow(/Steam/);
    });
});
