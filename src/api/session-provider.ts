/**
 * Browser-based session provider for Vinted.
 *
 * Uses puppeteer-extra with the stealth plugin to solve Cloudflare challenges,
 * extract cookies, and return them for use with regular fetch calls.
 * The browser is launched only during session refresh and closed immediately after.
 */

import type { Browser, Page } from "puppeteer";
import {
  buildCookieString,
  hasSessionCookie,
  launchStealthBrowser,
  parseTimeoutEnv,
} from "./browser-utils.js";

const BROWSER_TIMEOUT_MS = 30_000;
const COOKIE_POLL_INTERVAL_MS = 500;

export interface SessionCookies {
  readonly cookie: string;
  readonly fetchedAt: number;
}

export interface SessionProviderConfig {
  readonly timeoutMs?: number;
  readonly executablePath?: string;
}

export interface SessionProvider {
  refreshSession(domain: string): Promise<SessionCookies>;
  destroy(): Promise<void>;
}

function buildConfig(overrides?: SessionProviderConfig): Required<SessionProviderConfig> {
  return {
    timeoutMs: overrides?.timeoutMs ?? parseTimeoutEnv(BROWSER_TIMEOUT_MS),
    executablePath: overrides?.executablePath
      ?? process.env["PUPPETEER_EXECUTABLE_PATH"]
      ?? "",
  };
}

export class BrowserSessionProvider implements SessionProvider {
  private readonly config: Required<SessionProviderConfig>;
  private browser: Browser | null = null;

  constructor(config?: SessionProviderConfig) {
    this.config = buildConfig(config);
  }

  async refreshSession(domain: string): Promise<SessionCookies> {
    const browser = await launchStealthBrowser(this.config.executablePath);
    this.browser = browser;

    try {
      const page = await browser.newPage();
      const cookie = await this.solveChallenge(page, domain);
      return { cookie, fetchedAt: Date.now() };
    } finally {
      await this.closeBrowser();
    }
  }

  async destroy(): Promise<void> {
    await this.closeBrowser();
  }

  private async solveChallenge(page: Page, domain: string): Promise<string> {
    const url = `https://${domain}`;

    await page.goto(url, { waitUntil: "domcontentloaded" });

    const deadline = Date.now() + this.config.timeoutMs;

    while (Date.now() < deadline) {
      const cookies = await page.cookies();

      if (hasSessionCookie(cookies)) {
        return buildCookieString(cookies);
      }

      await new Promise((resolve) => setTimeout(resolve, COOKIE_POLL_INTERVAL_MS));
    }

    throw new Error(
      `Cloudflare challenge not resolved within ${this.config.timeoutMs}ms for ${domain}`
    );
  }

  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      const browser = this.browser;
      this.browser = null;
      try {
        await browser.close();
      } catch {
        // Browser may already be closed — ignore
      }
    }
  }
}

export function createSessionProvider(config?: SessionProviderConfig): SessionProvider {
  return new BrowserSessionProvider(config);
}
