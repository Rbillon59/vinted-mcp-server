import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../api/client.js";
import { mcpError } from "../utils/mcp-error.js";

export function registerFavoriteTool(server: McpServer): void {
  server.tool(
    "favorite_item",
    "Add or remove an item from your Vinted favorites. Requires VINTED_EMAIL and VINTED_PASSWORD.",
    {
      item_id: z.number().int().positive().describe("The Vinted item ID"),
      undo: z.boolean().optional().default(false).describe("Set to true to remove from favorites"),
    },
    async (params) => {
      try {
        const client = getClient();

        if (!client.isAuthenticated) {
          return {
            content: [{ type: "text" as const, text: "This tool requires authentication. Configure VINTED_EMAIL and VINTED_PASSWORD." }],
            isError: true,
          };
        }

        if (params.undo) {
          await client.del(`/items/${params.item_id}/favourite`);
          return {
            content: [{ type: "text" as const, text: `Item ${params.item_id} removed from favorites.` }],
          };
        }

        await client.post(`/items/${params.item_id}/favourite`, {});
        return {
          content: [{ type: "text" as const, text: `Item ${params.item_id} added to favorites.` }],
        };
      } catch (error: unknown) {
        return mcpError("Failed to update favorite", error);
      }
    }
  );
}
