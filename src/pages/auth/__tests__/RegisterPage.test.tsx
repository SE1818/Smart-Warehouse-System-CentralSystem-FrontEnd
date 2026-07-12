import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from '../RegisterPage';

const mockRegister = vi.fn();
const mockVerifyEmail = vi.fn();

vi.mock('@/services/auth', () => ({
  authService: {
    register: (...args: unknown[]) => mockRegister(...args),
    verifyEmail: (...args: unknown[]) => mockVerifyEmail(...args),
  },
}));

function renderRegister(initialEntries: string[] = ['/register']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <RegisterPage />
    </MemoryRouter>
  );
}

const firstPassword = () => screen.getAllByPlaceholderText('••••••••')[0];
const secondPassword = () => screen.getAllByPlaceholderText('••••••••')[1];

const submitForm = async () => {
  const emailInput = screen.getByPlaceholderText('ten@smartwarehouse.com');
  const form = emailInput.closest('form')!;
  fireEvent.submit(form);
};

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRegister.mockClear();
    mockVerifyEmail.mockClear();
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it('renders all form fields and submit button', () => {
    renderRegister();
    expect(screen.getByPlaceholderText('Nguyen Van A')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('ten@smartwarehouse.com')).toBeInTheDocument();
    expect(firstPassword()).toBeInTheDocument();
    expect(secondPassword()).toBeInTheDocument();
    expect(screen.getByText('Đăng ký')).toBeInTheDocument();
  });

  it('shows login link at the bottom', () => {
    renderRegister();
    expect(screen.getByText('Đăng nhập')).toBeInTheDocument();
  });

  it('shows error when username is empty on submit', async () => {
    renderRegister();
    await submitForm();
    expect(await screen.findByText('Tên tài khoản không được để trống.')).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('shows error when username is shorter than 3 chars', async () => {
    const user = userEvent.setup();
    renderRegister();
    const usernameInput = screen.getByPlaceholderText('Nguyen Van A');
    await user.type(usernameInput, 'ab');
    await submitForm();
    expect(await screen.findByText('Tên tài khoản phải có ít nhất 3 ký tự.')).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('shows error when email is empty on submit', async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.type(screen.getByPlaceholderText('Nguyen Van A'), 'validuser');
    await submitForm();
    expect(await screen.findByText('Email không được để trống.')).toBeInTheDocument();
  });

  it('shows error for invalid email format', async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.type(screen.getByPlaceholderText('Nguyen Van A'), 'validuser');
    await user.type(screen.getByPlaceholderText('ten@smartwarehouse.com'), 'not-an-email');
    await submitForm();
    expect(await screen.findByText('Email không đúng định dạng.')).toBeInTheDocument();
  });

  it('shows error when password is empty on submit', async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.type(screen.getByPlaceholderText('Nguyen Van A'), 'validuser');
    await user.type(screen.getByPlaceholderText('ten@smartwarehouse.com'), 'valid@email.com');
    await submitForm();
    expect(await screen.findByText('Mật khẩu không được để trống.')).toBeInTheDocument();
  });

  it('shows error when password is shorter than 8 chars', async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.type(screen.getByPlaceholderText('Nguyen Van A'), 'validuser');
    await user.type(screen.getByPlaceholderText('ten@smartwarehouse.com'), 'valid@email.com');
    await user.type(firstPassword(), 'Ab1!abc');
    await submitForm();
    expect(await screen.findByText('Mật khẩu phải có ít nhất 8 ký tự.')).toBeInTheDocument();
  });

  it('shows error when password lacks uppercase letter', async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.type(screen.getByPlaceholderText('Nguyen Van A'), 'validuser');
    await user.type(screen.getByPlaceholderText('ten@smartwarehouse.com'), 'valid@email.com');
    await user.type(firstPassword(), 'abcdefg1!');
    await submitForm();
    expect(await screen.findByText('Mật khẩu phải chứa ít nhất một chữ cái viết hoa.')).toBeInTheDocument();
  });

  it('shows error when password lacks lowercase letter', async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.type(screen.getByPlaceholderText('Nguyen Van A'), 'validuser');
    await user.type(screen.getByPlaceholderText('ten@smartwarehouse.com'), 'valid@email.com');
    await user.type(firstPassword(), 'ABCDEFG1!');
    await submitForm();
    expect(await screen.findByText('Mật khẩu phải chứa ít nhất một chữ cái viết thường.')).toBeInTheDocument();
  });

  it('shows error when password lacks a digit', async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.type(screen.getByPlaceholderText('Nguyen Van A'), 'validuser');
    await user.type(screen.getByPlaceholderText('ten@smartwarehouse.com'), 'valid@email.com');
    await user.type(firstPassword(), 'Abcdefgh!');
    await submitForm();
    expect(await screen.findByText('Mật khẩu phải chứa ít nhất một chữ số.')).toBeInTheDocument();
  });

  it('shows error when password lacks special character', async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.type(screen.getByPlaceholderText('Nguyen Van A'), 'validuser');
    await user.type(screen.getByPlaceholderText('ten@smartwarehouse.com'), 'valid@email.com');
    await user.type(firstPassword(), 'Abcdefg12');
    await submitForm();
    expect(await screen.findByText('Mật khẩu phải chứa ít nhất một ký tự đặc biệt.')).toBeInTheDocument();
  });

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.type(screen.getByPlaceholderText('Nguyen Van A'), 'validuser');
    await user.type(screen.getByPlaceholderText('ten@smartwarehouse.com'), 'valid@email.com');
    await user.type(firstPassword(), 'ValidPass1!');
    await user.type(secondPassword(), 'ValidPass2!');
    await submitForm();
    expect(await screen.findByText('Mật khẩu xác nhận không khớp.')).toBeInTheDocument();
  });

  it('calls authService.register with correct data on valid submission', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValue({
      accessToken: 'test-token',
      refreshToken: 'rt',
      accessTokenExpiresIn: '3600',
      role: 'User',
    });

    renderRegister();
    await user.type(screen.getByPlaceholderText('Nguyen Van A'), 'validuser');
    await user.type(screen.getByPlaceholderText('ten@smartwarehouse.com'), 'valid@email.com');
    await user.type(firstPassword(), 'ValidPass1!');
    await user.type(secondPassword(), 'ValidPass1!');
    await user.click(screen.getByText('Đăng ký'));
    expect(mockRegister).toHaveBeenCalledWith({
      username: 'validuser',
      email: 'valid@email.com',
      password: 'ValidPass1!',
    });
  });

  it('shows API error message on failed registration', async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValue({
      response: { data: { message: 'Email already exists' } },
    });

    renderRegister();
    await user.type(screen.getByPlaceholderText('Nguyen Van A'), 'validuser');
    await user.type(screen.getByPlaceholderText('ten@smartwarehouse.com'), 'taken@email.com');
    await user.type(firstPassword(), 'ValidPass1!');
    await user.type(secondPassword(), 'ValidPass1!');
    await user.click(screen.getByText('Đăng ký'));
    expect(await screen.findByText('Email already exists')).toBeInTheDocument();
  });

  it('shows first validation error from errors object on failed registration', async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValue({
      response: {
        data: {
          errors: {
            username: ['Username already taken'],
            email: ['Email already exists'],
          },
        },
      },
    });

    renderRegister();
    await user.type(screen.getByPlaceholderText('Nguyen Van A'), 'validuser');
    await user.type(screen.getByPlaceholderText('ten@smartwarehouse.com'), 'taken@email.com');
    await user.type(firstPassword(), 'ValidPass1!');
    await user.type(secondPassword(), 'ValidPass1!');
    await user.click(screen.getByText('Đăng ký'));

    await waitFor(() => {
      const shownUsername = screen.queryByText('Username already taken');
      const shownEmail = screen.queryByText('Email already exists');
      expect(shownUsername || shownEmail).not.toBeNull();
    });
  });

  it('shows default error message when no structured error data is provided', async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValue({
      response: { data: {} },
    });

    renderRegister();
    await user.type(screen.getByPlaceholderText('Nguyen Van A'), 'validuser');
    await user.type(screen.getByPlaceholderText('ten@smartwarehouse.com'), 'e@e.com');
    await user.type(firstPassword(), 'ValidPass1!');
    await user.type(secondPassword(), 'ValidPass1!');
    await user.click(screen.getByText('Đăng ký'));
    expect(await screen.findByText('Đăng ký thất bại. Vui lòng thử lại.')).toBeInTheDocument();
  });

  it('clears previous errors before re-submitting', async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValue({
      response: { data: { message: 'Error' } },
    });

    renderRegister();
    await user.type(screen.getByPlaceholderText('Nguyen Van A'), 'validuser');
    await user.type(screen.getByPlaceholderText('ten@smartwarehouse.com'), 'e@e.com');
    await user.type(firstPassword(), 'ValidPass1!');
    await user.type(secondPassword(), 'ValidPass1!');
    await user.click(screen.getByText('Đăng ký'));
    expect(await screen.findByText('Error')).toBeInTheDocument();

    // Re-type email with invalid format and re-submit
    await user.clear(screen.getByPlaceholderText('ten@smartwarehouse.com'));
    await user.type(screen.getByPlaceholderText('ten@smartwarehouse.com'), 'not-email');
    await submitForm();
    expect(screen.queryByText('Error')).not.toBeInTheDocument();
    expect(await screen.findByText('Email không đúng định dạng.')).toBeInTheDocument();
  });
});
