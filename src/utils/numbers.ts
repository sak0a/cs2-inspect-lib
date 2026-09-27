/** Protobuf bounds, checked before conversion can truncate or lose precision. */
export function isUint32(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 0xFFFFFFFF;
}

export function isInt32(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= -0x80000000 && value <= 0x7FFFFFFF;
}

export function isUint64(value: unknown): value is number | bigint {
    return typeof value === 'bigint'
        ? value >= 0n && value <= 0xFFFFFFFFFFFFFFFFn
        : typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function isFloat32(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && Number.isFinite(Math.fround(value));
}
