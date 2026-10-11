import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

afterEach(cleanup);
import ApproveCalculated from './ApproveCalculated';

describe('ApproveCalculated', () => {
  it('offers the calculated value to approve, in every language', () => {
    const onApprove = vi.fn();
    for (const [lang, word] of [['en', 'Approve'], ['pt', 'Aprovar'], ['es', 'Aprobar']] as const) {
      const { unmount } = render(<ApproveCalculated lang={lang} calc={33.42} value="" onApprove={onApprove} onChange={() => {}} />);
      expect(screen.getByText('33.4°')).toBeTruthy();
      fireEvent.click(screen.getByText(word));
      unmount();
    }
    expect(onApprove).toHaveBeenCalledTimes(3);
  });

  it('shows approved, and a reading checked against the calculation', () => {
    const { container, rerender } = render(<ApproveCalculated lang="en" calc={33.42} value="33.4" source="calculated-approved" onApprove={() => {}} onChange={() => {}} />);
    expect(container.querySelector('[data-approve-state="approved"]')).toBeTruthy();
    rerender(<ApproveCalculated lang="en" calc={33.42} value="36.5" source="measured" onApprove={() => {}} onChange={() => {}} />);
    expect(container.querySelector('[data-approve-check="red"]')).toBeTruthy();
    rerender(<ApproveCalculated lang="en" calc={33.42} value="34" source="measured" onApprove={() => {}} onChange={() => {}} />);
    expect(container.querySelector('[data-approve-check="green"]')).toBeTruthy();
  });

  it('Modify opens the reading box', () => {
    const onChange = vi.fn();
    const { container } = render(<ApproveCalculated lang="en" calc={30} value="" onApprove={() => {}} onChange={onChange} label="Angle" />);
    fireEvent.click(container.querySelector('[data-approve-modify]')!);
    fireEvent.change(screen.getByLabelText('Angle'), { target: { value: '31' } });
    expect(onChange).toHaveBeenCalledWith('31');
  });
});
