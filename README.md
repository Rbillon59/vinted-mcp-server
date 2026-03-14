# vinted-mcp-server

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for interacting with the Vinted marketplace. Enables AI assistants to search, browse, and discover items on Vinted.

## Features

- **Search items** — Full-text search with filters (price, brand, size, color, condition)
- **Sort results** — By relevance, price, or newest
- **Pagination** — Browse through large result sets
- **Session management** — Automatic cookie-based authentication
- **Token-efficient** — Concise responses optimized for LLM consumption

## Quick Start

### Prerequisites
- Node.js 20+

### Installation

```bash
npm install
npm run build
```

### Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "vinted": {
      "command": "node",
      "args": ["/path/to/vinted-mcp-server/dist/index.js"],
      "env": {
        "VINTED_DOMAIN": "www.vinted.fr"
      }
    }
  }
}
```

### Available Tools

#### `search_items`
Search the Vinted catalog with filters.

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | Search text (required) |
| `page` | number | Page number (default: 1) |
| `per_page` | number | Results per page (default: 20, max: 96) |
| `order` | string | Sort: relevance, price_low_to_high, price_high_to_low, newest_first |
| `price_from` | number | Minimum price |
| `price_to` | number | Maximum price |
| `brand_ids` | string | Brand IDs (comma-separated) |
| `size_ids` | string | Size IDs (comma-separated) |
| `color_ids` | string | Color IDs (comma-separated) |
| `status_ids` | string | Condition: 6=New with tags, 1=New, 2=Very good, 3=Good, 4=Satisfactory |

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `VINTED_DOMAIN` | `www.vinted.fr` | Vinted domain (e.g., `www.vinted.de`, `www.vinted.es`) |

## License

MIT
