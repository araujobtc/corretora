import { api } from './api'

export const authService = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),

  // Req #1 — Passo 1: envia e-mail com link de recuperação → /auth/forgot-password
  forgotPassword: (data: { email: string }) =>
    api.post('/auth/forgot-password', data),

  // Req #1 — Passo 2: confirma o reset com token do link + nova senha → /auth/reset-password
  confirmResetPassword: (data: { token: string; newPassword: string }) =>
    api.post('/auth/reset-password', data),
}
