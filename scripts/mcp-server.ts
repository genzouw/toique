import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Create server instance
const server = new McpServer({
  name: "toique-mcp-server",
  version: "1.0.0",
});

// Tool: Get Database Schema
server.tool(
  "get_db_schema",
  "Returns the Drizzle database schema for Toique",
  {},
  async () => {
    try {
      const schemaPath = path.join(rootDir, "backend/src/db.ts");
      const schemaExtPath = path.join(rootDir, "backend/src/schema.ts");

      let content = "";
      try {
        content += await fs.readFile(schemaPath, "utf-8");
      } catch (e) {
        // file might not exist, proceed
      }
      try {
        content += "\n\n" + await fs.readFile(schemaExtPath, "utf-8");
      } catch (e) {
        // file might not exist, proceed
      }

      if (!content) {
        return {
          content: [{ type: "text", text: "Database schema file not found." }],
        };
      }
      return {
        content: [{ type: "text", text: content }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error reading schema: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: Get API Routes
server.tool(
  "get_api_routes",
  "Returns the Hono API routes definition files",
  {
    target: z.string().optional().describe("Specific route file name (e.g., 'messages.ts') or empty for main route definition."),
  },
  async ({ target }) => {
    try {
      let routePath = "";
      if (target) {
        routePath = path.join(rootDir, `backend/src/routes/${target}`);
      } else {
        routePath = path.join(rootDir, "backend/src/index.ts");
      }
      const content = await fs.readFile(routePath, "utf-8");
      return {
        content: [{ type: "text", text: content }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error reading routes: ${error.message}` }],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Toique MCP Server running on stdio");
}

main().catch((error) => {
  console.error("MCP Server Error:", error);
  process.exit(1);
});
