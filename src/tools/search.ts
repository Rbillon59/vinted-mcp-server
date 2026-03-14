import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../api/client.js";
import type { VintedSearchResponse } from "../api/types.js";

/**
 * Format search results for concise LLM consumption.
 * Keeps output token-efficient while being informative.
 */
function formatSearchResults(data: VintedSearchResponse): string {
  if (data.items.length === 0) {
    return "No items found matching your search criteria.";
  }

  const { pagination } = data;
  const header = `Found ${pagination.total_entries} items (page ${pagination.current_page}/${pagination.total_pages}):\n`;

  const items = data.items.map((item) => {
    const parts = [
      `- **${item.title}** — ${item.price} ${item.currency}`,
    ];
    if (item.brand_title) parts[0] += ` | ${item.brand_title}`;
    if (item.size_title) parts[0] += ` | Size: ${item.size_title}`;
    parts.push(`  Seller: ${item.user.login} | ❤ ${item.favourite_count} | 👁 ${item.view_count}`);
    parts.push(`  ${item.url}`);
    parts.push(`  ID: ${item.id}`);
    return parts.join("\n");
  });

  return header + items.join("\n\n");
}

export function registerSearchTool(server: McpServer): void {
  server.tool(
    "search_items",
    "Search for items on the Vinted marketplace. Returns a list of items matching the query with prices, brands, sizes, and seller info.",
    {
      query: z.string().min(1).describe("Search query (e.g., 'nike air max', 'robe vintage')"),
      page: z.number().int().min(1).max(100).default(1).describe("Page number (default: 1)"),
      per_page: z.number().int().min(1).max(96).default(20).describe("Results per page (default: 20, max: 96)"),
      order: z.enum(["relevance", "price_low_to_high", "price_high_to_low", "newest_first"]).default("relevance").describe("Sort order"),
      price_from: z.number().min(0).optional().describe("Minimum price filter"),
      price_to: z.number().min(0).optional().describe("Maximum price filter"),
      catalog_ids: z.string().optional().describe("Catalog/category IDs (comma-separated)"),
      brand_ids: z.string().optional().describe("Brand IDs (comma-separated)"),
      size_ids: z.string().optional().describe("Size IDs (comma-separated)"),
      color_ids: z.string().optional().describe("Color IDs (comma-separated)"),
      status_ids: z.string().optional().describe("Condition IDs (comma-separated): 6=New with tags, 1=New, 2=Very good, 3=Good, 4=Satisfactory"),
    },
    async (params) => {
      try {
        const orderMap: Record<string, string> = {
          relevance: "relevance",
          price_low_to_high: "price_low_to_high",
          price_high_to_low: "price_high_to_low",
          newest_first: "newest_first",
        };

        const queryParams: Record<string, string> = {
          search_text: params.query,
          page: String(params.page),
          per_page: String(params.per_page),
          order: orderMap[params.order] ?? "relevance",
        };

        if (params.price_from !== undefined) queryParams["price_from"] = String(params.price_from);
        if (params.price_to !== undefined) queryParams["price_to"] = String(params.price_to);
        if (params.catalog_ids) queryParams["catalog_ids"] = params.catalog_ids;
        if (params.brand_ids) queryParams["brand_ids"] = params.brand_ids;
        if (params.size_ids) queryParams["size_ids"] = params.size_ids;
        if (params.color_ids) queryParams["color_ids"] = params.color_ids;
        if (params.status_ids) queryParams["status_ids"] = params.status_ids;

        const data = await getClient().get<VintedSearchResponse>("/catalog/items", queryParams);
        const text = formatSearchResults(data);

        return {
          content: [{ type: "text" as const, text }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Search failed: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
