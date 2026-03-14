/**
 * Vinted API HTTP client with session management, rate limiting, and caching.
 */

import { TtlCache } from "../utils/cache.js";
import { RateLimiter } from "../utils/rate-limiter.js";
import { type SessionProvider, createSessionProvider } from "./session-provider.js";
import { AuthenticatedSessionProvider } from "./auth-session-provider.js";
import { getAuthConfig } from "../config/auth.js";

const DEFAULT_DOMAIN = "www.vinted.fr";
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes
const REQUEST_TIMEOUT_MS = 15_000;
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1000;

// Rate limit: 10 requests per 10 seconds (conservative to avoid bans)
const RATE_LIMIT_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 10_000;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

interface Session {
  cookie: string;
  fetchedAt: number;
}

export class VintedClient {
  private readonly domain: string;
  private session: Session | null = null;
  private refreshPromise: Promise<void> | null = null;
  private authSession: Session | null = null;
  private authRefreshPromise: Promise<void> | null = null;
  private readonly cache = new TtlCache<unknown>(CACHE_TTL_MS);
  private readonly rateLimiter = new RateLimiter(RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS);
  private readonly inflight = new Map<string, Promise<unknown>>();
  private readonly sessionProvider: SessionProvider;
  private readonly authSessionProvider: SessionProvider | null;

  constructor(domain?: string, sessionProvider?: SessionProvider) {
    this.domain = domain ?? process.env["VINTED_DOMAIN"] ?? DEFAULT_DOMAIN;
    this.sessionProvider = sessionProvider ?? createSessionProvider();

    const authConfig = getAuthConfig();
    this.authSessionProvider = authConfig
      ? new AuthenticatedSessionProvider(authConfig)
      : null;
  }

  private get baseUrl(): string {
    return `https://${this.domain}`;
  }

  private async doRefreshSession(): Promise<void> {
    this.session = await this.sessionProvider.refreshSession(this.domain);
  }

  /**
   * Coalesce concurrent session refreshes into a single request.
   */
  private async refreshSession(): Promise<void> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.doRefreshSession().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  private isSessionValid(): boolean {
    if (!this.session) return false;
    return Date.now() - this.session.fetchedAt < SESSION_TTL_MS;
  }

  private async ensureSession(): Promise<string> {
    if (!this.isSessionValid()) {
      await this.refreshSession();
    }
    if (!this.session) {
      throw new Error("Failed to establish Vinted session");
    }
    return this.session.cookie;
  }

  // ── Authenticated session management ──

  private async doRefreshAuthSession(): Promise<void> {
    if (!this.authSessionProvider) {
      throw new Error(
        "Authentication required. Set VINTED_EMAIL and VINTED_PASSWORD environment variables."
      );
    }
    this.authSession = await this.authSessionProvider.refreshSession(this.domain);
  }

  private async refreshAuthSession(): Promise<void> {
    if (!this.authRefreshPromise) {
      this.authRefreshPromise = this.doRefreshAuthSession().finally(() => {
        this.authRefreshPromise = null;
      });
    }
    return this.authRefreshPromise;
  }

  private isAuthSessionValid(): boolean {
    if (!this.authSession) return false;
    return Date.now() - this.authSession.fetchedAt < SESSION_TTL_MS;
  }

  private async ensureAuthSession(): Promise<string> {
    if (!this.isAuthSessionValid()) {
      await this.refreshAuthSession();
    }
    if (!this.authSession) {
      throw new Error("Failed to establish authenticated Vinted session");
    }
    return this.authSession.cookie;
  }

  /**
   * Fetch with retry logic for transient errors.
   */
  private async fetchWithRetry(
    url: string,
    cookie: string,
    method: HttpMethod = "GET",
    body?: Record<string, unknown>,
  ): Promise<Response> {
    let lastError: Error | null = null;
    let retryDelay = RETRY_BASE_DELAY_MS;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
          const headers: Record<string, string> = {
            "User-Agent": USER_AGENT,
            Accept: "application/json",
            Cookie: cookie,
          };

          if (body !== undefined) {
            headers["Content-Type"] = "application/json";
          }

          const response = await fetch(url, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
            signal: controller.signal,
          });

          // Return 2xx/3xx immediately
          if (response.ok) {
            return response;
          }

          // Don't retry client errors (except 429; auth handled by caller)
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            return response;
          }

          // Retry on 429 (rate limited) or 5xx - consume body to free connection
          const retryAfter = response.headers.get("retry-after");
          retryDelay = retryAfter
            ? Math.min(parseInt(retryAfter, 10) * 1000, 30_000)
            : RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
          await response.body?.cancel();
          lastError = new Error(`Vinted API error: ${response.status} ${response.statusText}`);
          continue;
        } finally {
          clearTimeout(timeout);
        }
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (error instanceof DOMException && error.name === "AbortError") {
          lastError = new Error("Request timed out");
        }
      }
    }

    throw lastError ?? new Error("Request failed after retries");
  }

  /**
   * Make an authenticated, cached, rate-limited GET request to the Vinted API.
   * Deduplicates concurrent requests for the same URL.
   */
  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`/api/v2${path}`, this.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") {
          url.searchParams.set(key, value);
        }
      }
    }

    const cacheKey = url.toString();

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      return cached as T;
    }

    // Deduplicate concurrent requests for the same URL
    const existing = this.inflight.get(cacheKey);
    if (existing) {
      return existing as Promise<T>;
    }

    const promise = this.fetchAndCache<T>(cacheKey);
    this.inflight.set(cacheKey, promise);

    try {
      return await promise;
    } finally {
      this.inflight.delete(cacheKey);
    }
  }

  private async fetchAndCache<T>(cacheKey: string): Promise<T> {
    // Ensure session before consuming a rate limit token
    const cookie = await this.ensureSession();

    await this.rateLimiter.acquire();

    let response = await this.fetchWithRetry(cacheKey, cookie);

    // Handle expired session
    if (response.status === 401 || response.status === 403) {
      await response.body?.cancel();
      this.session = null;
      const newCookie = await this.ensureSession();
      response = await this.fetchWithRetry(cacheKey, newCookie);
    }

    if (!response.ok) {
      throw new Error(`Vinted API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as T;
    this.cache.set(cacheKey, data);
    return data;
  }

  // ── Authenticated write operations ──

  /**
   * Make an authenticated POST request to the Vinted API.
   * Requires VINTED_EMAIL and VINTED_PASSWORD to be configured.
   */
  async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    return this.mutate<T>("POST", path, body);
  }

  /**
   * Make an authenticated PUT request to the Vinted API.
   */
  async put<T>(path: string, body: Record<string, unknown>): Promise<T> {
    return this.mutate<T>("PUT", path, body);
  }

  /**
   * Make an authenticated DELETE request to the Vinted API.
   */
  async del<T>(path: string): Promise<T> {
    return this.mutate<T>("DELETE", path);
  }

  private async mutate<T>(
    method: HttpMethod,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = new URL(`/api/v2${path}`, this.baseUrl).toString();
    const cookie = await this.ensureAuthSession();

    await this.rateLimiter.acquire();

    let response = await this.fetchWithRetry(url, cookie, method, body);

    // Handle expired auth session
    if (response.status === 401 || response.status === 403) {
      await response.body?.cancel();
      this.authSession = null;
      const newCookie = await this.ensureAuthSession();
      response = await this.fetchWithRetry(url, newCookie, method, body);
    }

    if (!response.ok) {
      throw new Error(`Vinted API error: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as T;
  }

  /**
   * Check whether authenticated operations are available.
   */
  get isAuthenticated(): boolean {
    return this.authSessionProvider !== null;
  }

  /**
   * Release browser resources held by session providers.
   */
  async destroy(): Promise<void> {
    await this.sessionProvider.destroy();
    await this.authSessionProvider?.destroy();
  }
}

/** Singleton client instance */
let clientInstance: VintedClient | null = null;

export function getClient(): VintedClient {
  if (!clientInstance) {
    clientInstance = new VintedClient();
  }
  return clientInstance;
}

export async function destroyClient(): Promise<void> {
  if (clientInstance) {
    await clientInstance.destroy();
    clientInstance = null;
  }
}
