import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../api/client.js";
import type { VintedUserItemsResponse } from "../api/types.js";

function formatUserItems(data: VintedUserItemsResponse, userId: number): string {
  if (data.items.length === 0) {
    return `User ${userId} has no items listed.`;
  }

  const { pagination } = data;
  const header = `User ${userId} — ${pagination.total_entries} items (page ${pagination.current_page}/${pagination.total_pages}):\n`;

  const items = data.items.map((item) => {
    const parts = [
      `- **${item.title}** — ${item.price} ${item.currency}`,
    ];
    if (item.brand_title) parts[0] += ` | ${item.brand_title}`;
    if (item.size_title) parts[0] += ` | Size: ${item.size_title}`;
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
        const data = await getClient().get<VintedUserItemsResponse>(
          `/users/${params.user_id}/items`,
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
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Failed to get user items: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
