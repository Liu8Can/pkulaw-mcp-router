#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { loadRouterConfig } from './config.js';
import { discoverPublicCatalog } from './discovery.js';
import { inspectRouter, serveRouter } from './router.js';

interface CliOptions {
  command: 'serve' | 'inspect' | 'discover';
  configPath: string;
  outPath: string;
  verbose: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const args = [...argv];
  let command: CliOptions['command'] = 'serve';

  if (args[0] && ['serve', 'inspect', 'discover'].includes(args[0])) {
    command = args.shift() as CliOptions['command'];
  }

  let configPath = path.resolve(process.cwd(), 'config.example.toml');
  let outPath = path.resolve(process.cwd(), 'catalog', 'pkulaw-services.generated.json');
  let verbose = false;

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (current === '--config') {
      configPath = path.resolve(process.cwd(), args[index + 1] ?? '');
      index += 1;
      continue;
    }
    if (current === '--out') {
      outPath = path.resolve(process.cwd(), args[index + 1] ?? '');
      index += 1;
      continue;
    }
    if (current === '--verbose') {
      verbose = true;
    }
  }

  return {
    command,
    configPath,
    outPath,
    verbose,
  };
}

function logVerbose(enabled: boolean, ...messages: unknown[]): void {
  if (enabled) {
    console.error(...messages);
  }
}

async function runDiscover(outPath: string, verbose: boolean): Promise<void> {
  logVerbose(verbose, '开始抓取北大法宝 MCP 公开目录...');
  const catalog = await discoverPublicCatalog();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');

  console.log(`已写入 ${outPath}`);
  console.log(`共发现 ${catalog.length} 个子服务：`);
  for (const item of catalog) {
    console.log(`- ${item.alias} | ${item.productName} | ${item.serviceUrl}`);
  }
}

async function runInspect(configPath: string): Promise<void> {
  const config = loadRouterConfig(configPath);
  const probes = await inspectRouter(config);

  console.log(`server_name: ${config.serverName}`);
  console.log(`configured_services: ${config.services.length}`);
  console.log('');

  for (const probe of probes) {
    const serviceLabel = probe.service.title ?? probe.service.name;
    console.log(`[${probe.service.name}] ${serviceLabel}`);
    console.log(`  url: ${probe.service.url}`);
    if (probe.serverName) {
      console.log(`  remote_server: ${probe.serverName} ${probe.serverVersion ?? ''}`.trimEnd());
    }
    if (probe.error) {
      console.log(`  status: error`);
      console.log(`  error: ${probe.error}`);
      console.log('');
      continue;
    }
    console.log(`  status: ok`);
    for (const tool of probe.tools) {
      console.log(`  - ${tool.name}`);
    }
    console.log('');
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.command === 'discover') {
    await runDiscover(options.outPath, options.verbose);
    return;
  }

  if (options.command === 'inspect') {
    await runInspect(options.configPath);
    return;
  }

  await serveRouter(loadRouterConfig(options.configPath));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
