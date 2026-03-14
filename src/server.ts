import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSearchTool } from "./tools/search.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "vinted-mcp-server",
    version: "0.1.0",
  });

  registerSearchTool(server);

  return server;
}
