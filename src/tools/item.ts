import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../api/client.js";
import type { VintedItemDetail } from "../api/types.js";

function formatItemDetail(data: VintedItemDetail): string {
  const { item } = data;
  const lines = [
    `# ${item.title}`,
    `**Price:** ${item.price} ${item.currency}`,
  ];

  if (item.brand_title) lines.push(`**Brand:** ${item.brand_title}`);
  if (item.size_title) lines.push(`**Size:** ${item.size_title}`);
  if (item.condition) lines.push(`**Condition:** ${item.condition}`);
  if (item.color1) {
    const colors = [item.color1, item.color2].filter(Boolean).join(", ");
    lines.push(`**Color:** ${colors}`);
  }
  lines.push(`**Status:** ${item.status}`);
  lines.push("");

  if (item.description) {
    lines.push(`## Description`);
    lines.push(item.description);
    lines.push("");
  }

  lines.push(`## Seller`);
  lines.push(`- **Username:** ${item.user.login}`);
  lines.push(`- **Rating:** ${item.user.feedback_reputation}/5 (${item.user.feedback_count} reviews)`);
  if (item.user.city || item.user.country_title) {
    lines.push(`- **Location:** ${[item.user.city, item.user.country_title].filter(Boolean).join(", ")}`);
  }
  lines.push("");

  lines.push(`## Stats`);
  lines.push(`- Views: ${item.view_count} | Favorites: ${item.favourite_count}`);
  lines.push(`- Listed: ${item.created_at_ts}`);
  lines.push("");

  if (item.photos.length > 0) {
    lines.push(`## Photos (${item.photos.length})`);
    item.photos.forEach((photo, i) => {
      lines.push(`${i + 1}. ${photo.url}`);
    });
    lines.push("");
  }

  lines.push(`**URL:** ${item.url}`);

  return lines.join("\n");
}

export function registerItemTool(server: McpServer): void {
  server.tool(
    "get_item_details",
    "Get detailed information about a specific Vinted item including description, photos, seller info, and condition.",
    {
      item_id: z.number().int().positive().describe("The Vinted item ID (from search results)"),
    },
    async (params) => {
      try {
        const data = await getClient().get<VintedItemDetail>(`/items/${params.item_id}`);
        const text = formatItemDetail(data);

        return {
          content: [{ type: "text" as const, text }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Failed to get item details: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
