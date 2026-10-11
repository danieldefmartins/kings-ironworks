import { formatIn } from '../measure-parse';
import type { LaserReading } from './types';

// These protocols encode lengths in metres regardless of the display-unit flag.
// Sources and packet layouts: ./README.md. Never decode an angle/area as length.
export function metresReading(metres: number): LaserReading | null {
  return Number.isFinite(metres) && metres > 0 && metres <= 1000 ? { inches: metres / 0.0254 } : null;
}
export function parseDistoDistance(value: DataView): LaserReading | null {
  return value.byteLength === 4 ? metresReading(value.getFloat32(0, true)) : null;
}
export function parseDistoBasic(value: DataView): LaserReading | null {
  return value.byteLength === 20 ? metresReading(value.getFloat32(0, true)) : null;
}
export function boschCrc(bytes: Iterable<number>): number {
  let crc = 0xaa;
  for (const byte of bytes) for (let bit = 7; bit >= 0; bit--) {
    const feedback = (crc >> 7) ^ ((byte >> bit) & 1);
    crc = ((crc << 1) & 255) ^ (feedback ? 0xa6 : 0);
  }
  return crc;
}
export function boschCommand(command: number, payload: number[]): Uint8Array<ArrayBuffer> {
  const frame = [0xc0, command, payload.length, ...payload];
  return new Uint8Array([...frame, boschCrc(frame)]);
}
function validFrame(value: DataView, command: number, size: number): boolean {
  return value.byteLength === size + 4 && value.getUint8(0) === 0xc0 && value.getUint8(1) === command && value.getUint8(2) === size &&
    boschCrc(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)) === 0;
}
/** GLM50C ExchangeDataContainer (command 85), single-distance event only. */
export function parseBosch50(value: DataView): LaserReading | null {
  if (!validFrame(value, 0x55, 16)) return null;
  if ((value.getUint8(3) >> 2) !== 1 || (value.getUint8(4) & 3)) return null;
  const reading = metresReading(value.getFloat32(7, true));
  return reading && { ...reading, sequence: String(value.getUint16(5, true)) };
}
/** GLM100C command 80: the first value is the single distance (metres).
 * Display config bit 14 changes the device display, not the wire unit.
 * Ignore responses to sync setup, laser-on/status and non-distance modes.
 */
export function parseBosch100(value: DataView): LaserReading | null {
  if (!validFrame(value, 0x50, 33)) return null;
  if ((value.getUint8(3) & 31) !== 1 || (value.getUint8(3) >> 5) !== 0 || value.getUint8(31) !== 0) return null;
  const reading = metresReading(value.getFloat32(7, true));
  if (!reading) return null;
  const battery = value.getUint8(5);
  return { ...reading, ...(battery <= 100 ? { battery } : {}), sequence: `${value.getUint32(27, true)}:${value.getUint8(32)}` };
}
/** GLM100 GATT adds a sequence/countdown octet to each <=19-byte fragment. */
export class Bosch100Assembler {
  private bytes: number[] = [];
  private previous = -1;
  push(value: DataView): { ack?: Uint8Array<ArrayBuffer>; reading?: LaserReading } {
    if (value.byteLength < 2 || value.byteLength > 20 || value.getUint8(0) === 255) return {};
    const sequence = value.getUint8(0);
    const ack = new Uint8Array([255, sequence, 0]);
    // A retransmission needs another ACK, never another measurement.
    if (sequence === this.previous) return { ack };
    if (sequence !== this.previous - 1) this.bytes = [];
    this.previous = sequence;
    this.bytes.push(...new Uint8Array(value.buffer, value.byteOffset + 1, value.byteLength - 1));
    if (this.bytes.length > 304) this.bytes = [];
    if ((sequence & 15) !== 0) return { ack };
    const frame = new Uint8Array(this.bytes);
    this.bytes = [];
    const reading = parseBosch100(new DataView(frame.buffer));
    return { ack, ...(reading ? { reading } : {}) };
  }
}
export function formatLaserValue(inches: number, units: 'in' | 'ftin' = 'in'): string {
  const rounded = Math.round(inches * 16) / 16;
  if (units === 'in') return formatIn(rounded);
  const feet = Math.floor(rounded / 12);
  return `${feet}' ${formatIn(rounded - feet * 12)}`;
}
