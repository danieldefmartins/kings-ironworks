import { afterEach, describe, expect, it, vi } from 'vitest';
import { LaserClient, LAST_LASER_KEY } from './client';
import { DISTO_SERVICE, DISTO_DISTANCE, BATTERY_SERVICE, BATTERY_LEVEL, BOSCH50_SERVICE, BOSCH50_DISTANCE } from './adapters';
import type { LaserDevice, LaserCharacteristic, LaserGatt } from './types';
class Channel extends EventTarget implements LaserCharacteristic {
  value?: DataView;
  properties = { read: true, notify: true };
  startNotifications = vi.fn(async () => this);
  stopNotifications = vi.fn(async () => this);
  readValue = vi.fn(async () => new DataView(new Uint8Array([84]).buffer));
  writeValueWithResponse = vi.fn(async () => {});
  emit(bytes: number[]) { this.value = new DataView(new Uint8Array(bytes).buffer); this.dispatchEvent(new Event('characteristicvaluechanged')); }
}
function fixture(bosch = false) {
  const channel = new Channel(), battery = new Channel();
  const device = new EventTarget() as LaserDevice;
  device.id = 'test-disto'; device.name = bosch ? 'Bosch GLM 50 C' : 'DISTO D2';
  const gatt: LaserGatt = {
    connected: false,
    connect: vi.fn(async () => { gatt.connected = true; return gatt; }),
    disconnect: vi.fn(() => { if (!gatt.connected) return; gatt.connected = false; device.dispatchEvent(new Event('gattserverdisconnected')); }),
    getPrimaryService: vi.fn(async uuid => {
      if (uuid === (bosch ? BOSCH50_SERVICE : DISTO_SERVICE)) return { getCharacteristic: async (key: string) => {
        if (key === (bosch ? BOSCH50_DISTANCE : DISTO_DISTANCE)) return channel;
        throw new Error('not found');
      } };
      if (uuid === BATTERY_SERVICE) return { getCharacteristic: async (key: string) => { expect(key).toBe(BATTERY_LEVEL); return battery; } };
      throw new Error('not found');
    }),
  };
  device.gatt = gatt;
  const bluetooth = { requestDevice: vi.fn(async () => device), getDevices: vi.fn(async () => [device]) };
  const state = vi.fn(), reading = vi.fn(), disconnect = vi.fn();
  const client = new LaserClient(bluetooth, state, reading, disconnect);
  return { channel, battery, device, gatt, bluetooth, state, reading, disconnect, client };
}
afterEach(() => { vi.useRealTimers(); localStorage.clear(); });
describe('laser connection lifecycle', () => {
  it('connects, remembers the device, reports optional battery and consumes fresh readings only', async () => {
    const f = fixture(); await f.client.connect();
    expect(f.state).toHaveBeenLastCalledWith({ status: 'connected', name: 'DISTO D2', battery: 84 });
    expect(JSON.parse(localStorage.getItem(LAST_LASER_KEY)!)).toEqual({ id: 'test-disto', name: 'DISTO D2' });
    expect(f.channel.readValue).not.toHaveBeenCalled();
    f.channel.emit([0, 0, 160, 63]);
    expect(f.reading).toHaveBeenCalledOnce();
    f.battery.emit([75]);
    expect(f.state).toHaveBeenLastCalledWith({ status: 'connected', name: 'DISTO D2', battery: 75 });
    f.client.disconnect();
    f.channel.emit([0, 0, 160, 63]);
    expect(f.reading).toHaveBeenCalledOnce();
    expect(f.disconnect).not.toHaveBeenCalled();
  });
  it('automatically reconnects and re-subscribes once after a link drop', async () => {
    vi.useFakeTimers(); const f = fixture(); await f.client.connect();
    f.gatt.disconnect(); expect(f.disconnect).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1000);
    expect(f.gatt.connect).toHaveBeenCalledTimes(2);
    f.channel.emit([0, 0, 160, 63]); expect(f.reading).toHaveBeenCalledOnce();
    f.client.disconnect(); await vi.runAllTimersAsync(); expect(f.gatt.connect).toHaveBeenCalledTimes(2);
  });
  it('bounds retries and cancels a pending reconnect on manual disconnect', async () => {
    vi.useFakeTimers(); const f = fixture(); await f.client.connect();
    vi.mocked(f.gatt.connect).mockRejectedValue(new Error('out of range'));
    f.gatt.disconnect(); await vi.runAllTimersAsync();
    expect(f.gatt.connect).toHaveBeenCalledTimes(4);
    expect(f.state).toHaveBeenLastCalledWith({ status: 'disconnected', name: 'DISTO D2' });
    f.client.disconnect(); await vi.runAllTimersAsync();
  });
  it('restores permission without opening a picker, but allows selecting another meter', async () => {
    localStorage.setItem(LAST_LASER_KEY, JSON.stringify({ id: 'test-disto', name: 'DISTO D2' }));
    const f = fixture(); await f.client.restore(); await f.client.connect();
    expect(f.bluetooth.requestDevice).not.toHaveBeenCalled();
    await f.client.connect(true); expect(f.bluetooth.requestDevice).toHaveBeenCalledOnce();
    f.client.disconnect();
  });
  it('cleans up an unsupported device or failed subscription', async () => {
    const f = fixture(); f.channel.startNotifications.mockRejectedValue(new Error('denied'));
    await expect(f.client.connect()).rejects.toThrow('denied');
    expect(f.gatt.connected).toBe(false); expect(f.disconnect).not.toHaveBeenCalled();
    f.channel.emit([0, 0, 160, 63]); expect(f.reading).not.toHaveBeenCalled();
  });
  it('cancels a pending picker safely on unmount', async () => {
    const f = fixture(); let finish!: (device: LaserDevice) => void;
    f.bluetooth.requestDevice.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const pending = f.client.connect(); f.client.disconnect(); finish(f.device); await pending;
    expect(f.gatt.connect).not.toHaveBeenCalled();
  });
  it('does not reapply Bosch status updates for the same unique measurement id', async () => {
    const f = fixture(true); await f.client.connect();
    const bytes = [192, 85, 16, 6, 0, 97, 0, 162, 180, 151, 62, 0, 0, 0, 0, 0, 0, 0, 0, 172];
    f.channel.emit(bytes); f.channel.emit(bytes);
    expect(f.channel.writeValueWithResponse).toHaveBeenCalledWith(new Uint8Array([192, 85, 2, 1, 0, 26]));
    expect(f.reading).toHaveBeenCalledOnce(); f.client.disconnect();
  });
});
