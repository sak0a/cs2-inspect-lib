import corpus from '../fixtures/inspect-corpus.json';
import { ProtobufReader, decodeInspectDocument } from '../src/core';
const link = (token: string) => `steam://rungame/730/0/+csgo_econ_action_preview%20${token}`;
const bytes = (hex: string) => Uint8Array.from(Buffer.from(hex, 'hex'));
function expected(item: Record<string, unknown>) {
    const result = { ...item, itemid: BigInt(item.itemid as string), ...('blobdata' in item ? { blobdata: bytes(item.blobdata as string) } : {}) };
    if (Array.isArray(item.customnames) && !item.customnames.length) delete (result as Record<string, unknown>).customnames;
    return result;
}
// This JSON and its Python generator are identical in node-cs2. Expected float32
// values, wire bytes and checksums were computed outside both implementations.
describe('shared independently encoded corpus', () => {
    test.each(corpus.valid)('$name decodes raw bytes and strict URL framing', fixture => {
        const raw = ProtobufReader.decodeItemData(bytes(fixture.protobufHex), { validateInput: false });
        const document = decodeInspectDocument(link(fixture.token));
        expect(raw).toMatchObject(expected(fixture.expected));
        expect(document.item).toEqual(raw);
        expect(document.toProtobuf()).toEqual(bytes(fixture.protobufHex));
        if (fixture.expected.customnames?.length) expect(raw.customname).toBe(fixture.expected.customnames[fixture.expected.customnames.length - 1]);
    });
    test.each(corpus.malformed)('rejects $name even with a correct checksum', fixture => {
        expect(() => ProtobufReader.decodeItemData(bytes(fixture.protobufHex), { validateInput: false })).toThrow();
        expect(() => decodeInspectDocument(link(fixture.token))).toThrow();
    });
    test('rejects checksum corruption in every seeded item', () => {
        for (const fixture of corpus.valid) {
            const corrupted = fixture.token.slice(0, -2) + (fixture.token.slice(-2) === '00' ? '01' : '00');
            expect(() => decodeInspectDocument(link(corrupted))).toThrow(/checksum/i);
        }
    });
    test('keeps opaque bytes, repeated names and unknown nested wire segments across edits', () => {
        const fixture = corpus.valid.find(f => f.name === 'all-fields-unknown')!;
        const original = decodeInspectDocument(link(fixture.token));
        const edited = original.edit({ paintseed: 123, customnames: ['', '日本語🔥', ''] })
            .editAttachment('stickers', 0, { rotation: 45 })
            .editAttachment('keychains', 0, { pattern: 42 });
        const hex = Buffer.from(edited.toProtobuf()).toString('hex');
        expect(hex).toContain(corpus.unknownSegments.top);
        expect(hex.split(corpus.unknownSegments.nested)).toHaveLength(4);
        expect(edited.item.blobdata).toEqual(original.item.blobdata);
        expect(edited.item.customnames).toEqual(['', '日本語🔥', '']);
        expect(edited.item.stickers![0].rotation).toBe(45);
        expect(edited.item.keychains![0].pattern).toBe(42);
        expect(original.toProtobuf()).toEqual(bytes(fixture.protobufHex));
        expect(decodeInspectDocument(edited.toUrl()).item).toEqual(edited.item);
    });
});
