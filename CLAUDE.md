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
  tools/            # MCP tool implementations
  api/              # Vinted API client
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

## Memory (updated each iteration)

### Current State
- **Iteration**: 0 (project initialization)
- **Status**: Setting up foundation
- **Next**: Implement core API client and search tool
