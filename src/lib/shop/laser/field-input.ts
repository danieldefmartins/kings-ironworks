export const LASER_INPUT_EVENT = 'kiw:laser-input';
export type LaserInputDetail = { value: string };

/** Shared MInput also renders quantities and free text, so data-m alone is not a unit. */
export function laserFieldUnit(help?: string, placeholder?: string): 'len' | 'deg' | 'count' | 'text' {
  if (/[°º]/.test(placeholder || '')) return 'deg';
  if (/(?:count|qty|risers|rungs)$/i.test(help || '') || help === 'stepsThisFlight' || placeholder === '0') return 'count';
  if (placeholder === '—' || (placeholder && /[a-zá-ú]/i.test(placeholder) && !/["′″']/.test(placeholder))) return 'text';
  return 'len';
}

/** Never put a length into a name, angle, count, disabled or read-only input. */
export function isLaserField(node: Element | null): node is HTMLInputElement {
  if (!(node instanceof HTMLInputElement) || !node.matches('input[data-m="1"]') || node.disabled || node.readOnly) return false;
  if (node.dataset.laserUnit) return node.dataset.laserUnit === 'len';
  return laserFieldUnit(undefined, node.placeholder) === 'len' && node.type !== 'number';
}
export function fillLaserField(node: HTMLInputElement, value: string): boolean {
  if (!isLaserField(node)) return false;
  // NextMeasurement handles its write and navigation atomically through this event.
  if (node.closest('[data-next-measure]')) {
    return !node.dispatchEvent(new CustomEvent<LaserInputDetail>(LASER_INPUT_EVENT, { detail: { value }, cancelable: true }));
  }
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (!setter) return false;
  setter.call(node, value);
  node.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}
