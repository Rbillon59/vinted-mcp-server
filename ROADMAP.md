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

### Iteration 3: Polish & Distribution (next)
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

## Feature Priority Matrix
| Feature | User Impact | Complexity | Priority | Status |
|---------|------------|------------|----------|--------|
| Search items | Very High | Medium | P0 | ✅ Done |
| Item details | High | Low | P0 | ✅ Done |
| User profiles | Medium | Low | P1 | ✅ Done |
| Advanced filters | High | Medium | P1 | ✅ Done |
| Rate limiting | High (reliability) | Low | P1 | ✅ Done |
| Caching | Medium | Medium | P2 | ✅ Done |
| Docker | Medium | Low | P2 | Planned |
