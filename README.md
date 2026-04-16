# pkulaw-mcp-router

中文说明｜[English README](./README.en.md)

把多个北大法宝 MCP 子服务聚合成一个本地 MCP 入口。

## 项目简介

北大法宝目前把不少 MCP 能力拆成了多个独立服务地址。  
这种做法便于平台按产品、权限和业务线管理，但对终端用户并不友好：

- 同一个 token，往往需要重复配置多个 MCP 服务
- 很多服务之间的差别，主要只是 URL 的最后一段
- 客户端被迫承担了不必要的配置复杂度

`pkulaw-mcp-router` 的目标很简单：

> 在不改动上游服务的前提下，把多个北大法宝远程 MCP 子服务重新聚合成一个本地 MCP 服务。

这样，客户端只需要连接一个入口，模型就可以在一个统一工具箱里按需调用工具。

## 设计理念

- **不替代上游**：保留北大法宝原有 MCP 服务形态
- **本地做聚合**：把拆散的服务重新还原成统一入口
- **把复杂度留在适配层**：客户端仍然只接一个 MCP
- **保持透明**：服务发现、可用性探测、工具映射都可以检查
- **采用主流实现方式**：基于 `npm`、`TypeScript` 和 `@modelcontextprotocol/sdk`

## 功能

- 抓取 `https://mcp.pkulaw.com/apis` 的公开目录
- 访问各子页 Swagger，提取真实服务地址
- 探测当前 token 实际可用的子服务
- 聚合多个远程 MCP 工具
- 通过一个本地 `stdio` MCP 服务统一暴露
- 自动处理工具重名冲突

## 安装

### 方式一：通过 npx 直接使用

发布到 npm 后，可直接运行：

```bash
npx -y pkulaw-mcp-router@latest serve --config /path/to/pkulaw-mcp-router.toml
```

### 方式二：全局安装

```bash
npm install -g pkulaw-mcp-router
pkulaw-mcp-router serve --config /path/to/pkulaw-mcp-router.toml
```

### 方式三：从源码运行

```bash
git clone https://github.com/Liu8Can/pkulaw-mcp-router.git
cd pkulaw-mcp-router
npm install
npm run build
node dist/index.js serve --config ./config.example.toml
```

## 配置

先设置环境变量：

```bash
export PKULAW_MCP_TOKEN="your-token"
```

Windows PowerShell：

```powershell
$env:PKULAW_MCP_TOKEN="your-token"
```

默认示例配置：

- `config.example.toml`

完整示例配置：

- `catalog/pkulaw-services.full.example.toml`

## 常用命令

### 抓取公开目录

```bash
npm run discover
```

### 探测当前配置里的服务是否可用

```bash
npm run inspect -- --config ./config.example.toml
```

### 构建

```bash
npm run build
```

### 启动本地聚合 MCP

```bash
node dist/index.js serve --config ./config.example.toml
```

## MCP 客户端配置示例

下面的例子适用于支持 `stdio` MCP 的客户端。

### npx 方式

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

### 全局安装方式

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

### Codex 配置示例

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

## 项目结构

- `src/`：TypeScript 源码
- `config.example.toml`：默认示例配置
- `catalog/pkulaw-services.generated.json`：抓取到的公开目录
- `catalog/pkulaw-services.full.example.toml`：完整服务配置示例

## 说明

- 服务可用性取决于当前 token 对应的北大法宝订阅权限
- `inspect` 的结果就是当前真实可用状态
- 路由器只聚合实际可连接的服务

## License

MIT
