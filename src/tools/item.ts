import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../api/client.js";
import { mcpError } from "../utils/mcp-error.js";

interface JsonLdProduct {
  readonly name?: string;
  readonly description?: string;
  readonly image?: readonly string[];
  readonly offers?: {
    readonly price?: number;
    readonly priceCurrency?: string;
    readonly itemCondition?: string;
  };
}

interface RscAttribute {
  readonly code: string;
  readonly data: {
    readonly title?: string;
    readonly value?: string;
    readonly id?: number;
  };
}

interface RscPlugin {
  readonly name: string;
  readonly data: {
    readonly item_id?: number;
    readonly attributes?: readonly RscAttribute[];
    readonly description?: string;
  };
}

function extractJsonLd(html: string): JsonLdProduct | null {
  const match = html.match(
    /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (!match?.[1]) return null;
  try {
    const data: unknown = JSON.parse(match[1]);
    if (typeof data === "object" && data !== null && (data as Record<string, unknown>)["@type"] === "Product") {
      return data as JsonLdProduct;
    }
    return null;
  } catch {
    return null;
  }
}

function extractOgMeta(html: string, property: string): string | null {
  // Handle both attribute orders: property then content, or content then property
  const patterns = [
    new RegExp(`<meta\\s+(?:property|name)="${property}"\\s+content="([^"]*)"`, "i"),
    new RegExp(`<meta\\s+content="([^"]*)"\\s+(?:property|name)="${property}"`, "i"),
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * Extract RSC plugin data using indexOf-based search instead of backtrack-heavy regex.
 */
function extractRscPlugins(html: string): readonly RscPlugin[] {
  const plugins: RscPlugin[] = [];
  const markers = ['"name":"attributes"', '"name":"description"', '"name":"summary"'];

  let searchStart = 0;
  for (;;) {
    let earliest = -1;
    for (const marker of markers) {
      const idx = html.indexOf(marker, searchStart);
      if (idx !== -1 && (earliest === -1 || idx < earliest)) {
        earliest = idx;
      }
    }
    if (earliest === -1) break;

    // Walk backwards to find the opening brace
    const openBrace = html.lastIndexOf("{", earliest);
    if (openBrace === -1) { searchStart = earliest + 1; continue; }

    // Walk forward counting braces to find the matching close
    let depth = 0;
    let end = -1;
    for (let i = openBrace; i < html.length; i++) {
      if (html[i] === "{") depth++;
      else if (html[i] === "}") depth--;
      if (depth === 0) { end = i + 1; break; }
    }
    if (end === -1) { searchStart = earliest + 1; continue; }

    const candidate = html.slice(openBrace, end);
    try {
      const plugin: unknown = JSON.parse(candidate);
      if (typeof plugin === "object" && plugin !== null && "name" in plugin && "data" in plugin) {
        plugins.push(plugin as RscPlugin);
      }
    } catch {
      // Malformed JSON — skip
    }
    searchStart = end;
  }

  return plugins;
}

const CONDITION_MAP: Record<string, string> = {
  NewCondition: "New",
  UsedCondition: "Used",
  RefurbishedCondition: "Refurbished",
};

function formatCondition(condition: string | undefined): string {
  if (!condition) return "Unknown";
  const bare = condition.replace("https://schema.org/", "");
  return CONDITION_MAP[bare] ?? bare;
}

function buildItemDetail(
  itemId: number,
  jsonLd: JsonLdProduct | null,
  ogDescription: string | null,
  rscPlugins: readonly RscPlugin[],
  itemUrl: string,
): string {
  const lines: string[] = [];

  const title = jsonLd?.name ?? `Item ${itemId}`;
  lines.push(`# ${title}`);

  if (jsonLd?.offers) {
    lines.push(`**Price:** ${jsonLd.offers.price} ${jsonLd.offers.priceCurrency ?? "EUR"}`);
    lines.push(`**Condition:** ${formatCondition(jsonLd.offers.itemCondition)}`);
  }

  const attrPlugin = rscPlugins.find((p) => p.name === "attributes");
  if (attrPlugin?.data.attributes) {
    for (const attr of attrPlugin.data.attributes) {
      if (attr.data.title && attr.data.value) {
        lines.push(`**${attr.data.title}:** ${attr.data.value}`);
      }
    }
  }

  lines.push("");

  const descPlugin = rscPlugins.find((p) => p.name === "description");
  const description = descPlugin?.data.description ?? ogDescription;
  if (description) {
    lines.push("## Description");
    lines.push(description);
    lines.push("");
  }

  if (jsonLd?.image && jsonLd.image.length > 0) {
    lines.push(`## Photos (${jsonLd.image.length})`);
    jsonLd.image.forEach((url, i) => {
      lines.push(`${i + 1}. ${url}`);
    });
    lines.push("");
  }

  lines.push(`**URL:** ${itemUrl}`);

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
        const client = getClient();
        const itemUrl = `${client.baseUrl}/items/${params.item_id}`;

        const html = await client.getHtml(itemUrl);
        const jsonLd = extractJsonLd(html);
        const ogDescription = extractOgMeta(html, "og:description");
        const rscPlugins = extractRscPlugins(html);

        if (!jsonLd && rscPlugins.length === 0) {
          return mcpError(
            "Failed to get item details",
            new Error("Could not extract item data (page may require authentication or Cloudflare challenge)"),
          );
        }

        const text = buildItemDetail(
          params.item_id,
          jsonLd,
          ogDescription,
          rscPlugins,
          itemUrl,
        );

        return {
          content: [{ type: "text" as const, text }],
        };
      } catch (error: unknown) {
        return mcpError("Failed to get item details", error);
      }
    },
  );
}
