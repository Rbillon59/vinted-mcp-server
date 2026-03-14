/**
 * Shared browser constants and utilities for session providers.
 */

import type { Browser } from "puppeteer";

export const BROWSER_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--disable-extensions",
  "--disable-background-networking",
  "--disable-sync",
  "--no-first-run",
] as const;

/** Cookie names that indicate a successful Vinted session. */
export const SESSION_COOKIE_REGEX = /^_vinted_\w+_session$/;
export const ACCESS_TOKEN_COOKIE = "access_token_web";

/** Additional cookies to include in API requests. */
export const EXTRA_COOKIE_NAMES = [
  "anon_id",
  "anonymous-locale",
  "v_udt",
  "__cf_bm",
] as const;

export function buildCookieString(
  cookies: ReadonlyArray<{ name: string; value: string }>,
): string {
  const extraSet = new Set<string>(EXTRA_COOKIE_NAMES);
  const parts: string[] = [];

  for (const cookie of cookies) {
    const isSession =
      cookie.name === ACCESS_TOKEN_COOKIE
      || SESSION_COOKIE_REGEX.test(cookie.name);
    const isExtra = extraSet.has(cookie.name);

    if (isSession || isExtra) {
      parts.push(`${cookie.name}=${cookie.value}`);
    }
  }

  if (parts.length === 0) {
    throw new Error("No usable cookies found after session resolution");
  }

  return parts.join("; ");
}

export function hasSessionCookie(
  cookies: ReadonlyArray<{ name: string; value: string }>,
): boolean {
  return cookies.some(
    (c) => c.name === ACCESS_TOKEN_COOKIE || SESSION_COOKIE_REGEX.test(c.name),
  );
}

export async function launchStealthBrowser(
  executablePath: string,
): Promise<Browser> {
  const puppeteerExtraMod = (await import("puppeteer-extra")) as unknown as {
    default: {
      use: (plugin: unknown) => void;
      launch: (opts: Record<string, unknown>) => Promise<Browser>;
    };
  };
  const stealthMod = (await import("puppeteer-extra-plugin-stealth")) as unknown as {
    default: () => unknown;
  };

  const puppeteer = puppeteerExtraMod.default;
  puppeteer.use(stealthMod.default());

  const launchOptions: Record<string, unknown> = {
    headless: true,
    args: [...BROWSER_ARGS],
  };
  if (executablePath) {
    launchOptions["executablePath"] = executablePath;
  }

  return puppeteer.launch(launchOptions);
}

export function parseTimeoutEnv(fallback: number): number {
  const envTimeout = process.env["BROWSER_TIMEOUT_MS"];
  if (!envTimeout) return fallback;
  const parsed = parseInt(envTimeout, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
