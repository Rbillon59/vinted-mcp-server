import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSearchTool } from "./tools/search.js";
import { registerItemTool } from "./tools/item.js";
import { registerUserTool } from "./tools/user.js";
import { registerUserItemsTool } from "./tools/user-items.js";
import { registerBrandsTool } from "./tools/brands.js";


export function createServer(): McpServer {
  const server = new McpServer({
    name: "vinted-mcp-server",
    version: "0.1.0",
  });

  // Read-only tools (always available)
  registerSearchTool(server);
  registerItemTool(server);
  registerUserTool(server);
  registerUserItemsTool(server);
  registerBrandsTool(server);

  return server;
}
