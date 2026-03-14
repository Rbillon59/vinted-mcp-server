# Roadmap - Vinted MCP Server

## Vision
Provide a seamless, secure, and efficient MCP interface to Vinted, enabling AI assistants to help users search, browse, and discover items on the marketplace.

## Iterations

### Iteration 1: Foundation ✅ (in progress)
- [x] CLAUDE.md with project instructions
- [x] ROADMAP.md
- [x] Project setup (package.json, tsconfig, eslint)
- [x] Basic MCP server skeleton with stdio transport
- [x] Project structure

### Iteration 2: Core API & Search (planned)
- [ ] Vinted HTTP client with session management
- [ ] Cookie/CSRF token handling
- [ ] `search_items` tool - search the Vinted catalog
- [ ] Response formatting (concise, token-efficient)
- [ ] Basic error handling and timeouts

### Iteration 3: Item & User Tools (planned)
- [ ] `get_item_details` tool - full item information
- [ ] `get_user_profile` tool - seller information
- [ ] Input validation with zod schemas
- [ ] Improved error messages

### Iteration 4: Reliability & Performance (planned)
- [ ] Rate limiting (respect Vinted's limits)
- [ ] Response caching (in-memory TTL cache)
- [ ] Circuit breaker for API calls
- [ ] Session auto-recovery
- [ ] Retry with exponential backoff

### Iteration 5: Advanced Features (planned)
- [ ] Advanced search filters (brand, size, price range, condition)
- [ ] Sort options (relevance, price, newest)
- [ ] Pagination support
- [ ] `get_item_photos` tool - item image URLs

### Iteration 6: Polish & Documentation (planned)
- [ ] Comprehensive README with setup instructions
- [ ] MCP client configuration examples
- [ ] Docker support
- [ ] CI/CD pipeline
- [ ] npm publish configuration

## Feature Priority Matrix
| Feature | User Impact | Complexity | Priority |
|---------|------------|------------|----------|
| Search items | Very High | Medium | P0 |
| Item details | High | Low | P0 |
| User profiles | Medium | Low | P1 |
| Advanced filters | High | Medium | P1 |
| Caching | Medium | Medium | P2 |
| Rate limiting | High (reliability) | Low | P1 |
| Docker | Medium | Low | P2 |
