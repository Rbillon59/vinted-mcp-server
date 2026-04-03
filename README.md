# vinted-mcp-server

[![CI](https://github.com/Rbillon59/vinted-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/Rbillon59/vinted-mcp-server/actions/workflows/ci.yml)

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for interacting with the Vinted marketplace. Enables AI assistants to search, browse, and discover second-hand items on Vinted.

## Features

- **Search items** — Full-text search with filters (price, brand, size, color, condition, sort)
- **Item details** — Full item info including description, photos, seller profile, and condition
- **User profiles** — Seller ratings, reviews, item counts, and activity
- **User items** — Browse all items listed by a specific user
- **Brand search** — Find brand IDs for use in search filters
- **Categories** — Browse the Vinted category tree
- **Rate limiting** — Token bucket rate limiter to avoid API bans
- **Caching** — In-memory LRU cache with TTL for fast repeated queries
- **Retry logic** — Exponential backoff for transient errors
- **Session management** — Puppeteer-based with Cloudflare bypass
- **Token-efficient** — Concise markdown responses optimized for LLM consumption

## Quick Start

### Prerequisites
- Node.js 20+

### Using npx (zero-install)

This server communicates via **stdio** (JSON-RPC) and is designed to be launched by an MCP client, not run directly in a terminal. Configure it in your MCP client as shown below.

### Install from source

```bash
git clone https://github.com/Rbillon59/vinted-mcp-server.git
cd vinted-mcp-server
npm install
npm run build
```

### Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "vinted": {
      "command": "npx",
      "args": ["vinted-mcp-server"],
      "env": {
        "VINTED_DOMAIN": "www.vinted.fr"
      }
    }
  }
}
```

<details>
<summary>Alternative: using a local build</summary>

```json
{
  "mcpServers": {
    "vinted": {
      "command": "node",
      "args": ["/absolute/path/to/vinted-mcp-server/dist/index.js"],
      "env": {
        "VINTED_DOMAIN": "www.vinted.fr"
      }
    }
  }
}
```
</details>

### Usage with Claude Code CLI

Add to your Claude Code settings (`~/.claude/settings.json` or project `.mcp.json`):

```json
{
  "mcpServers": {
    "vinted": {
      "command": "npx",
      "args": ["vinted-mcp-server"],
      "env": {
        "VINTED_DOMAIN": "www.vinted.fr"
      }
    }
  }
}
```

### Usage with Cursor

Add to `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "vinted": {
      "command": "npx",
      "args": ["vinted-mcp-server"]
    }
  }
}
```

### Usage with Docker

```bash
docker build -t vinted-mcp-server .
docker run -i --rm -e VINTED_DOMAIN=www.vinted.fr vinted-mcp-server
```

## Available Tools

### `search_items`
Search the Vinted catalog with filters.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | *(required)* | Search text (e.g., "nike air max", "robe vintage") |
| `page` | number | 1 | Page number |
| `per_page` | number | 20 | Results per page (max: 96) |
| `order` | string | "relevance" | Sort: `relevance`, `price_low_to_high`, `price_high_to_low`, `newest_first` |
| `price_from` | number | — | Minimum price filter |
| `price_to` | number | — | Maximum price filter |
| `brand_ids` | string | — | Brand IDs (comma-separated) |
| `size_ids` | string | — | Size IDs (comma-separated) |
| `color_ids` | string | — | Color IDs (comma-separated) |
| `catalog_ids` | string | — | Category IDs (comma-separated) |
| `status_ids` | string | — | Condition: `6`=New with tags, `1`=New, `2`=Very good, `3`=Good, `4`=Satisfactory |

### `get_item_details`
Get detailed information about a specific item.

| Parameter | Type | Description |
|-----------|------|-------------|
| `item_id` | number | The Vinted item ID (from search results) |

Returns: title, price, description, brand, size, condition, colors, seller info (rating, location), photos, stats (views, favorites).

### `get_user_profile`
Get a seller's profile information.

| Parameter | Type | Description |
|-----------|------|-------------|
| `user_id` | number | The Vinted user ID (from search results or item details) |

Returns: username, rating, review breakdown, items listed/sold, location, member since, last active.

### `get_user_items`
Browse all items listed by a specific user.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `user_id` | number | *(required)* | The Vinted user ID |
| `page` | number | 1 | Page number |
| `per_page` | number | 20 | Results per page |

### `search_brands`
Search for brand names and get their IDs for use in search filters.

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | Brand name to search (e.g., "Nike", "Zara") |

### `get_categories`
Browse the Vinted category tree.

| Parameter | Type | Description |
|-----------|------|-------------|
| `parent_id` | number | *(optional)* Parent category ID to list children of |

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `VINTED_DOMAIN` | `www.vinted.fr` | Vinted domain (e.g., `www.vinted.de`, `www.vinted.es`, `www.vinted.it`) |
| `PUPPETEER_EXECUTABLE_PATH` | — | Custom Chrome/Chromium path for Puppeteer |
| `BROWSER_TIMEOUT_MS` | `30000` | Timeout for Cloudflare challenge resolution (ms) |

### Supported Domains
| Domain | Country |
|--------|---------|
| `www.vinted.fr` | France |
| `www.vinted.de` | Germany |
| `www.vinted.es` | Spain |
| `www.vinted.it` | Italy |
| `www.vinted.nl` | Netherlands |
| `www.vinted.be` | Belgium |
| `www.vinted.pl` | Poland |
| `www.vinted.pt` | Portugal |
| `www.vinted.lt` | Lithuania |
| `www.vinted.cz` | Czech Republic |
| `www.vinted.co.uk` | United Kingdom |

## Architecture

```
src/
  index.ts              # Entry point, stdio transport
  server.ts             # MCP server config & tool registration
  tools/
    search.ts           # search_items tool
    item.ts             # get_item_details tool
    user.ts             # get_user_profile tool
    user-items.ts       # get_user_items tool
    brands.ts           # search_brands tool
    categories.ts       # get_categories tool
  api/
    client.ts           # HTTP client (session, cache, rate limit, retry)
    session-provider.ts # Browser-based session (Cloudflare bypass)
    browser-utils.ts    # Shared Puppeteer/stealth utilities
    types.ts            # Vinted API response types
  utils/
    cache.ts            # TTL cache with LRU eviction
    rate-limiter.ts     # Token bucket rate limiter
    mcp-error.ts        # Shared MCP error response builder
```

### Reliability Features
- **Rate limiting**: Token bucket (10 req/10s) prevents API bans
- **Caching**: LRU cache (3min TTL, 200 entries max) reduces redundant requests
- **Retry**: Exponential backoff (1s, 2s) on 429/5xx errors
- **Session recovery**: Automatic cookie refresh on 401/403 with request coalescing
- **Request deduplication**: Concurrent identical requests share a single API call
- **Cloudflare bypass**: Puppeteer with stealth plugin for session acquisition

## License

MIT
