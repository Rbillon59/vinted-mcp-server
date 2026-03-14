import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../api/client.js";
import type { VintedUserProfile } from "../api/types.js";

function formatUserProfile(data: VintedUserProfile): string {
  const { user } = data;
  const lines = [
    `# ${user.login}`,
    "",
    `## Profile`,
    `- **Rating:** ${user.feedback_reputation}/5`,
    `- **Reviews:** ${user.positive_feedback_count} positive, ${user.negative_feedback_count} negative (${user.feedback_count} total)`,
    `- **Items listed:** ${user.item_count}`,
    `- **Items sold:** ${user.given_item_count}`,
  ];

  if (user.city || user.country_title) {
    lines.push(`- **Location:** ${[user.city, user.country_title].filter(Boolean).join(", ")}`);
  }

  lines.push(`- **Member since:** ${user.created_at}`);
  lines.push(`- **Last active:** ${user.last_loged_on_ts}`);

  return lines.join("\n");
}

export function registerUserTool(server: McpServer): void {
  server.tool(
    "get_user_profile",
    "Get a Vinted user's profile including ratings, reviews, number of items, and activity.",
    {
      user_id: z.number().int().positive().describe("The Vinted user ID (from search results or item details)"),
    },
    async (params) => {
      try {
        const data = await getClient().get<VintedUserProfile>(`/users/${params.user_id}`);
        const text = formatUserProfile(data);

        return {
          content: [{ type: "text" as const, text }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Failed to get user profile: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
