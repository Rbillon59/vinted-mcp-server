/**
 * Shared MCP error response builder for tool handlers.
 */
export function mcpError(prefix: string, error: unknown): {
  content: [{ type: "text"; text: string }];
  isError: true;
} {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text" as const, text: `${prefix}: ${message}` }],
    isError: true,
  };
}
