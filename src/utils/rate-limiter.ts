/**
 * Token bucket rate limiter.
 * Prevents overwhelming the Vinted API with too many requests.
 */

export class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per ms
  private lastRefill: number;

  /**
   * @param maxRequests Maximum burst size
   * @param windowMs Time window in milliseconds for the max requests
   */
  constructor(maxRequests: number, windowMs: number) {
    this.maxTokens = maxRequests;
    this.tokens = maxRequests;
    this.refillRate = maxRequests / windowMs;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  /**
   * Wait until a token is available, then consume it.
   * Returns immediately if tokens are available.
   */
  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Calculate wait time for next token
    const waitMs = Math.ceil((1 - this.tokens) / this.refillRate);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    this.refill();

    // Guard against timer imprecision
    if (this.tokens < 1) {
      return this.acquire();
    }
    this.tokens -= 1;
  }
}
