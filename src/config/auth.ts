/**
 * Authentication configuration.
 *
 * Reads VINTED_EMAIL and VINTED_PASSWORD from the environment.
 * When both are present, authenticated tools (favorite, follow, etc.) become available.
 */

import { z } from "zod";

const AuthConfigSchema = z.object({
  email: z.string().email("VINTED_EMAIL must be a valid email address"),
  password: z.string().min(1, "VINTED_PASSWORD must not be empty"),
});

export type AuthConfig = z.infer<typeof AuthConfigSchema>;

let cachedConfig: AuthConfig | null | undefined;

/**
 * Returns validated auth credentials, or null if neither env var is set.
 * Throws if only one of the two is provided (likely misconfiguration).
 */
export function getAuthConfig(): AuthConfig | null {
  if (cachedConfig !== undefined) {
    return cachedConfig;
  }

  const email = process.env["VINTED_EMAIL"]?.trim() ?? "";
  const password = process.env["VINTED_PASSWORD"] ?? "";

  const hasEmail = email.length > 0;
  const hasPassword = password.length > 0;

  if (!hasEmail && !hasPassword) {
    cachedConfig = null;
    return null;
  }

  if (hasEmail !== hasPassword) {
    throw new Error(
      "Both VINTED_EMAIL and VINTED_PASSWORD must be set together. " +
      `Currently ${hasEmail ? "VINTED_EMAIL" : "VINTED_PASSWORD"} is missing.`
    );
  }

  const result = AuthConfigSchema.safeParse({ email, password });
  if (!result.success) {
    throw new Error(
      `Invalid auth configuration: ${result.error.issues.map((i) => i.message).join(", ")}`
    );
  }

  cachedConfig = Object.freeze(result.data);
  return cachedConfig;
}

export function isAuthEnabled(): boolean {
  return getAuthConfig() !== null;
}
