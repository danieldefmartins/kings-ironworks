import { describe, expect, it } from 'vitest';
import { Bosch100Assembler, boschCommand, boschCrc, formatLaserValue, parseBosch50, parseBosch100, parseDistoBasic, parseDistoDistance } from './parsers';
import { parseMeas } from '../measure-parse';
const view = (bytes: number[]) => new DataView(new Uint8Array(bytes).buffer);
// Real GLM50C notification from the author's measurement log; see README.
const glm50 = [192, 85, 16, 6, 0, 97, 0, 162, 180, 151, 62, 0, 0, 0, 0, 0, 0, 0, 0, 172];
const frame50 = (mode: number, status = 0) => boschCommand(0x55, [mode << 2 | 2, status, 97, 0, 162, 180, 151, 62, 0, 0, 0, 0, 0, 0, 0, 0]);
// Real-format 33-byte Sync_Container_t: single distance, rear reference, 72% SOC,
// 20°C, 1.25 m, timestamp 1, laser off, list index 2 (Bosch table §4.2.2).
const sync = [1, 2, 72, 20, 0, 0, 160, 63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 2, 0, 0, 0];
const frame100 = (payload = sync) => boschCommand(0x50, payload);
const dv = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

describe('DISTO packets', () => {
  it('decodes a little-endian metres notification into inches', () => {
    expect(parseDistoDistance(view([0, 0, 160, 63]))?.inches).toBeCloseTo(49.2125984);
  });
  it('handles a DataView with a nonzero byte offset', () => {
    const bytes = new Uint8Array([99, 0, 0, 160, 63, 99]);
    expect(parseDistoDistance(new DataView(bytes.buffer, 1, 4))?.inches).toBeCloseTo(49.2125984);
  });
  it.each([[0, 0], [0, 0, 0, 0], [0, 0, 128, 191], [0, 0, 128, 127], [0, 0, 192, 127], [0, 0, 128, 63, 1]])('rejects malformed/error value %j', (...bytes) => {
    expect(parseDistoDistance(view(bytes))).toBeNull();
  });
  it('supports the 20-byte basic channel without interpreting inclination as distance', () => {
    expect(parseDistoBasic(view([0, 0, 160, 63, ...Array(16).fill(0)]))?.inches).toBeCloseTo(49.2125984);
    expect(parseDistoBasic(view([0, 0, 160, 63]))).toBeNull();
  });
});
describe('Bosch GLM50C', () => {
  it('decodes a captured 0.2963m single-distance event', () => {
    expect(parseBosch50(view(glm50))).toEqual({ inches: expect.closeTo(0.2963 / 0.0254, 4), sequence: '97' });
  });
  it('keeps wire metres when the device display config is imperial', () => {
    expect(parseBosch50(dv(frame50(1, 8)))?.inches).toBeCloseTo(0.2963 / 0.0254, 4);
  });
  it.each([0, 2, 3, 4, 7, 8, 9, 59, 63])('rejects mode %i (including continuous, angle, area, status, errors)', mode => {
    expect(parseBosch50(dv(frame50(mode)))).toBeNull();
  });
  it('ignores laser-on, temperature errors, acknowledgments and corrupt/truncated frames', () => {
    expect(parseBosch50(dv(frame50(1, 1)))).toBeNull();
    expect(parseBosch50(dv(frame50(1, 2)))).toBeNull();
    expect(parseBosch50(view([0, 0, 130]))).toBeNull();
    expect(parseBosch50(view(glm50.slice(0, 19)))).toBeNull();
    const bad = [...glm50]; bad[8] ^= 1;
    expect(parseBosch50(view(bad))).toBeNull();
  });
  it('encodes the documented autosync command with CRC', () => {
    expect([...boschCommand(0x55, [1, 0])]).toEqual([192, 85, 2, 1, 0, 26]);
    expect(boschCrc(glm50)).toBe(0);
  });
});
describe('Bosch GLM100C', () => {
  it('decodes single-distance, battery and identity from a complete sync frame', () => {
    expect(parseBosch100(dv(frame100()))).toEqual({ inches: expect.closeTo(1.25 / 0.0254), battery: 72, sequence: '1:2' });
    const imperial = [...sync]; imperial[1] |= 64;
    expect(parseBosch100(dv(frame100(imperial)))?.inches).toBeCloseTo(1.25 / 0.0254);
  });
  it('rejects non-distance, laser-on, error and calculation events', () => {
    for (const [offset, value] of [[0, 2], [0, 6], [0, 33], [28, 1], [28, 8]]) {
      const payload = [...sync]; payload[offset] = value;
      expect(parseBosch100(dv(frame100(payload)))).toBeNull();
    }
  });
  it('assembles countdown fragments, ACKs each and suppresses retransmissions', () => {
    const assembler = new Bosch100Assembler(), frame = frame100();
    const first = view([0x11, ...frame.slice(0, 19)]), last = view([0x10, ...frame.slice(19)]);
    expect(assembler.push(first)).toEqual({ ack: new Uint8Array([255, 17, 0]) });
    expect(assembler.push(first).reading).toBeUndefined();
    expect(assembler.push(last).reading?.inches).toBeCloseTo(1.25 / 0.0254);
    expect(assembler.push(last).reading).toBeUndefined();
    expect(assembler.push(view([255, 16, 0]))).toEqual({});
  });
  it('drops missing/out-of-order/corrupt fragments', () => {
    const frame = frame100(), assembler = new Bosch100Assembler();
    expect(assembler.push(view([0x10, ...frame.slice(19)])).reading).toBeUndefined();
    assembler.push(view([0x21, ...frame.slice(0, 19)]));
    expect(assembler.push(view([0x30, ...frame.slice(19)])).reading).toBeUndefined();
  });
});
describe('sheet units', () => {
  it.each([[41.77, '41 3/4"', '3\' 5 3/4"'], [11.99, '12"', '1\' 0"'], [0.0625, '1/16"', '0\' 1/16"']])('rounds %f inches to 1/16 without 12-inch remainders', (inches, inchText, feetText) => {
    expect(formatLaserValue(inches, 'in')).toBe(inchText);
    expect(formatLaserValue(inches, 'ftin')).toBe(feetText);
    expect(parseMeas(feetText)).toBe(Math.round(inches * 16) / 16);
  });
});
