import { EconItem } from './types';
import { ProtobufWriter } from './protobuf-writer';
import snapshot from './item-data.json';
import { isUint32, isInt32, isUint64, isFloat32 } from './utils/numbers';

export interface ItemDiagnostic {
    code: string;
    path: string;
    message: string;
    severity: 'error' | 'warning';
}
export interface ItemValidation {
    valid: boolean;
    diagnostics: ItemDiagnostic[];
    snapshot: string;
}
export const ITEM_DATA_VERSION = snapshot.commit;

/** Wire representability only; no game catalog or cosmetic constraints. */
export function validateWireItem(item: EconItem): ItemValidation {
    const diagnostics: ItemDiagnostic[] = [];
    const invalid = (path: string, message: string) => diagnostics.push({ code: 'WIRE_ENCODING', path, message, severity: 'error' });
    if (!item || typeof item !== 'object') invalid('', 'Item must be an object');
    else {
        for (const key of ['defindex','paintindex','paintseed','accountid','rarity','quality','killeaterscoretype','killeatervalue','inventory','origin','questid','dropreason','musicindex','petindex','style','upgrade_level','pet_food_expiration_date'] as const) {
            if ((item[key] !== undefined || ['defindex','paintindex','paintseed'].includes(key)) && !isUint32(item[key])) invalid(key, 'Expected uint32');
        }
        if (!isFloat32(item.paintwear)) invalid('paintwear', 'Expected finite float32');
        if (item.itemid !== undefined && !isUint64(item.itemid)) invalid('itemid', 'Expected uint64 bigint or safe integer');
        if (item.entindex !== undefined && !isInt32(item.entindex)) invalid('entindex', 'Expected int32');
        if (item.customname !== undefined && typeof item.customname !== 'string') invalid('customname', 'Expected string');
        if (item.customnames !== undefined && (!Array.isArray(item.customnames) || item.customnames.some(name => typeof name !== 'string'))) invalid('customnames', 'Expected string array');
        if (item.blobdata !== undefined && !(item.blobdata instanceof Uint8Array)) invalid('blobdata', 'Expected Uint8Array');
        for (const collection of ['stickers','keychains','variations'] as const) {
            const attachments = item[collection];
            if (attachments === undefined) continue;
            if (!Array.isArray(attachments)) { invalid(collection, 'Expected attachment array'); continue; }
            attachments.forEach((attachment,index) => {
                if (!attachment || typeof attachment !== 'object') { invalid(`${collection}.${index}`, 'Expected attachment'); return; }
                for (const key of ['slot','sticker_id','tint_id','pattern','highlight_reel','wrapped_sticker'] as const) {
                    if ((attachment[key] !== undefined || ['slot','sticker_id'].includes(key)) && !isUint32(attachment[key])) invalid(`${collection}.${index}.${key}`, 'Expected uint32');
                }
                for (const key of ['wear','scale','rotation','offset_x','offset_y','offset_z'] as const) {
                    if (attachment[key] !== undefined && !isFloat32(attachment[key])) invalid(`${collection}.${index}.${key}`, 'Expected finite float32');
                }
            });
        }
    }
    if (!diagnostics.length) {
        try {
            const encoded = ProtobufWriter.encodeItemData(item, { validateInput: false, maxCustomNameLength: 10 * 1024 * 1024 });
            if (encoded.length > 10 * 1024 * 1024) invalid('', 'Encoded message exceeds the 10 MiB resource limit');
        }
        catch (error) { diagnostics.push({ code: 'WIRE_ENCODING', path: '', message: (error as Error).message, severity: 'error' }); }
    }
    return { valid: !diagnostics.length, diagnostics, snapshot: ITEM_DATA_VERSION };
}

/** Strict rejects unknown catalog entries; permissive reports them as warnings. */
export function validateItemData(item: EconItem, options: { mode?: 'strict' | 'permissive' } = {}): ItemValidation {
    const result = validateWireItem(item);
    if (!result.valid) return result;
    const add = (code: string, path: string, message: string, unknown = false) => result.diagnostics.push({
        code, path, message, severity: unknown && options.mode === 'permissive' ? 'warning' : 'error'
    });
    const paints: Record<string, Array<number | null>> = snapshot.paints;
    const range = paints[`${item.defindex}:${item.paintindex}`];
    if (!snapshot.weapons.includes(item.defindex) && !Object.keys(paints).some(key => key.startsWith(`${item.defindex}:`))) add('UNKNOWN_WEAPON', 'defindex', 'Weapon is absent from the snapshot', true);
    else if (item.paintindex !== 0 && !range) {
        const knownPaint = Object.keys(paints).some(key => key.endsWith(`:${item.paintindex}`));
        add(knownPaint ? 'INCOMPATIBLE_PAINT' : 'UNKNOWN_PAINT', 'paintindex', 'Paint is not listed for this weapon', !knownPaint);
    }
    const [min, max] = range ?? [0, 1];
    if (min == null || max == null) add('UNKNOWN_WEAR_RANGE', 'paintwear', 'Snapshot does not specify a wear range', true);
    else if (Math.fround(item.paintwear) < Math.fround(min) || Math.fround(item.paintwear) > Math.fround(max)) {
        add('WEAR_RANGE', 'paintwear', `Wear must be within [${min}, ${max}]`);
    }
    result.valid = !result.diagnostics.some(d => d.severity === 'error');
    return result;
}

export interface ItemDifference {
    path: string;
    before: unknown;
    after: unknown;
    beforePresent: boolean;
    afterPresent: boolean;
}
const floats = new Set(['paintwear', 'wear', 'scale', 'rotation', 'offset_x', 'offset_y', 'offset_z']);
/** Ordered arrays are significant. Absent, zero, empty and negative zero remain distinct. */
export function compareItems(before: Partial<EconItem>, after: Partial<EconItem>): ItemDifference[] {
    const changes: ItemDifference[] = [];
    const visit = (a: unknown, b: unknown, path: string, ap: boolean, bp: boolean): void => {
        const key = path.split('.').pop()!;
        if (ap === bp && (floats.has(key) && typeof a === 'number' && typeof b === 'number'
            ? Object.is(Math.fround(a), Math.fround(b)) : Object.is(a, b))) return;
        if (ap && bp && a !== null && b !== null && typeof a === 'object' && typeof b === 'object'
            && Array.isArray(a) === Array.isArray(b) && (a instanceof Uint8Array) === (b instanceof Uint8Array)) {
            const left = a as Record<string, unknown>, right = b as Record<string, unknown>;
            const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
            if (!keys.size) { if (Object.getPrototypeOf(a) === Object.getPrototypeOf(b)) return; }
            else { for (const child of keys) visit(left[child], right[child], path ? `${path}.${child}` : child,
                Object.prototype.hasOwnProperty.call(left, child), Object.prototype.hasOwnProperty.call(right, child)); return; }
        }
        // uint64 numbers and bigints with equal exact integer values are semantic equals.
        if (key === 'itemid' && ap && bp && (typeof a === 'bigint' || Number.isSafeInteger(a))
            && (typeof b === 'bigint' || Number.isSafeInteger(b)) && BigInt(a as number | bigint) === BigInt(b as number | bigint)) return;
        changes.push({ path, before: a, after: b, beforePresent: ap, afterPresent: bp });
    };
    visit(before, after, '', true, true);
    return changes;
}
