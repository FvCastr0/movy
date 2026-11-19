export type UserRole = 'ADMIN' | 'SDR' | 'CLOSER' | 'GESTOR';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

const TOKEN_KEY = 'movy_token';
const USER_KEY = 'movy_user';

export function saveSession(token: string, user: AuthUser) {
  if (typeof window === 'undefined') return;

  // Salvar no localStorage para requisições do client
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));

  // Salvar no document.cookie com validade de 7 dias para o middleware Next.js
  const maxAge = 7 * 24 * 60 * 60; // 7 dias em segundos
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function clearSession() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
