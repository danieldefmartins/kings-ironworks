import { Bosch100Assembler, boschCommand, parseBosch50, parseDistoBasic, parseDistoDistance } from './parsers';
import type { LaserAdapter } from './types';

export const DISTO_SERVICE = '3ab10100-f831-4395-b29d-570977d5bf94';
export const DISTO_DISTANCE = '3ab10101-f831-4395-b29d-570977d5bf94';
export const DISTO_BASIC = '3ab1010d-f831-4395-b29d-570977d5bf94';
export const BOSCH50_SERVICE = '02a6c0d0-0451-4000-b000-fb3210111989';
export const BOSCH50_DISTANCE = '02a6c0d1-0451-4000-b000-fb3210111989';
export const BOSCH100_SERVICE = '00005301-0000-0041-5253-534f46540000';
export const BOSCH100_TX = '00004301-0000-0041-5253-534f46540000';
export const BOSCH100_RX = '00004302-0000-0041-5253-534f46540000';
export const BATTERY_SERVICE = '0000180f-0000-1000-8000-00805f9b34fb';
export const BATTERY_LEVEL = '00002a19-0000-1000-8000-00805f9b34fb';

export const laserAdapters: readonly LaserAdapter[] = [
  {
    id: 'leica-disto', service: DISTO_SERVICE,
    async start(session, receive) {
      // Choose one channel; subscribing to both would advance twice per shot.
      let basic = false;
      try { await session.service.getCharacteristic(DISTO_DISTANCE); }
      catch { basic = true; }
      await session.subscribe(basic ? DISTO_BASIC : DISTO_DISTANCE, value => {
        const reading = basic ? parseDistoBasic(value) : parseDistoDistance(value);
        if (reading) receive(reading);
      });
    },
  },
  {
    id: 'bosch-glm50c', service: BOSCH50_SERVICE,
    async start(session, receive) {
      const channel = await session.subscribe(BOSCH50_DISTANCE, value => {
        const reading = parseBosch50(value);
        if (reading) receive(reading);
      });
      await session.write(channel, boschCommand(0x55, [1, 0]));
    },
  },
  {
    id: 'bosch-glm100c', service: BOSCH100_SERVICE,
    async start(session, receive) {
      const assembly = new Bosch100Assembler();
      const tx = await session.service.getCharacteristic(BOSCH100_TX);
      await session.subscribe(BOSCH100_RX, value => {
        const packet = assembly.push(value);
        if (packet.ack) void session.write(tx, packet.ack).catch(() => {});
        if (packet.reading) receive(packet.reading);
      });
      // Enable autosync, preserving the device's mode/reference. No remote shot.
      await session.write(tx, new Uint8Array([0x10, ...boschCommand(0x50, [0x40, 0])]));
    },
  },
];
