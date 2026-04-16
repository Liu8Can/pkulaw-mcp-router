import fs from 'node:fs';
import path from 'node:path';
import TOML from 'toml';

export type ToolNameMode = 'auto' | 'prefix' | 'passthrough';

export interface ServiceConfig {
  name: string;
  title?: string;
  url: string;
  enabled?: boolean;
}

export interface RouterConfig {
  serverName: string;
  serverVersion: string;
  toolNameMode: ToolNameMode;
  prefixSeparator: string;
  skipUnavailableServices: boolean;
  httpHeaders: Record<string, string>;
  services: ServiceConfig[];
}

const ENV_PATTERN = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

function expandEnv(input: unknown): unknown {
  if (typeof input === 'string') {
    return input.replaceAll(ENV_PATTERN, (_, name: string) => {
      const value = process.env[name];
      if (value == null) {
        throw new Error(`环境变量未设置：${name}`);
      }
      return value;
    });
  }

  if (Array.isArray(input)) {
    return input.map(expandEnv);
  }

  if (input && typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [key, expandEnv(value)])
    );
  }

  return input;
}

function normalizeServiceName(input: string): string {
  const normalized = input.trim().replace(/[^a-zA-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
  if (!normalized) {
    throw new Error(`服务名不可用：${input}`);
  }
  return normalized;
}

export function loadRouterConfig(configPath: string): RouterConfig {
  const resolvedPath = path.resolve(configPath);
  const raw = fs.readFileSync(resolvedPath, 'utf8');
  const parsed = expandEnv(TOML.parse(raw)) as Record<string, unknown>;

  const serverName = String(parsed.server_name ?? 'pkulaw_unified_mcp').trim();
  const serverVersion = String(parsed.server_version ?? '0.2.0').trim();
  const toolNameMode = String(parsed.tool_name_mode ?? 'auto').trim() as ToolNameMode;
  const prefixSeparator = String(parsed.prefix_separator ?? '__');
  const skipUnavailableServices = Boolean(parsed.skip_unavailable_services ?? true);
  const httpHeaders = Object.fromEntries(
    Object.entries((parsed.http_headers as Record<string, unknown> | undefined) ?? {}).map(([key, value]) => [
      key,
      String(value),
    ])
  );

  if (!['auto', 'prefix', 'passthrough'].includes(toolNameMode)) {
    throw new Error('tool_name_mode 只支持 auto / prefix / passthrough');
  }

  const rawServices = ((parsed.services as Array<Record<string, unknown>>) ?? []).filter(Boolean);
  if (rawServices.length === 0) {
    throw new Error('至少需要一个 [[services]]');
  }

  const usedNames = new Set<string>();
  const services: ServiceConfig[] = rawServices
    .filter((item) => item.enabled !== false)
    .map((item) => {
      const rawName = String(item.name ?? '').trim();
      const url = String(item.url ?? '').trim();
      if (!rawName) {
        throw new Error('每个服务都需要 name');
      }
      if (!url) {
        throw new Error(`服务 ${rawName} 缺少 url`);
      }

      const name = normalizeServiceName(rawName);
      if (usedNames.has(name)) {
        throw new Error(`服务名重复：${name}`);
      }
      usedNames.add(name);

      return {
        name,
        title: item.title ? String(item.title) : undefined,
        url,
        enabled: item.enabled !== false,
      };
    });

  return {
    serverName,
    serverVersion,
    toolNameMode,
    prefixSeparator,
    skipUnavailableServices,
    httpHeaders,
    services,
  };
}

