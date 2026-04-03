# Roadmap - Vinted MCP Server

## Vision
Provide a seamless, secure, and efficient MCP interface to Vinted, enabling AI assistants to help users search, browse, and discover items on the marketplace.

## Iterations

### Iteration 1: Foundation ✅
- [x] CLAUDE.md with project instructions
- [x] ROADMAP.md
- [x] Project setup (package.json, tsconfig, eslint)
- [x] Basic MCP server skeleton with stdio transport
- [x] Project structure
- [x] Vinted HTTP client with session management
- [x] Cookie handling with flexible regex
- [x] `search_items` tool with full filter support
- [x] Response formatting (concise, token-efficient)
- [x] Zod input validation

### Iteration 2: Tools & Reliability ✅
- [x] `get_item_details` tool - full item information with photos
- [x] `get_user_profile` tool - seller information & ratings
- [x] Rate limiting (token bucket, 10 req/10s)
- [x] Response caching (TTL cache with LRU eviction)
- [x] Retry with exponential backoff (2 retries)
- [x] Session auto-recovery (coalesced refresh)
- [x] Request deduplication (thundering herd prevention)
- [x] Connection leak prevention (body consumption on retry)

### Iteration 3: Auth & Cloudflare Bypass ✅
- [x] Puppeteer with stealth plugin to bypass Cloudflare challenges
- [x] Anonymous browser session provider (BrowserSessionProvider)
- [x] Authenticated session via headless browser login (AuthenticatedSessionProvider)
- [x] Shared Puppeteer/stealth utilities (browser-utils.ts)
- [x] Auth config with Zod validation (VINTED_EMAIL / VINTED_PASSWORD)
- [x] `add_favorite` authenticated tool (conditionally registered)
- [x] `get_user_items` tool — browse user wardrobes
- [x] `search_brands` tool — brand lookup
- [x] `get_categories` tool — category tree

### Iteration 4: API Hardening & Scraping ✅
- [x] HTML scraping for `get_item_details` (JSON API unavailable, replaced with JSON-LD + RSC plugin extraction)
- [x] `getHtml()` method on VintedClient with caching, rate limiting, retry, and session recovery
- [x] `mcpError()` shared utility — DRY error handling across all 7 tools
- [x] `formatPrice()` utility for flexible price formats (`string | VintedPrice`)
- [x] Wardrobe endpoint fix (`/wardrobe/{id}/items` replaces `/users/{id}/items`)
- [x] API headers hardening (Referer, Origin added to all requests)
- [x] Unified `VintedSearchResponse` type (removed `VintedUserItemsResponse` and `VintedItemDetail`)
- [x] Cache cleanup on `destroy()`

### Iteration 5: Polish & Distribution (next)
- [ ] Comprehensive README with setup instructions
- [ ] MCP client configuration examples (Claude Desktop, Cursor, etc.)
- [ ] Dockerfile for containerized deployment
- [ ] npx support for zero-install usage
- [ ] CI/CD with GitHub Actions

### Future
- [ ] Additional Vinted domains auto-detection
- [ ] Structured error codes for better LLM understanding
- [ ] Webhook/notification support
- [ ] Price history tracking
- [ ] Cart/bundle features
- [ ] More authenticated tools

## Feature Priority Matrix
| Feature | User Impact | Complexity | Priority | Status |
|---------|------------|------------|----------|--------|
| Search items | Very High | Medium | P0 | ✅ Done |
| Item details | High | Medium | P0 | ✅ Done (HTML scraping) |
| User profiles | Medium | Low | P1 | ✅ Done |
| Advanced filters | High | Medium | P1 | ✅ Done |
| Rate limiting | High (reliability) | Low | P1 | ✅ Done |
| Caching | Medium | Medium | P2 | ✅ Done |
| Cloudflare bypass | High (reliability) | High | P1 | ✅ Done |
| Auth & favorites | Medium | High | P2 | ✅ Done |
| User wardrobe | Medium | Low | P1 | ✅ Done |
| Brand search | Low | Low | P2 | ✅ Done |
| Categories | Low | Low | P2 | ✅ Done |
| Docker | Medium | Low | P2 | Planned |
