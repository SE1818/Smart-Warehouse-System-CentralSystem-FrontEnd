export interface LoginRequest { email: string; password: string; }
export interface RegisterRequest { username: string; email: string; password: string; }
export interface AuthResponse { accessToken: string; refreshToken: string; accessTokenExpiresIn: string; role: string; }
export interface User { id: string; username: string; email: string; role: string; isActive: boolean; createdAt: string; }
