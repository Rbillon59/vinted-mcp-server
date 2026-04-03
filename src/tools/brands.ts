import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../api/client.js";
import type { VintedBrandSearchResponse } from "../api/types.js";
import { mcpError } from "../utils/mcp-error.js";

function formatBrands(data: VintedBrandSearchResponse, query: string): string {
  if (data.brands.length === 0) {
    return `No brands found matching "${query}".`;
  }

  const header = `Brands matching "${query}":\n`;
  const brands = data.brands.map((brand) => {
    const parts = [`- **${brand.title}** (ID: ${brand.id})`];
    parts[0] += ` — ${brand.item_count} items`;
    if (brand.is_luxury) parts[0] += " [Luxury]";
    return parts.join("");
  });

  return header + brands.join("\n");
}

export function registerBrandsTool(server: McpServer): void {
  server.tool(
    "search_brands",
    "Search for Vinted brand IDs by name. Use the returned IDs with the brand_ids filter in search_items.",
    {
      query: z.string().min(1).describe("Brand name to search for (e.g., 'Nike', 'Zara')"),
    },
    async (params) => {
      try {
        const data = await getClient().get<VintedBrandSearchResponse>(
          "/brands",
          { keyword: params.query }
        );
        const text = formatBrands(data, params.query);

        return {
          content: [{ type: "text" as const, text }],
        };
      } catch (error: unknown) {
        return mcpError("Failed to search brands", error);
      }
    }
  );
}
