import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { newMeasureData, normalizeMeasureData, type MeasureData } from '@/lib/shop/measure';
import { sheetReadiness } from '@/lib/shop/measure-checks';
import { DISTO_SERVICE, DISTO_DISTANCE } from '@/lib/shop/laser/adapters';
import type { LaserCharacteristic, LaserDevice, LaserGatt } from '@/lib/shop/laser/types';
import LaserControl, { LaserBrowserHint } from './LaserControl';
import NextMeasurement from './NextMeasurement';
function mockBluetooth() {
  const channel = new EventTarget() as LaserCharacteristic;
  channel.startNotifications = async () => channel;
  const device = new EventTarget() as LaserDevice; device.id = 'mock'; device.name = 'DISTO D2';
  const gatt: LaserGatt = { connected: false, connect: async () => { gatt.connected = true; return gatt; }, disconnect: () => { gatt.connected = false; }, getPrimaryService: async id => {
    if (id !== DISTO_SERVICE) throw new Error('unavailable');
    return { getCharacteristic: async key => { if (key !== DISTO_DISTANCE) throw new Error('unavailable'); return channel; } };
  } };
  device.gatt = gatt;
  Object.defineProperty(navigator, 'bluetooth', { configurable: true, value: { requestDevice: async () => device } });
  return (metres: number) => { const bytes = new ArrayBuffer(4); channel.value = new DataView(bytes); channel.value.setFloat32(0, metres, true); channel.dispatchEvent(new Event('characteristicvaluechanged')); };
}
function Harness({ units = 'in' }: { units?: 'in' | 'ftin' }) {
  const [data, update] = useState<MeasureData>(() => normalizeMeasureData(newMeasureData('straight', 2)));
  const [manual, setManual] = useState('');
  return <div data-measure-ui><LaserControl lang="en" units={units}/><input aria-label="Drawing name"/><input data-m="1" placeholder='0"' aria-label="Manual distance" value={manual} onChange={e => setManual(e.target.value)}/><input data-m="1" placeholder="°" aria-label="Angle"/>
    <NextMeasurement data={data} shape="straight" gaps={sheetReadiness(data, 'straight').fabGaps} lang="en" unitPlaceholder={'0"'} set={fn => update(old => { const next = structuredClone(old); fn(next); return next; })} gapLabel={g => g.key} onOpenGap={() => {}}/>
    <div data-testid="saved">{JSON.stringify(data)}</div></div>;
}
async function connect() { fireEvent.click(screen.getByRole('button', { name: /^Connect laser/ })); fireEvent.click(screen.getByRole('button', { name: /^Connect$/ })); await screen.findByText('Connected'); }
afterEach(() => { cleanup(); Object.defineProperty(navigator, 'bluetooth', { configurable: true, value: undefined }); localStorage.clear(); vi.restoreAllMocks(); });
describe('laser editor input', () => {
  it('hides the control without Web Bluetooth and keeps the iOS hint inside its menu component', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('iPhone Safari');
    render(<><LaserControl lang="en" units="in"/><LaserBrowserHint lang="en"/></>);
    expect(screen.queryByRole('button')).toBeNull(); expect(screen.getByText(/Bluefy/)).toBeTruthy();
  });
  it('writes the Next field, advances, preserves a readback, and accepts consecutive identical distances', async () => {
    const emit = mockBluetooth(); render(<Harness/>); await connect();
    act(() => emit(0.1905));
    expect(screen.getByRole('textbox', { name: 'Next: Step 1 · Run' })).toBeTruthy();
    expect(JSON.parse(screen.getByTestId('saved').textContent!).segments[0].steps[0].rise).toBe('7 1/2"');
    expect(screen.getByRole('status').textContent).toContain('7 1/2"');
    act(() => emit(0.1905));
    expect(screen.getByRole('textbox', { name: 'Next: Step 2 · Rise' })).toBeTruthy();
  });
  it('writes the focused field using sheet units without advancing the card', async () => {
    const emit = mockBluetooth(); render(<Harness units="ftin"/>); await connect();
    act(() => screen.getByLabelText('Manual distance').focus()); act(() => emit(1.016));
    await waitFor(() => expect((screen.getByLabelText('Manual distance') as HTMLInputElement).value).toBe('3\' 4"'));
    expect(screen.getByRole('textbox', { name: 'Next: Step 1 · Rise' })).toBeTruthy();
  });
  it('never diverts a reading into another field while an angle or drawing name is focused', async () => {
    const emit = mockBluetooth(); render(<Harness/>); await connect();
    for (const label of ['Angle', 'Drawing name']) { act(() => screen.getByLabelText(label).focus()); act(() => emit(1)); }
    expect(JSON.parse(screen.getByTestId('saved').textContent!).segments[0].steps[0].rise).toBe('');
    expect(screen.getByRole('status').textContent).toContain('Select a distance field');
  });
});
