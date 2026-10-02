import { EconItem, Sticker } from './types';
import { ProtobufReader } from './protobuf-reader';
import { ProtobufWriter } from './protobuf-writer';
import { analyzeInspectUrl } from './url-analyzer';
import { INSPECT_BASE } from './utils/url-parser';
import { DecodingError } from './errors';

const itemFields = ['','accountid','itemid','defindex','paintindex','rarity','quality','paintwear','paintseed','killeaterscoretype','killeatervalue','customnames','stickers','inventory','origin','questid','dropreason','musicindex','entindex','petindex','keychains','style','variations','upgrade_level','pet_food_expiration_date','blobdata'];
const stickerFields = ['','slot','sticker_id','wear','scale','rotation','tint_id','offset_x','offset_y','offset_z','pattern','highlight_reel','wrapped_sticker'];
interface Segment { field: number; bytes: Uint8Array }
function split(bytes: Uint8Array): Segment[] {
    if (!bytes.length) return [];
    const reader = new ProtobufReader(bytes, { validateInput: false });
    const result: Segment[] = [];
    while (reader.hasMore()) {
        const start = reader.getPosition(); const [field, wire] = reader.readTag(); reader.skipField(wire);
        result.push({ field, bytes: bytes.slice(start, reader.getPosition()) });
    }
    return result;
}
const join = (segments: Segment[]): Uint8Array => {
    const output = new Uint8Array(segments.reduce((n,s) => n + s.bytes.length, 0));
    let offset = 0; for (const s of segments) { output.set(s.bytes,offset); offset += s.bytes.length; }
    return output;
};
function replace(original: Uint8Array, encoded: Uint8Array, fields: Set<number>): Uint8Array {
    return join([...split(original).filter(s => !fields.has(s.field)), ...split(encoded).filter(s => fields.has(s.field))]);
}
/** Strict embedded framing: requires a mask byte and verifies checksum, including mask=0. */
export function unwrapInspectToken(hex: string): Uint8Array {
    if (!/^(?:[0-9a-f]{2}){6,}$/i.test(hex) || hex.length > 20 * 1024 * 1024) throw new DecodingError('Invalid embedded token');
    const token = Uint8Array.from(hex.match(/../g)!, b => parseInt(b,16));
    const mask = token[0]; const raw = token.map((b,i) => i === 0 ? b : b ^ mask);
    const end = raw.length - 4; const crc = ProtobufWriter.crc32(raw.subarray(0,end));
    if ((((crc & 65535) ^ ((end - 1) * crc)) >>> 0) !== new DataView(raw.buffer).getUint32(end,false)) throw new DecodingError('Checksum mismatch');
    return raw.slice(1,end);
}
function wrap(bytes: Uint8Array): string {
    const raw = new Uint8Array(bytes.length+5); raw.set(bytes,1);
    const crc = ProtobufWriter.crc32(raw.subarray(0,raw.length-4));
    new DataView(raw.buffer).setUint32(raw.length-4,(crc & 65535) ^ (bytes.length * crc),false);
    return INSPECT_BASE + Array.from(raw,b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
}
export type ItemEdit = Partial<Omit<EconItem, 'stickers' | 'keychains' | 'variations'>>;
export type AttachmentCollection = 'stickers' | 'keychains' | 'variations';

/** Immutable wire document. Unedited segments remain byte-for-byte intact. */
export class InspectDocument {
    private readonly raw: Uint8Array;
    constructor(bytes: Uint8Array) {
        this.raw = bytes.slice();
        ProtobufReader.decodeItemData(this.raw, { validateInput: false });
    }
    get item(): EconItem { return ProtobufReader.decodeItemData(this.raw, { validateInput: false }); }
    toProtobuf(): Uint8Array { return this.raw.slice(); }
    toUrl(): string { return wrap(this.raw); }
    edit(patch: ItemEdit): InspectDocument {
        const normalized = { ...patch };
        if ('customnames' in patch && patch.customnames === undefined) normalized.customnames = [];
        if ('customname' in patch && !('customnames' in patch)) normalized.customnames = patch.customname === undefined ? [] : [patch.customname];
        const fields = new Set<number>();
        for (const key of Object.keys(normalized)) {
            if (key === 'customname') continue;
            const field = itemFields.indexOf(key);
            if (field < 1 || [12,20,22].includes(field)) throw new TypeError(`Use editAttachment for attachment edits; unsupported field: ${key}`);
            fields.add(field);
        }
        const merged = { ...this.item, ...normalized };
        // Required legacy model fields cannot be deleted.
        for (const key of ['defindex','paintindex','paintwear','paintseed'] as const) if (merged[key] === undefined) throw new TypeError(`Cannot delete ${key}`);
        return new InspectDocument(replace(this.raw, ProtobufWriter.encodeItemData(merged,{validateInput:false}),fields));
    }
    /** Patch one existing attachment by wire occurrence, preserving its unknown nested fields. */
    editAttachment(collection: AttachmentCollection, index: number, patch: Partial<Sticker>): InspectDocument {
        const field = itemFields.indexOf(collection); const segments = split(this.raw);
        const matches = segments.filter(s=>s.field===field);
        if (!Number.isInteger(index) || index < 0 || index >= matches.length) throw new RangeError('Attachment index out of range');
        const target = matches[index]; const reader = new ProtobufReader(target.bytes,{validateInput:false}); reader.readTag(); const nested = reader.readBytes();
        const original = ProtobufReader.decodeSticker(new ProtobufReader(nested,{validateInput:false}));
        const fields = new Set(Object.keys(patch).map(key => { const id=stickerFields.indexOf(key); if(id<1) throw new TypeError(`Unknown attachment property: ${key}`); return id; }));
        const edited = replace(nested, ProtobufWriter.encodeSticker({...original,...patch},{validateInput:false}),fields);
        const writer = new ProtobufWriter(); writer.writeTag(field,2); writer.writeLengthDelimited(edited);
        target.bytes = writer.getBytes();
        return new InspectDocument(join(segments));
    }
}
export function decodeInspectDocument(url: string): InspectDocument {
    const analyzed = analyzeInspectUrl(url,{validateInput:false});
    if (!analyzed.hex_data) throw new DecodingError('Legacy links require Steam and contain no editable protobuf');
    return new InspectDocument(unwrapInspectToken(analyzed.hex_data));
}
