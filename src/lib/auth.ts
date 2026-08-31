const API_URL = "http://127.0.0.1:8000";

export type AuthUser = {
  id: number;
  username: string;
  email: string;
};

export type AuthLodge = {
  id: number;
  name: string;
};

export type AuthData = {
  token: string;
  user: AuthUser;
  lodge: AuthLodge;
  role: string;
};

export function saveAuth(data: AuthData) {
  localStorage.setItem("auth", JSON.stringify(data));
}

export function getAuth(): AuthData | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = localStorage.getItem("auth");

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as AuthData;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  const auth = getAuth();

  return auth?.token ?? null;
}

export function logout() {
  localStorage.removeItem("auth");
}

export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = getToken();

  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Token ${token}`);
  }

  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
}