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

  it('renders 1-step danger confirmation in light and dark themes and triggers callbacks', () => {
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
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

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

  it('supports warning (Ban) and success (Unban) 1-step tones without input friction', () => {
    const onBanConfirm = vi.fn();
    const onUnbanConfirm = vi.fn();

    const { rerender } = render(
      <DeleteConfirmModal
        theme="dark"
        tone="warning"
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onBanConfirm}
        title="Xác Nhận Tạm Khóa Tài Khoản"
        description="Tạm khóa staff.q1@vora.vn?"
        confirmLabel="Tạm Khóa Tài Khoản"
      />
    );

    const banBtn = screen.getByRole('button', { name: 'Tạm Khóa Tài Khoản' });
    expect(banBtn).not.toBeDisabled();
    expect(banBtn.className).toContain('bg-amber-600');
    fireEvent.click(banBtn);
    expect(onBanConfirm).toHaveBeenCalledTimes(1);

    rerender(
      <DeleteConfirmModal
        theme="dark"
        tone="success"
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onUnbanConfirm}
        title="Xác Nhận Mở Khóa Tài Khoản"
        description="Mở khóa staff.q1@vora.vn?"
        confirmLabel="Mở Khóa Tài Khoản"
      />
    );

    const unbanBtn = screen.getByRole('button', { name: 'Mở Khóa Tài Khoản' });
    expect(unbanBtn).not.toBeDisabled();
    expect(unbanBtn.className).toContain('bg-emerald-600');
    fireEvent.click(unbanBtn);
    expect(onUnbanConfirm).toHaveBeenCalledTimes(1);
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
