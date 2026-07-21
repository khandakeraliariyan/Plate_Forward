import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api/v1";

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

const readCookie = (name: string) => {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

// csrfToken is the only session cookie readable from JS (refreshToken is
// httpOnly); its presence is a proxy for "there might be a session to
// restore", letting callers skip a guaranteed-403 refresh on a cold visit.
export const hasSessionCookie = () => readCookie("csrfToken") !== null;

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

const doRefresh = async (): Promise<string | null> => {
  const csrfToken = readCookie("csrfToken");
  try {
    const res = await axios.post(
      `${baseURL}/auth/refresh`,
      {},
      {
        withCredentials: true,
        headers: csrfToken ? { "x-csrf-token": csrfToken } : {},
      }
    );
    const token = res.data?.data?.accessToken ?? res.data?.accessToken ?? null;
    setAccessToken(token);
    return token;
  } catch {
    setAccessToken(null);
    return null;
  }
};

// The refresh token rotates on every use, so two concurrent callers (e.g.
// React 18 StrictMode double-invoking an effect) would otherwise race: the
// second call reads the already-rotated-out cookie and 401s, clobbering the
// token the first call just set. Coalescing into one shared in-flight
// promise makes every caller within a window observe the same result.
let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = (): Promise<string | null> => {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;

    if (error.response?.status === 401 && original && !original._retried && !original.url?.includes("/auth/")) {
      original._retried = true;

      const token = await refreshAccessToken();
      if (token) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }

    return Promise.reject(error);
  }
);

export { refreshAccessToken };
