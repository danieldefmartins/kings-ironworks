# Laser distance input

The editor owns a `LaserClient`, disposed when leaving the sheet. Adapters expose a service UUID and a `start(session, receive)` method. They subscribe through the session so listener cleanup and cancellation stay centralized. Add a new adapter to `laserAdapters`; its service is automatically included in the browser chooser permissions.

## Supported transports and wire units

- Leica DISTO: service `3ab10100-f831-4395-b29d-570977d5bf94`, distance `3ab10101-f831-4395-b29d-570977d5bf94`. Four-byte little-endian float in **metres**, independent of the display-unit characteristic `3ab10102`. Modern basic-measurement channel `3ab1010d` is a fallback when the distance channel is absent; it carries a 20-byte packet beginning with the same metre float. Subscribe to one channel only to avoid recording a shot twice.
- Bosch GLM 50 C: service `02a6c0d0-0451-4000-b000-fb3210111989`, characteristic `02a6c0d1-0451-4000-b000-fb3210111989`. Enable autosync with `c0 55 02 01 00 1a`. Command `0x55` event frames contain a 16-byte ExchangeDataContainer; the little-endian result float starts at frame offset 7. Device mode (`payload[0] >> 2`) must be single distance; laser-on and temperature warning events are ignored. Config-units bit 3 selects the device **display**, while result lengths remain **metres**. UniqueID suppresses repeated status notifications for one shot.
- Bosch GLM 100 C: service `00005301-0000-0041-5253-534f46540000`, host-write characteristic `00004301-0000-0041-5253-534f46540000`, notifications `00004302-0000-0041-5253-534f46540000`. Enable command `0x50` autosync with payload `40 00`. BLE fragments have a sequence/countdown octet and up to 19 frame bytes. Each fragment receives `ff <sequence> 00`; complete frames require valid CRC8, command, length, mode and status. The 33-byte sync container's **first** float is the single-distance value (metres); do not use the fourth float merely because pymtprotocol calls it `result`. Timestamp/list index prevent duplicate consumption. SOC supplies battery percentage.

All Bosch frames use CRC8 polynomial `0xa6`, initial `0xaa`. Only new single-distance events are accepted: continuous/area/volume/angle/calculation/status traffic cannot auto-advance distance fields. No command triggers the laser remotely or changes its display units. Optional standard battery service `180f` / characteristic `2a19` is read and subscribed when available.

Sources:

- [Leica D2 characteristic observations](https://github.com/seichter/d2relay/blob/main/doc/notes.md), [DISTO characteristic definitions](https://docs.rs/disto/latest/src/disto/protocol/characteristic.rs.html).
- [Bosch's LRF command set, §§4.2.2–4.2.4, mirrored by PointerEvent](https://github.com/PointerEvent/bosch-plr-demo/blob/main/docs/MT_connectivity_protocol_LRF_command_set_2_5_0.pdf), [Bosch MT frame/CRC specification](https://github.com/PointerEvent/bosch-plr-demo/blob/main/docs/MT_connectivity_protocol_1_2_9.pdf).
- [pymtprotocol GLM100 BLE transport](https://github.com/piannucci/pymtprotocol/blob/master/glm-server.py), [UUIDs and container layout](https://github.com/piannucci/pymtprotocol/blob/master/protocol.py).
- [GLM50C captured notification fixtures](https://stackoverflow.com/questions/76381423/how-to-parse-bosch-glm-laser-distance-meter-messages-with-webbluetooth-in-chrome), [community BLE implementation](https://github.com/ketan/Bosch-GLM50C-Rangefinder), [additional Bosch packet capture](https://github.com/lz1asl/CaveSurvey/issues/150).

## Editor contract

`LaserControl` appears only when `navigator.bluetooth` exists. The iOS/desktop-mode iPad hint lives inside the overflow menu. Device choice is a user gesture; the last successful device ID/name is remembered locally. `getDevices()` reuses granted permission when supported; otherwise the picker opens again. Link loss causes a toast and up to three reconnect attempts at 1, 2, and 4 seconds. Explicit disconnect, device changes and unmount cancel retries and remove handlers.

Distance inputs already use `data-m="1"`. The focused distance field wins; a focused non-distance text field blocks routing. With no focused input, the visible Next card is the fallback. Set `data-laser-unit="len"` explicitly for length inputs with ambiguous placeholders; `deg`/`count` reject laser input. The Next card handles `kiw:laser-input` with a cancelable event, writes through its existing setter, and advances atomically. Other fields use native input events, like the existing fraction insertion control, retaining autosave and undo behavior. Values round to 1/16 inch and use sheet inches or feet/inches. The toast retains the measured value and prior field label after advance.

No field-source map exists in the current MeasureData/API schema, so source metadata is intentionally skipped. No database/schema changes or premium entitlement system were introduced.

## Verification and limits

Parser tests include captured GLM50 bytes and specification-format DISTO/GLM100 samples, malformed frames, CRC, endian/offset handling, display-unit flags, error/mode filtering, fragment loss, duplicate notifications and fraction carry. Mock connection/UI tests cover pairing, permission recall, reconnect bounds, cleanup, focused fields, Next advancement and unsupported iOS.

Physical devices were unavailable. Validate the exact DISTO/GLM firmware and native browser pairing with hardware before claiming field certification, especially the legacy GLM100 BLE fragment handshake and modern DISTO basic-channel fallback. Bluetooth Classic-only devices cannot work through Web Bluetooth. Use single-distance mode for the walk-through workflow.
