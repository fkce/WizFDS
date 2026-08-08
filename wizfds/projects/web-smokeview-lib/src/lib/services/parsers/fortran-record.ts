/**
 * Fortran unformatted records, which is how every binary FDS result file is
 * written: a u32 length either side of each payload (ADR-0016).
 *
 * Shared by the format readers rather than copied into each, because the
 * machinery is the same wherever it is used and only the payloads differ.
 */

/** The record cursor: each step checks both markers and hands back the payload. */
export class RecordWalk {

    private at = 0;

    constructor(
        private readonly view: DataView,
        private readonly littleEndian: boolean,
        /** `.sf`, `.bf` - so a failure names the file the user clicked on. */
        private readonly format: string
    ) { }

    /** The next record, which must be whole and `expected` bytes long. */
    public demand(expected: number): DataView {
        const record = this.tryNext(expected);
        if (record === null) throw new Error(`${this.format} file ends inside its header`);
        return record;
    }

    /** The next record, or null when the bytes run out or the length differs. */
    public tryNext(expected: number): DataView | null {
        const total = this.view.byteLength;
        if (this.at + 8 + expected > total) return null;
        const length = this.view.getUint32(this.at, this.littleEndian);
        if (length !== expected) return null;
        const trailing = this.view.getUint32(this.at + 4 + expected, this.littleEndian);
        if (trailing !== length) return null;

        const payload = new DataView(this.view.buffer, this.view.byteOffset + this.at + 4, expected);
        this.at += 8 + expected;
        return payload;
    }
}

/**
 * Which way round the solver wrote its bytes, from the length of the first
 * record - which every FDS result file starts with and whose size we know.
 *
 * A 30-byte label read the wrong way round is 0x1E000000 rather than
 * 0x0000001E, which is how the right order is found and how bytes that are no
 * result file at all are refused.
 */
export function detectEndianness(view: DataView, firstRecordBytes: number, format: string): boolean {
    if (view.byteLength < 4) throw new Error(`not a ${format} file: shorter than one record marker`);
    if (view.getUint32(0, true) === firstRecordBytes) return true;
    if (view.getUint32(0, false) === firstRecordBytes) return false;
    throw new Error(`not a ${format} file: the first record is not a ${firstRecordBytes}-byte label`);
}

/** A fixed-width FDS label, without the spaces it was padded to. */
export function asciiOf(bytes: DataView): string {
    let text = '';
    for (let at = 0; at < bytes.byteLength; at++) text += String.fromCharCode(bytes.getUint8(at));
    return text.trim();
}
