import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../api/client.js";
import type { VintedCatalog } from "../api/types.js";
import { mcpError } from "../utils/mcp-error.js";

function formatCatalogs(catalogs: readonly VintedCatalog[], depth: number = 0): string {
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

/**
 * Extract the catalogTree JSON array from the /catalog HTML page.
 * The data is embedded as escaped JSON in a Next.js RSC script payload.
 */
function extractCatalogTree(html: string): readonly VintedCatalog[] {
  const marker = 'catalogTree\\":[';
  const start = html.indexOf(marker);
  if (start === -1) return [];

  const arrayStart = start + marker.length - 1; // include the '['
  let depth = 0;
  let end = -1;

  for (let i = arrayStart; i < html.length; i++) {
    if (html[i] === "[") depth++;
    else if (html[i] === "]") depth--;
    if (depth === 0) {
      end = i + 1;
      break;
    }
  }

  if (end === -1) return [];

  const raw = html.slice(arrayStart, end);
  // The JSON is escaped (\" instead of "), unescape it
  const unescaped = raw.replace(/\\"/g, '"').replace(/\\\\/g, "\\");

  try {
    return JSON.parse(unescaped) as VintedCatalog[];
  } catch {
    return [];
  }
}

export function registerCategoriesTool(server: McpServer): void {
  server.tool(
    "get_categories",
    "Get the Vinted category tree. Use the returned IDs with the catalog_ids filter in search_items.",
    {},
    async () => {
      try {
        const client = getClient();
        const html = await client.getHtml(`${client.baseUrl}/catalog`);
        const catalogs = extractCatalogTree(html);

        if (catalogs.length === 0) {
          return mcpError(
            "Failed to get categories",
            new Error("Could not extract category tree from page"),
          );
        }

        const text = "# Vinted Categories\n\n" + formatCatalogs(catalogs);

        return {
          content: [{ type: "text" as const, text }],
        };
      } catch (error: unknown) {
        return mcpError("Failed to get categories", error);
      }
    }
  );
}
