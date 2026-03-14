# CLAUDE.md - Vinted MCP Server

## Project Overview
State-of-the-art MCP (Model Context Protocol) server for Vinted, enabling AI assistants to search, browse, and interact with the Vinted marketplace.

## Architecture
- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js 20+
- **Protocol**: MCP via `@modelcontextprotocol/sdk`
- **Transport**: stdio (standard MCP transport)
- **API**: Vinted web API (unofficial, cookie-based session)

## Development Rules

### Process
- All changes go through PRs on the repo
- Each PR must be self-reviewed before merge
- Each PR must be simplified (remove unnecessary complexity)
- Update ROADMAP.md after each iteration
- Update this CLAUDE.md memory section after each iteration

### Quality Principles
1. **Security**: No credential leaks, input sanitization, safe HTTP handling
2. **Efficiency**: Minimal memory footprint, token-conscious responses, low CPU usage
3. **Error Handling**: Graceful degradation, meaningful error messages, retry logic
4. **Reliability**: Circuit breaker patterns, timeout management, session recovery
5. **Performance**: Response caching, connection reuse, lazy loading
6. **Impact**: Prioritize features users need most (search > details > favorites)

### Code Standards
- Strict TypeScript, no `any` types
- All errors must be caught and handled meaningfully
- Keep tool responses concise (token efficiency for LLM consumers)
- Use zod for input validation
- No secrets in code - all config via environment variables

## Project Structure
```
src/
  index.ts          # Entry point, MCP server setup
  server.ts         # Server configuration and tool registration
  config/
    auth.ts         # Auth configuration (VINTED_EMAIL / VINTED_PASSWORD)
  tools/            # MCP tool implementations (search, item, user, user-items, brands, categories, favorite)
  api/
    client.ts       # HTTP client (session, cache, rate limit, retry)
    session-provider.ts        # Anonymous browser session (Cloudflare bypass)
    auth-session-provider.ts   # Authenticated session via Puppeteer login
    browser-utils.ts           # Shared Puppeteer/stealth utilities
    types.ts        # Vinted API response types
  utils/            # Shared utilities (cache, rate-limiter, etc.)
```

## Commands
- `npm run build` - Compile TypeScript
- `npm run start` - Run the server
- `npm run dev` - Development mode with watch
- `npm run lint` - ESLint check
- `npm run lint:fix` - ESLint fix

## Environment Variables
- `VINTED_DOMAIN` - Vinted domain to use (default: `www.vinted.fr`)
- `VINTED_EMAIL` - Vinted account email (optional, enables authenticated tools)
- `VINTED_PASSWORD` - Vinted account password (required if `VINTED_EMAIL` is set)
- `PUPPETEER_EXECUTABLE_PATH` - Custom Chrome/Chromium path for Puppeteer (optional)
- `BROWSER_TIMEOUT_MS` - Timeout for Cloudflare challenge resolution in ms (default: `30000`)

## Memory (updated each iteration)

### Current State
- **Iteration**: 3 (auth & Cloudflare bypass complete)
- **Status**: 7 tools (6 read-only + 1 authenticated), Puppeteer-based sessions, Cloudflare bypass
- **Next**: Cart/bundle features, more authenticated tools

### Key Decisions
- Cookie regex uses `_vinted_\w+_session` to support all Vinted domains
- Rate limit set conservatively at 10 req/10s to avoid bans
- Cache TTL 3 minutes, max 200 entries, LRU eviction
- Session refresh coalesced via shared promise to prevent stampede
- In-flight request deduplication prevents thundering herd
- Response bodies consumed on retry to prevent connection leaks
- Puppeteer with stealth plugin to bypass Cloudflare challenges
- Auth via headless browser login (supports two-step email/password flow)
- Authenticated tools conditionally registered only when credentials are configured
- 2FA/captcha not supported — login timeout throws explicit error

### Architecture Notes
- Singleton VintedClient with built-in caching/rate-limiting
- Each tool in its own file with `register*Tool(server)` pattern
- Error handling per-tool (try/catch returning MCP error format)
- SessionProvider interface with two implementations: BrowserSessionProvider (anonymous) and AuthenticatedSessionProvider (login)
- Auth config validated with Zod, cached after first read, frozen for immutability
