export function normalizeSerialNumber(value: unknown): string | null {
    if (!value) return null;

    const serial = String(value)
        .replace(/\r/g, "")
        .replace(/\n/g, "")
        .trim()
        .toUpperCase();

    return serial.length > 0 ? serial : null;
}