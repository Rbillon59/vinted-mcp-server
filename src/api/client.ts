/**
 * Vinted API HTTP client with session management.
 *
 * Handles cookie-based authentication by fetching a session cookie
 * from the Vinted homepage before making API requests.
 */

const DEFAULT_DOMAIN = "www.vinted.fr";
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes
const REQUEST_TIMEOUT_MS = 15_000;

interface Session {
  cookie: string;
  fetchedAt: number;
}

export class VintedClient {
  private readonly domain: string;
  private session: Session | null = null;

  constructor(domain?: string) {
    this.domain = domain ?? process.env["VINTED_DOMAIN"] ?? DEFAULT_DOMAIN;
  }

  private get baseUrl(): string {
    return `https://${this.domain}`;
  }

  /**
   * Acquire a fresh session cookie from Vinted's homepage.
   */
  private async refreshSession(): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(this.baseUrl, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "manual",
        signal: controller.signal,
      });

      const setCookie = response.headers.get("set-cookie");
      if (!setCookie) {
        throw new Error("No session cookie received from Vinted");
      }

      // Extract the _vinted_fr_session cookie
      const sessionMatch = setCookie.match(/(_vinted_fr_session=[^;]+)/);
      if (!sessionMatch) {
        throw new Error("Session cookie not found in response");
      }

      this.session = {
        cookie: sessionMatch[1],
        fetchedAt: Date.now(),
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Check if current session is still valid.
   */
  private isSessionValid(): boolean {
    if (!this.session) return false;
    return Date.now() - this.session.fetchedAt < SESSION_TTL_MS;
  }

  /**
   * Ensure we have a valid session, refreshing if needed.
   */
  private async ensureSession(): Promise<string> {
    if (!this.isSessionValid()) {
      await this.refreshSession();
    }
    if (!this.session) {
      throw new Error("Failed to establish Vinted session");
    }
    return this.session.cookie;
  }

  /**
   * Make an authenticated GET request to the Vinted API.
   */
  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const cookie = await this.ensureSession();

    const url = new URL(`/api/v2${path}`, this.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") {
          url.searchParams.set(key, value);
        }
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Accept: "application/json",
          Cookie: cookie,
        },
        signal: controller.signal,
      });

      if (response.status === 401 || response.status === 403) {
        // Session expired, force refresh and retry once
        this.session = null;
        const newCookie = await this.ensureSession();

        const retryResponse = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            Accept: "application/json",
            Cookie: newCookie,
          },
          signal: controller.signal,
        });

        if (!retryResponse.ok) {
          throw new Error(`Vinted API error: ${retryResponse.status} ${retryResponse.statusText}`);
        }

        return (await retryResponse.json()) as T;
      }

      if (!response.ok) {
        throw new Error(`Vinted API error: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
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
