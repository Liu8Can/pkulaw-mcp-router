import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { RouterConfig, type ServiceConfig } from './config.js';

export interface ServiceProbeResult {
  service: ServiceConfig;
  tools: Tool[];
  serverName?: string;
  serverVersion?: string;
  error?: string;
}

interface RoutedTool {
  publicName: string;
  remoteName: string;
  service: ServiceConfig;
  tool: Tool;
}

async function withRemoteClient<T>(
  service: ServiceConfig,
  headers: Record<string, string>,
  handler: (client: Client) => Promise<T>
): Promise<T> {
  const transport = new StreamableHTTPClientTransport(new URL(service.url), {
    requestInit: {
      headers,
    },
  });

  const client = new Client(
    {
      name: 'pkulaw-mcp-router-client',
      version: '0.2.0',
    },
    {
      capabilities: {},
    }
  );

  try {
    await client.connect(transport);
    return await handler(client);
  } finally {
    try {
      await client.close();
    } catch {
      // ignore
    }
    try {
      await transport.close();
    } catch {
      // ignore
    }
  }
}

export async function probeServices(config: RouterConfig): Promise<ServiceProbeResult[]> {
  const results: ServiceProbeResult[] = [];

  for (const service of config.services) {
    try {
      const result = await withRemoteClient(service, config.httpHeaders, async (client) => {
        const toolsResult = await client.listTools();
        const serverVersion = client.getServerVersion();
        return {
          tools: toolsResult.tools,
          serverName: serverVersion?.name,
          serverVersion: serverVersion?.version,
        };
      });

      results.push({
        service,
        tools: result.tools,
        serverName: result.serverName,
        serverVersion: result.serverVersion,
      });
    } catch (error) {
      results.push({
        service,
        tools: [],
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

function decorateDescription(service: ServiceConfig, tool: Tool, publicName: string): string | undefined {
  if (publicName === tool.name) {
    return tool.description;
  }

  if (tool.description) {
    return `来源服务：${service.title ?? service.name}\n\n${tool.description}`;
  }

  return `来源服务：${service.title ?? service.name}`;
}

function chooseToolName(
  config: RouterConfig,
  service: ServiceConfig,
  remoteName: string,
  isConflicted: boolean,
  usedNames: Set<string>
): string {
  const sep = config.prefixSeparator;
  let baseName = remoteName;

  if (config.toolNameMode === 'prefix') {
    baseName = `${service.name}${sep}${remoteName}`;
  } else if (config.toolNameMode === 'auto' && isConflicted) {
    baseName = `${service.name}${sep}${remoteName}`;
  }

  let name = baseName;
  let index = 2;
  while (usedNames.has(name)) {
    name = `${baseName}${sep}${index}`;
    index += 1;
  }
  usedNames.add(name);
  return name;
}

function buildRegistry(config: RouterConfig, probes: ServiceProbeResult[]): { tools: Tool[]; routedTools: Map<string, RoutedTool> } {
  const counts = new Map<string, number>();
  for (const probe of probes) {
    if (probe.error) continue;
    for (const tool of probe.tools) {
      counts.set(tool.name, (counts.get(tool.name) ?? 0) + 1);
    }
  }

  const usedNames = new Set<string>();
  const publicTools: Tool[] = [];
  const routedTools = new Map<string, RoutedTool>();

  for (const probe of probes) {
    if (probe.error) continue;

    for (const tool of probe.tools) {
      const publicName = chooseToolName(
        config,
        probe.service,
        tool.name,
        (counts.get(tool.name) ?? 0) > 1,
        usedNames
      );

      const publicTool: Tool = {
        ...tool,
        name: publicName,
        description: decorateDescription(probe.service, tool, publicName),
      };

      publicTools.push(publicTool);
      routedTools.set(publicName, {
        publicName,
        remoteName: tool.name,
        service: probe.service,
        tool: publicTool,
      });
    }
  }

  return { tools: publicTools, routedTools };
}

export async function inspectRouter(config: RouterConfig): Promise<ServiceProbeResult[]> {
  return await probeServices(config);
}

export async function serveRouter(config: RouterConfig): Promise<void> {
  const probes = await probeServices(config);
  const available = probes.filter((item) => !item.error);
  const unavailable = probes.filter((item) => item.error);

  if (!config.skipUnavailableServices && unavailable.length > 0) {
    const summary = unavailable
      .map((item) => `${item.service.name}: ${item.error}`)
      .join('\n');
    throw new Error(`以下服务不可用：\n${summary}`);
  }

  const { tools, routedTools } = buildRegistry(config, available);
  if (tools.length === 0) {
    throw new Error('没有可用工具，请检查 token 或服务配置');
  }

  const server = new Server(
    {
      name: config.serverName,
      version: config.serverVersion,
    },
    {
      capabilities: {
        tools: {},
      },
      instructions: '把多个北大法宝 MCP 子服务聚合成一个本地入口。',
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const routed = routedTools.get(request.params.name);
    if (!routed) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error: `Unknown tool: ${request.params.name}`,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await withRemoteClient(
        routed.service,
        config.httpHeaders,
        async (client) =>
          await client.callTool({
            name: routed.remoteName,
            arguments: request.params.arguments ?? {},
          })
      );

      return result as CallToolResult;
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                service: routed.service.name,
                remoteTool: routed.remoteName,
                error: error instanceof Error ? error.message : String(error),
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

