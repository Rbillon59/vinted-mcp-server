import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../api/client.js";
import type { VintedCatalog, VintedCatalogResponse } from "../api/types.js";
import { mcpError } from "../utils/mcp-error.js";

function formatCatalogs(catalogs: VintedCatalog[], depth: number = 0): string {
  const lines: string[] = [];
  const indent = "  ".repeat(depth);

  for (const catalog of catalogs) {
    lines.push(`${indent}- **${catalog.title}** (ID: ${catalog.id})`);
    if (catalog.catalogs.length > 0) {
      lines.push(formatCatalogs(catalog.catalogs, depth + 1));
    }
  }

  return lines.join("\n");
}

export function registerCategoriesTool(server: McpServer): void {
  server.tool(
    "get_categories",
    "Get the Vinted category tree. Use the returned IDs with the catalog_ids filter in search_items.",
    {},
    async () => {
      try {
        const data = await getClient().get<VintedCatalogResponse>("/catalogs");
        const text = "# Vinted Categories\n\n" + formatCatalogs(data.catalogs);

        return {
          content: [{ type: "text" as const, text }],
        };
      } catch (error: unknown) {
        return mcpError("Failed to get categories", error);
      }
    }
  );
}
