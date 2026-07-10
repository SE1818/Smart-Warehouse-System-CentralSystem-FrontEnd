import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomSelect } from '@/components/CustomSelect';

const mockOptions = [
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'shipped', label: 'Đang vận chuyển' },
];

describe('CustomSelect', () => {
  it('renders placeholder when value is empty', () => {
    render(
      <CustomSelect
        value=""
        onChange={() => {}}
        options={mockOptions}
        placeholder="Chọn trạng thái"
      />
    );
    expect(screen.getByText('Chọn trạng thái')).toBeInTheDocument();
  });

  it('renders options list when opened', () => {
    render(
      <CustomSelect
        value=""
        onChange={() => {}}
        options={mockOptions}
        placeholder="Chọn trạng thái"
      />
    );
    const button = screen.getByText('Chọn trạng thái');
    fireEvent.click(button);
    expect(screen.getByText('Chờ xác nhận')).toBeInTheDocument();
    expect(screen.getByText('Đã xác nhận')).toBeInTheDocument();
    expect(screen.getByText('Đang vận chuyển')).toBeInTheDocument();
  });

  it('calls onChange with correct value when option clicked', () => {
    const handleChange = vi.fn();
    render(
      <CustomSelect
        value=""
        onChange={handleChange}
        options={mockOptions}
        placeholder="Chọn trạng thái"
      />
    );
    fireEvent.click(screen.getByText('Chọn trạng thái'));
    fireEvent.click(screen.getByText('Đã xác nhận'));
    expect(handleChange).toHaveBeenCalledWith('confirmed');
  });

  it('reflects selected value', () => {
    render(
      <CustomSelect
        value="shipped"
        onChange={() => {}}
        options={mockOptions}
        placeholder="Chọn trạng thái"
      />
    );
    expect(screen.getByText('Đang vận chuyển')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <CustomSelect
        value=""
        onChange={() => {}}
        options={mockOptions}
        placeholder="Chọn trạng thái"
        disabled
      />
    );
    expect(screen.getByText('Chọn trạng thái').closest('button')).toBeDisabled();
  });
});
