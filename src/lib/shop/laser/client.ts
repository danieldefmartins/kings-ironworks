import { BATTERY_LEVEL, BATTERY_SERVICE, laserAdapters } from './adapters';
import type { LaserAdapter, LaserBluetooth, LaserCharacteristic, LaserDevice, LaserReading, LaserService } from './types';

export type LaserState = { status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting'; name?: string; battery?: number };
export const LAST_LASER_KEY = 'kiw:last-laser:v1';
export type RememberedLaser = { id: string; name: string };
export function lastLaser(): RememberedLaser | null {
  try {
    const data = JSON.parse(localStorage.getItem(LAST_LASER_KEY) || 'null');
    return typeof data?.id === 'string' && typeof data?.name === 'string' ? data : null;
  } catch { return null; }
}

/** A sheet owns this connection. Cleanup cancels retries and removes listeners. */
export class LaserClient {
  private device?: LaserDevice;
  private remembered?: LaserDevice;
  private epoch = 0;
  private cleanup: (() => void)[] = [];
  private retry?: ReturnType<typeof setTimeout>;
  private attempts = 0;
  private lastSequence?: string;
  private state: LaserState = { status: 'disconnected' };
  constructor(
    private bluetooth: LaserBluetooth,
    private onState: (state: LaserState) => void,
    private onReading: (reading: LaserReading) => void,
    private onDisconnect: () => void,
    private adapters: readonly LaserAdapter[] = laserAdapters,
  ) {}
  async restore(): Promise<void> {
    const saved = lastLaser();
    const epoch = this.epoch;
    if (!saved || !this.bluetooth.getDevices) return;
    try {
      const devices = await this.bluetooth.getDevices();
      if (epoch === this.epoch) this.remembered = devices.find(d => d.id === saved.id);
    } catch { /* Permission retrieval is optional, including in Bluefy. */ }
  }
  private update(state: LaserState) { this.state = state; this.onState(state); }
  async connect(chooseNew = false): Promise<void> {
    this.disconnect();
    const epoch = this.epoch;
    this.update({ status: 'connecting', name: chooseNew ? undefined : lastLaser()?.name });
    try {
      // Call requestDevice directly in the click gesture; no awaited lookup first.
      const device = !chooseNew && this.remembered ? this.remembered : await this.bluetooth.requestDevice({
        filters: [...this.adapters.map(a => ({ services: [a.service] })), ...['DISTO', 'Leica', 'Bosch', 'BOSCH', 'GLM'].map(namePrefix => ({ namePrefix }))],
        optionalServices: [...this.adapters.map(a => a.service), BATTERY_SERVICE],
      });
      if (epoch !== this.epoch) return;
      this.device = device;
      this.remembered = device;
      device.addEventListener('gattserverdisconnected', this.disconnected);
      await this.open(epoch, false);
    } catch (error) {
      if (epoch !== this.epoch) return;
      this.disconnect();
      throw error;
    }
  }
  private async open(epoch: number, reconnecting: boolean): Promise<void> {
    const device = this.device;
    if (!device?.gatt) throw new Error('Bluetooth GATT unavailable');
    const alive = () => epoch === this.epoch && this.device === device;
    const check = () => { if (!alive()) throw new DOMException('Cancelled', 'AbortError'); };
    this.update({ status: reconnecting ? 'reconnecting' : 'connecting', name: device.name });
    const server = await device.gatt.connect();
    if (!alive()) { if (this.device !== device) server.disconnect(); return; }
    let selected: { adapter: LaserAdapter; service: LaserService } | undefined;
    for (const adapter of this.adapters) {
      check();
      try { selected = { adapter, service: await server.getPrimaryService(adapter.service) }; break; }
      catch { check(); }
    }
    if (!selected) throw new Error('Unsupported laser service');
    check();
    let writes = Promise.resolve();
    const subscribe = async (uuid: string, receive: (value: DataView) => void, service = selected!.service) => {
      check();
      const channel = await service.getCharacteristic(uuid);
      check();
      const listener = () => { if (alive() && channel.value) receive(channel.value); };
      channel.addEventListener('characteristicvaluechanged', listener);
      this.cleanup.push(() => { channel.removeEventListener('characteristicvaluechanged', listener); });
      await channel.startNotifications();
      check();
      return channel;
    };
    await selected.adapter.start({ service: selected.service, subscribe, write: (channel: LaserCharacteristic, value) => {
      const next = writes.then(async () => { check(); await channel.writeValueWithResponse(value); });
      writes = next.catch(() => {});
      return next;
    } }, reading => {
      // Ignore cached setup responses and repeated Bosch events for the same shot.
      if (!alive() || this.state.status !== 'connected') return;
      if (reading.sequence !== undefined && reading.sequence === this.lastSequence) return;
      this.lastSequence = reading.sequence;
      if (reading.battery !== undefined) this.update({ ...this.state, battery: reading.battery });
      this.onReading(reading);
    });
    check();
    this.attempts = 0;
    this.update({ status: 'connected', name: device.name || selected.adapter.id });
    try { localStorage.setItem(LAST_LASER_KEY, JSON.stringify({ id: device.id, name: device.name || selected.adapter.id })); } catch { /* Private mode. */ }
    // Optional standard battery service. Absence must not prevent measuring.
    try {
      const batteryService = await server.getPrimaryService(BATTERY_SERVICE);
      check();
      const battery = await batteryService.getCharacteristic(BATTERY_LEVEL);
      check();
      const report = (value: DataView) => {
        if (alive() && value.byteLength === 1 && value.getUint8(0) <= 100) this.update({ ...this.state, battery: value.getUint8(0) });
      };
      if (battery.properties?.read !== false) report(await battery.readValue());
      if (battery.properties?.notify || battery.properties?.indicate) await subscribe(BATTERY_LEVEL, report, batteryService);
    } catch { /* Not all meters publish a battery percentage. */ }
  }
  private clearListeners() { this.cleanup.splice(0).forEach(fn => fn()); }
  private disconnected = () => {
    if (!this.device) return;
    ++this.epoch;
    this.clearListeners();
    if (this.retry) clearTimeout(this.retry);
    this.onDisconnect();
    this.scheduleReconnect();
  };
  private scheduleReconnect() {
    if (this.attempts >= 3) { this.update({ status: 'disconnected', name: this.device?.name }); return; }
    this.update({ status: 'reconnecting', name: this.device?.name });
    const epoch = this.epoch;
    this.retry = setTimeout(() => {
      if (epoch !== this.epoch) return;
      void this.open(epoch, true).catch(() => {
        if (epoch !== this.epoch) return;
        this.clearListeners();
        this.scheduleReconnect();
      });
    }, 1000 * 2 ** this.attempts++);
  }
  disconnect(): void {
    ++this.epoch;
    if (this.retry) clearTimeout(this.retry);
    this.retry = undefined;
    this.clearListeners();
    const device = this.device;
    this.device = undefined;
    device?.removeEventListener('gattserverdisconnected', this.disconnected);
    device?.gatt?.disconnect();
    this.attempts = 0;
    this.lastSequence = undefined;
    this.update({ status: 'disconnected', name: device?.name });
  }
}
