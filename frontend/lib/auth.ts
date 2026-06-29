// Backend-owned username/password auth with roles (applicant | admin).
// The backend stores users (bcrypt) in Firestore and issues a session JWT.

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
const TOKEN_KEY = 'applyhq_session'
const USERNAME_KEY = 'applyhq_username'
const ROLE_KEY = 'applyhq_role'

export type Role = 'applicant' | 'admin'

async function postCredentials(path: string, body: Record<string, string>) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`)
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USERNAME_KEY, data.username)
    localStorage.setItem(ROLE_KEY, data.role)
  }
  return data as { token: string; username: string; role: Role }
}

export function signUp(username: string, password: string, role: Role, email: string) {
  return postCredentials('/api/auth/signup', { username, password, role, email })
}

export function signIn(username: string, password: string) {
  return postCredentials('/api/auth/login', { username, password })
}

export function signOut() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USERNAME_KEY)
    localStorage.removeItem(ROLE_KEY)
  }
}

export function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getUsername(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(USERNAME_KEY)
}

export function getRole(): Role | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ROLE_KEY) as Role | null
}

export function isLoggedIn(): boolean {
  return !!getSessionToken()
}
