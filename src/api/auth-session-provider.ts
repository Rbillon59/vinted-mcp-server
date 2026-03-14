/**
 * Authenticated session provider for Vinted.
 *
 * Uses Puppeteer with stealth plugin to perform a real login flow,
 * then extracts cookies for use with authenticated API requests.
 */

import type { Browser, Page } from "puppeteer";
import type { AuthConfig } from "../config/auth.js";
import type { SessionCookies, SessionProvider, SessionProviderConfig } from "./session-provider.js";
import {
  buildCookieString,
  hasSessionCookie,
  launchStealthBrowser,
  parseTimeoutEnv,
} from "./browser-utils.js";

const AUTH_TIMEOUT_MS = 60_000;
const TYPING_DELAY_MS = 75;
const SELECTOR_TIMEOUT_MS = 15_000;

/** Selectors for the login flow — ordered by priority for cascading fallback. */
const EMAIL_SELECTORS = [
  "[data-testid='auth-email-input']",
  "input[type='email']",
  "input[name='email']",
  "#email",
] as const;

const PASSWORD_SELECTORS = [
  "[data-testid='auth-password-input']",
  "input[type='password']",
  "input[name='password']",
  "#password",
] as const;

const SUBMIT_SELECTORS = [
  "[data-testid='auth-submit-button']",
  "button[type='submit']",
  "form button",
] as const;

/** Selectors for error messages displayed after a failed login attempt. */
const ERROR_SELECTORS = [
  "[data-testid='auth-error-message']",
  ".notification--error",
  "[role='alert']",
  ".c-alert--error",
] as const;

interface AuthSessionConfig {
  readonly timeoutMs: number;
  readonly executablePath: string;
}

function buildAuthConfig(overrides?: SessionProviderConfig): AuthSessionConfig {
  return {
    timeoutMs: overrides?.timeoutMs ?? parseTimeoutEnv(AUTH_TIMEOUT_MS),
    executablePath: overrides?.executablePath
      ?? process.env["PUPPETEER_EXECUTABLE_PATH"]
      ?? "",
  };
}

export class AuthenticatedSessionProvider implements SessionProvider {
  private readonly config: AuthSessionConfig;
  private readonly credentials: AuthConfig;
  private browser: Browser | null = null;

  constructor(credentials: AuthConfig, config?: SessionProviderConfig) {
    this.config = buildAuthConfig(config);
    this.credentials = credentials;
  }

  async refreshSession(domain: string): Promise<SessionCookies> {
    const browser = await launchStealthBrowser(this.config.executablePath);
    this.browser = browser;

    try {
      const page = await browser.newPage();
      const cookie = await this.performLogin(page, domain);
      return { cookie, fetchedAt: Date.now() };
    } finally {
      await this.closeBrowser();
    }
  }

  async destroy(): Promise<void> {
    await this.closeBrowser();
  }

  private async performLogin(page: Page, domain: string): Promise<string> {
    const loginUrl = `https://${domain}/member/login`;
    await page.goto(loginUrl, { waitUntil: "networkidle2" });

    // Fill email
    const emailEl = await this.findElement(page, EMAIL_SELECTORS);
    if (!emailEl) {
      throw new Error("Could not find email input on Vinted login page");
    }
    await emailEl.type(this.credentials.email, { delay: TYPING_DELAY_MS });

    // Check if password field is already visible (single-page form)
    const passwordAlreadyVisible = await page.$(PASSWORD_SELECTORS[1] ?? PASSWORD_SELECTORS[0]);

    if (!passwordAlreadyVisible) {
      // Two-step flow: click "Continue" then wait for password field
      const continueButton = await this.findElement(page, SUBMIT_SELECTORS);
      if (continueButton) {
        await continueButton.click();
      }
      await this.waitForAnySelector(page, PASSWORD_SELECTORS);
    }

    // Fill password
    const passwordEl = await this.findElement(page, PASSWORD_SELECTORS);
    if (!passwordEl) {
      throw new Error("Could not find password input on Vinted login page");
    }
    await passwordEl.type(this.credentials.password, { delay: TYPING_DELAY_MS });

    // Submit login
    const submitButton = await this.findElement(page, SUBMIT_SELECTORS);
    if (!submitButton) {
      throw new Error("Could not find submit button on Vinted login page");
    }
    await submitButton.click();

    // Wait for login result: either session cookie or error message
    return this.waitForAuthResult(page);
  }

  private async waitForAnySelector(
    page: Page,
    selectors: ReadonlyArray<string>,
  ): Promise<void> {
    const racePromises = selectors.map((s) =>
      page.waitForSelector(s, { timeout: SELECTOR_TIMEOUT_MS }).catch(() => null)
    );
    const result = await Promise.any(racePromises.map((p) =>
      p.then((el) => {
        if (el) return el;
        throw new Error("not found");
      })
    )).catch(() => null);

    if (!result) {
      throw new Error("Password field did not appear after clicking Continue");
    }
  }

  private async findElement(
    page: Page,
    selectors: ReadonlyArray<string>,
  ): Promise<Awaited<ReturnType<Page["$"]>> | null> {
    for (const selector of selectors) {
      try {
        const el = await page.waitForSelector(selector, { timeout: SELECTOR_TIMEOUT_MS });
        if (el) return el;
      } catch {
        // Selector not found, try next
      }
    }
    return null;
  }

  private async waitForAuthResult(page: Page): Promise<string> {
    const deadline = Date.now() + this.config.timeoutMs;
    const pollIntervalMs = 500;

    while (Date.now() < deadline) {
      await this.checkForLoginErrors(page);

      const cookies = await page.cookies();
      if (hasSessionCookie(cookies)) {
        return buildCookieString(cookies);
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(
      `Login did not complete within ${this.config.timeoutMs}ms. ` +
      "This may indicate 2FA/captcha is required, which is not supported."
    );
  }

  private async checkForLoginErrors(page: Page): Promise<void> {
    try {
      const selectors = ERROR_SELECTORS.join(", ");
      const errorText = await page.evaluate((sel: string) => {
        const el = document.querySelector(sel);
        return el?.textContent?.trim() ?? "";
      }, selectors);

      if (errorText.length > 0) {
        throw new Error(
          "Vinted login failed: invalid credentials or account issue. " +
          "Check VINTED_EMAIL and VINTED_PASSWORD."
        );
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("Vinted login failed")) {
        throw error;
      }
      // Ignore evaluation errors (page may be navigating)
    }
  }

  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      const browser = this.browser;
      this.browser = null;
      try {
        await browser.close();
      } catch {
        // Browser may already be closed
      }
    }
  }
}
