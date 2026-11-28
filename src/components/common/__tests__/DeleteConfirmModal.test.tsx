/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DeleteConfirmModal } from '../DeleteConfirmModal';

describe('DeleteConfirmModal', () => {
  afterEach(() => {
    cleanup();
  });

  it('does not render when isOpen is false', () => {
    render(
      <DeleteConfirmModal
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Xác Nhận Xóa"
        description="Nội dung cảnh báo"
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders Standard mode (light and dark), calls onConfirm and supports Escape/cancel', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    const { rerender } = render(
      <DeleteConfirmModal
        theme="light"
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Xác Nhận Xóa Trạm Bản Đồ"
        subtitle="Trạm: WP-B12"
        description="Bạn có chắc chắn muốn xóa trạm này?"
        warningNote="Hành động cần lưu đồng bộ."
        chips={[{ label: 'Trạm Bàn', accent: true }, { label: 'X: 1.50m, Y: 2.00m' }]}
        confirmLabel="Xóa Trạm"
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog.className).toContain('bg-white');
    expect(screen.getByText('Xác Nhận Xóa Trạm Bản Đồ')).toBeInTheDocument();
    expect(screen.getByText('Trạm: WP-B12')).toBeInTheDocument();
    expect(screen.getByText('Hành động cần lưu đồng bộ.')).toBeInTheDocument();
    expect(screen.getByText('Trạm Bàn')).toBeInTheDocument();
    expect(screen.getByText('X: 1.50m, Y: 2.00m')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Xóa Trạm' });
    expect(confirmBtn).not.toBeDisabled();
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);

    rerender(
      <DeleteConfirmModal
        theme="dark"
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Xác Nhận Xóa Nhật Ký"
        description="Xóa toàn bộ log phiên?"
      />
    );

    expect(screen.getByRole('dialog').className).toContain('bg-[#111827]');
  });

  it('locks confirm in Strict mode until exact confirmKeyword is typed and resets on reopen', () => {
    const onConfirm = vi.fn();

    const { rerender } = render(
      <DeleteConfirmModal
        theme="dark"
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        title="Xác Nhận Xóa Robot"
        description="Xóa robot VORA-01?"
        confirmKeyword="VORA-01"
        confirmLabel="Xóa Robot"
      />
    );

    const confirmBtn = screen.getByRole('button', { name: 'Xóa Robot' });
    const input = screen.getByPlaceholderText('VORA-01') as HTMLInputElement;

    expect(confirmBtn).toBeDisabled();
    expect(
      screen.getByText('Nút xác nhận đang bị khóa cho đến khi khớp chính xác tên/mã đối tượng.')
    ).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'VORA-02' } });
    expect(confirmBtn).toBeDisabled();
    fireEvent.click(confirmBtn);
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: ' VORA-01 ' } });
    expect(confirmBtn).not.toBeDisabled();
    expect(screen.getByText('Đã khớp mã đối tượng — sẵn sàng xác nhận xóa')).toBeInTheDocument();

    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);

    rerender(
      <DeleteConfirmModal
        theme="dark"
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        title="Xác Nhận Xóa Robot"
        description="Xóa robot VORA-01?"
        confirmKeyword="VORA-01"
        confirmLabel="Xóa Robot"
      />
    );

    rerender(
      <DeleteConfirmModal
        theme="dark"
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        title="Xác Nhận Xóa Robot"
        description="Xóa robot VORA-01?"
        confirmKeyword="VORA-01"
        confirmLabel="Xóa Robot"
      />
    );

    const reopenedInput = screen.getByPlaceholderText('VORA-01') as HTMLInputElement;
    expect(reopenedInput.value).toBe('');
    expect(screen.getByRole('button', { name: 'Xóa Robot' })).toBeDisabled();
  });

  it('disables buttons and blocks Escape closing while isLoading is true', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <DeleteConfirmModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        isLoading={true}
        loadingLabel="Đang xóa..."
        title="Xác Nhận Xóa"
        description="Đang thực thi"
      />
    );

    expect(screen.getByRole('button', { name: 'Hủy' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Đang xóa...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Đóng hộp thoại' })).toBeDisabled();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
