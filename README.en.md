# pkulaw-mcp-router

[中文说明](./README.md) | English

Merge multiple PKULAW MCP sub-services into one local MCP server.

## npm

- npm: `https://www.npmjs.com/package/pkulaw-mcp-router`

## Overview

PKULAW currently exposes many MCP capabilities as separate remote endpoints.  
That may be useful for upstream product packaging and permission control, but it creates unnecessary friction for end users:

- one token may require multiple MCP entries
- many services mainly differ by the last URL segment
- MCP clients end up carrying avoidable configuration complexity

`pkulaw-mcp-router` adds a local aggregation layer.

> It keeps upstream services unchanged while restoring a simpler MCP experience: connect one local server and let the model choose tools from a unified toolbox.

## Design principles

- **Do not replace upstream services**
- **Aggregate locally**
- **Keep complexity in the adapter layer**
- **Make discovery and routing inspectable**
- **Use mainstream MCP tooling**: `npm`, `TypeScript`, and `@modelcontextprotocol/sdk`

## Features

- fetches the public catalog from `https://mcp.pkulaw.com/apis`
- reads child-page Swagger descriptions to extract real service URLs
- probes which services are available for the current token
- merges tools from multiple remote MCP servers
- exposes them through one local `stdio` MCP server
- resolves tool-name conflicts automatically

## Installation

### Option 1: run with npx

```bash
npx -y pkulaw-mcp-router@latest serve --config /path/to/pkulaw-mcp-router.toml
```

### Option 2: global install

```bash
npm install -g pkulaw-mcp-router
pkulaw-mcp-router serve --config /path/to/pkulaw-mcp-router.toml
```

### Option 3: run from source

```bash
git clone https://github.com/Liu8Can/pkulaw-mcp-router.git
cd pkulaw-mcp-router
npm install
npm run build
node dist/index.js serve --config ./config.example.toml
```

## Configuration

Set the token as an environment variable:

```bash
export PKULAW_MCP_TOKEN="your-token"
```

PowerShell:

```powershell
$env:PKULAW_MCP_TOKEN="your-token"
```

Default example config:

- `config.example.toml`

Full example config:

- `catalog/pkulaw-services.full.example.toml`

## Common commands

### Discover public services

```bash
npm run discover
```

### Inspect which configured services are reachable

```bash
npm run inspect -- --config ./config.example.toml
```

### Build

```bash
npm run build
```

### Start the local aggregated MCP server

```bash
node dist/index.js serve --config ./config.example.toml
```

## MCP client configuration examples

### npx

```json
{
  "mcpServers": {
    "pkulaw-unified": {
      "command": "npx",
      "args": [
        "-y",
        "pkulaw-mcp-router@latest",
        "serve",
        "--config",
        "/path/to/pkulaw-mcp-router.toml"
      ],
      "env": {
        "PKULAW_MCP_TOKEN": "your-token"
      }
    }
  }
}
```

### globally installed command

```json
{
  "mcpServers": {
    "pkulaw-unified": {
      "command": "pkulaw-mcp-router",
      "args": [
        "serve",
        "--config",
        "/path/to/pkulaw-mcp-router.toml"
      ],
      "env": {
        "PKULAW_MCP_TOKEN": "your-token"
      }
    }
  }
}
```

### Codex example

```toml
[mcp_servers.pkulaw_unified]
type = "stdio"
command = "npx"
args = [
  "-y",
  "pkulaw-mcp-router@latest",
  "serve",
  "--config",
  "/path/to/pkulaw-mcp-router.toml"
]

[mcp_servers.pkulaw_unified.env]
PKULAW_MCP_TOKEN = "your-token"
```

## Notes

- availability depends on the services enabled for the current token
- `inspect` is the source of truth for current reachability
- the router only aggregates services that can actually be connected

## Maintenance and release

For future release steps, see:

- `RELEASE.md`

## License

MIT
