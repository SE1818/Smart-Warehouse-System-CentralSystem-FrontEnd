import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuditLogFilters } from '@/components/logs/AuditLogFilters';

describe('AuditLogFilters', () => {
  it('renders all filter dropdowns', () => {
    render(<AuditLogFilters onFilterChange={() => {}} />);
    expect(screen.getByText('Tìm kiếm')).toBeInTheDocument();
    expect(screen.getByText('Hoạt động')).toBeInTheDocument();
    expect(screen.getByText('Mức độ')).toBeInTheDocument();
    expect(screen.getByText('Từ ngày')).toBeInTheDocument();
    expect(screen.getByText('Đến ngày')).toBeInTheDocument();
  });

  it('renders date input fields', () => {
    render(<AuditLogFilters onFilterChange={() => {}} />);
    const dateInputs = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    expect(dateInputs.length).toBeGreaterThanOrEqual(1);
  });

  it('calls onFilterChange with correct values when search is typed and apply is clicked', () => {
    const handleFilterChange = vi.fn();
    render(<AuditLogFilters onFilterChange={handleFilterChange} />);

    const searchInput = screen.getByPlaceholderText('Tìm theo tin nhắn, thực thể...');
    fireEvent.change(searchInput, { target: { value: 'tao san pham' } });

    const applyButton = screen.getByText('Áp dụng bộ lọc');
    fireEvent.click(applyButton);

    expect(handleFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'tao san pham',
      })
    );
  });

  it('calls onFilterChange when reset button is clicked', () => {
    const handleFilterChange = vi.fn();
    render(<AuditLogFilters onFilterChange={handleFilterChange} />);

    const resetButton = screen.getByText('Đặt lại');
    fireEvent.click(resetButton);

    // Reset sends default date range with no search/activity/severity
    expect(handleFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: expect.any(String),
        endDate: expect.any(String),
      })
    );
    // The last call should have search undefined (not present in the reset call)
    const lastCall = handleFilterChange.mock.calls[handleFilterChange.mock.calls.length - 1][0];
    expect(lastCall.search).toBeUndefined();
  });

  it('renders the apply filter button', () => {
    render(<AuditLogFilters onFilterChange={() => {}} />);
    expect(screen.getByText('Áp dụng bộ lọc')).toBeInTheDocument();
  });
});
