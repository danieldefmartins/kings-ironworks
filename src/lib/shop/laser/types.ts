/** Minimal structural Web Bluetooth types: unsupported browsers need no polyfill. */
export interface LaserCharacteristic extends EventTarget {
  value?: DataView;
  properties?: { notify?: boolean; indicate?: boolean; read?: boolean };
  startNotifications(): Promise<LaserCharacteristic>;
  stopNotifications(): Promise<LaserCharacteristic>;
  readValue(): Promise<DataView>;
  writeValueWithResponse(value: Uint8Array<ArrayBuffer>): Promise<void>;
}
export interface LaserService { getCharacteristic(uuid: string): Promise<LaserCharacteristic> }
export interface LaserGatt {
  connected: boolean;
  connect(): Promise<LaserGatt>;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<LaserService>;
}
export interface LaserDevice extends EventTarget { id: string; name?: string; gatt?: LaserGatt }
export interface LaserBluetooth {
  requestDevice(options: { filters: ({ services: string[] } | { namePrefix: string })[]; optionalServices: string[] }): Promise<LaserDevice>;
  getDevices?(): Promise<LaserDevice[]>;
}
export interface LaserReading { inches: number; battery?: number; sequence?: string }
export interface LaserSession {
  service: LaserService;
  subscribe(uuid: string, receive: (value: DataView) => void): Promise<LaserCharacteristic>;
  write(characteristic: LaserCharacteristic, value: Uint8Array<ArrayBuffer>): Promise<void>;
}
export interface LaserAdapter {
  id: string;
  service: string;
  start(session: LaserSession, receive: (reading: LaserReading) => void): Promise<void>;
}
export function browserBluetooth(): LaserBluetooth | undefined {
  return typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { bluetooth?: LaserBluetooth }).bluetooth;
}
