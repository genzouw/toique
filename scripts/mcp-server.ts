import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// サーバーインスタンスを作成
const server = new McpServer({
  name: 'toique-mcp-server',
  version: '1.0.0',
});

// ツール: データベーススキーマを取得
server.tool(
  'get_db_schema',
  'Toique の Drizzle データベーススキーマを返します',
  {},
  async () => {
    try {
      const schemaPath = path.join(rootDir, 'backend/src/db.ts');
      const schemaExtPath = path.join(rootDir, 'backend/src/schema.ts');

      let content = '';
      try {
        content += await fs.readFile(schemaPath, 'utf-8');
      } catch (e) {
        // ファイルが存在しない場合はそのまま続行する
      }
      try {
        content += '\n\n' + (await fs.readFile(schemaExtPath, 'utf-8'));
      } catch (e) {
        // ファイルが存在しない場合はそのまま続行する
      }

      if (!content) {
        return {
          content: [
            {
              type: 'text',
              text: 'データベーススキーマファイルが見つかりません。',
            },
          ],
        };
      }
      return {
        content: [{ type: 'text', text: content }],
      };
    } catch (error: any) {
      return {
        content: [
          { type: 'text', text: `Error reading schema: ${error.message}` },
        ],
        isError: true,
      };
    }
  },
);

// ツール: API ルーティング定義を取得
server.tool(
  'get_api_routes',
  'Hono の API ルーティング定義ファイルを返します',
  {
    target: z
      .string()
      .optional()
      .describe(
        "特定のルートファイル名（例: 'messages.ts'）。未指定の場合はメインのルート定義を返します。",
      ),
  },
  async ({ target }) => {
    try {
      let routePath = '';
      if (target) {
        routePath = path.join(rootDir, `backend/src/routes/${target}`);
      } else {
        routePath = path.join(rootDir, 'backend/src/index.ts');
      }
      const content = await fs.readFile(routePath, 'utf-8');
      return {
        content: [{ type: 'text', text: content }],
      };
    } catch (error: any) {
      return {
        content: [
          { type: 'text', text: `Error reading routes: ${error.message}` },
        ],
        isError: true,
      };
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Toique MCP Server running on stdio');
}

main().catch((error) => {
  console.error('MCP Server Error:', error);
  process.exit(1);
});
