import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../api/client.js";
import { type VintedSearchResponse, formatPrice } from "../api/types.js";
import { mcpError } from "../utils/mcp-error.js";

function formatUserItems(data: VintedSearchResponse, userId: number): string {
  if (data.items.length === 0) {
    return `User ${userId} has no items listed.`;
  }

  const { pagination } = data;
  const header = `User ${userId} — ${pagination.total_entries} items (page ${pagination.current_page}/${pagination.total_pages}):\n`;

  const items = data.items.map((item) => {
    const price = formatPrice(item.price, item.currency);
    const brand = item.brand_title ?? item.brand ?? "";
    const size = item.size_title ?? item.size ?? "";
    const parts = [
      `- **${item.title}** — ${price}`,
    ];
    if (brand) parts[0] += ` | ${brand}`;
    if (size) parts[0] += ` | Size: ${size}`;
    parts.push(`  ID: ${item.id} | ${item.url}`);
    return parts.join("\n");
  });

  return header + items.join("\n");
}

export function registerUserItemsTool(server: McpServer): void {
  server.tool(
    "get_user_items",
    "List items currently for sale by a specific Vinted user/seller.",
    {
      user_id: z.number().int().positive().describe("The Vinted user ID"),
      page: z.number().int().min(1).max(100).default(1).describe("Page number (default: 1)"),
      per_page: z.number().int().min(1).max(96).default(20).describe("Results per page (default: 20, max: 96)"),
      order: z.enum(["relevance", "price_low_to_high", "price_high_to_low", "newest_first"]).default("newest_first").describe("Sort order"),
    },
    async (params) => {
      try {
        const data = await getClient().get<VintedSearchResponse>(
          `/wardrobe/${params.user_id}/items`,
          {
            page: String(params.page),
            per_page: String(params.per_page),
            order: params.order,
          }
        );
        const text = formatUserItems(data, params.user_id);

        return {
          content: [{ type: "text" as const, text }],
        };
      } catch (error: unknown) {
        return mcpError("Failed to get user items", error);
      }
    },
  );
}
