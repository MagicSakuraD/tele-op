# Tele-Op Next.js 项目 Windows 11 部署指南

## 项目概述

这是一个基于 Next.js 15.5.3 的远程操作项目，集成了 LiveKit 实时音视频通信功能。项目使用 TypeScript、Tailwind CSS，并支持游戏手柄控制。

## 系统要求

- **操作系统**: Windows 11 (版本 22H2 或更高)
- **Node.js**: 18.0.0 或更高版本
- **内存**: 至少 4GB RAM
- **存储**: 至少 2GB 可用空间
- **网络**: 稳定的互联网连接

## 环境准备

### 1. 安装 Node.js

1. 访问 [Node.js 官网](https://nodejs.org/)
2. 下载 LTS 版本（推荐 18.x 或 20.x）
3. 运行安装程序，按默认设置安装
4. 验证安装：
   ```powershell
   node --version
   npm --version
   ```

### 2. 安装 Git（如果未安装）

1. 访问 [Git 官网](https://git-scm.com/)
2. 下载 Windows 版本
3. 按默认设置安装
4. 验证安装：
   ```powershell
   git --version
   ```

### 3. 安装 Visual Studio Code（推荐）

1. 访问 [VS Code 官网](https://code.visualstudio.com/)
2. 下载并安装
3. 安装推荐的扩展：
   - TypeScript Importer
   - Tailwind CSS IntelliSense
   - Live Server

## 项目部署

### 1. 克隆项目

```powershell
# 打开 PowerShell 或命令提示符
cd D:\MyCode
git clone https://github.com/MagicSakuraD/tele-op.git
cd tele-op
```

### 2. 安装依赖

```powershell
# 使用 npm 安装依赖
npm install

# 或者使用 yarn（如果已安装）
yarn install

# 或者使用 pnpm（如果已安装）
pnpm install
```

### 3. 环境配置

创建 `.env.local` 文件：

```bash
# LiveKit 配置
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_URL=ws://localhost:7880

# 开发环境配置
NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
```

### 4. 启动 LiveKit 服务器（Docker 方式）

由于项目依赖 LiveKit 服务器，需要先启动 LiveKit：

```powershell
# 安装 Docker Desktop（如果未安装）
# 下载地址：https://www.docker.com/products/docker-desktop/

# 启动 LiveKit 服务器
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp livekit/livekit-server --dev
```

### 5. 启动开发服务器

```powershell
# 开发模式启动
npm run dev

# 或者使用 yarn
yarn dev

# 或者使用 pnpm
pnpm dev
```

项目将在 `http://localhost:3000` 启动。

## 生产环境部署

### 1. 构建项目

```powershell
# 构建生产版本
npm run build

# 启动生产服务器
npm run start
```

### 2. 使用 PM2 进行进程管理（推荐）

```powershell
# 全局安装 PM2
npm install -g pm2

# 创建 PM2 配置文件 ecosystem.config.js
```

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'tele-op',
    script: 'npm',
    args: 'start',
    cwd: 'D:\\MyCode\\tele-op',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

启动应用：

```powershell
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3. 使用 IIS 部署（可选）

1. 安装 IIS 和 URL Rewrite 模块
2. 安装 Node.js 和 iisnode
3. 配置 web.config 文件
4. 将构建后的文件部署到 IIS

## 配置说明

### Next.js 配置

项目使用自定义的 `next.config.ts` 配置：

- **CORS 支持**: 允许跨域访问
- **代理配置**: 将 `/livekit/*` 代理到本地 LiveKit 服务器
- **开发环境**: 支持特定域名的跨域访问

### LiveKit 集成

- **API 端点**: `/api/token` 用于生成访问令牌
- **默认配置**: 使用开发环境的默认密钥
- **WebSocket**: 通过 `ws://localhost:7880` 连接

### 游戏手柄支持

项目包含 `useExcavatorGamepad.ts` hook，支持游戏手柄控制功能。

## 常见问题解决

### 1. 端口占用问题

```powershell
# 查看端口占用
netstat -ano | findstr :3000

# 杀死占用进程
taskkill /PID <进程ID> /F
```

### 2. 依赖安装失败

```powershell
# 清理缓存
npm cache clean --force

# 删除 node_modules 和 package-lock.json
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### 3. LiveKit 连接问题

- 确保 LiveKit 服务器正在运行
- 检查防火墙设置
- 验证环境变量配置

### 4. TypeScript 编译错误

```powershell
# 检查 TypeScript 配置
npx tsc --noEmit

# 重新生成类型定义
npm run build
```

## 性能优化

### 1. 启用 Turbopack（开发环境）

项目已配置使用 Turbopack 进行快速构建：

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build --turbopack"
  }
}
```

### 2. 生产环境优化

- 启用 gzip 压缩
- 配置 CDN
- 使用 HTTPS
- 设置适当的缓存策略

## 监控和维护

### 1. 日志管理

```powershell
# 查看 PM2 日志
pm2 logs tele-op

# 查看实时日志
pm2 logs tele-op --lines 100
```

### 2. 性能监控

```powershell
# 查看 PM2 状态
pm2 status

# 查看详细信息
pm2 show tele-op
```

### 3. 自动重启

PM2 配置了自动重启功能，应用崩溃时会自动重启。

## 安全建议

1. **环境变量**: 生产环境使用强密钥
2. **HTTPS**: 生产环境必须使用 HTTPS
3. **防火墙**: 配置适当的防火墙规则
4. **更新**: 定期更新依赖包

## 故障排除

### 检查服务状态

```powershell
# 检查 Node.js 进程
tasklist | findstr node

# 检查端口监听
netstat -ano | findstr :3000
netstat -ano | findstr :7880
```

### 查看详细错误

```powershell
# 查看详细构建信息
npm run build --verbose

# 查看开发服务器日志
npm run dev --verbose
```

## 联系支持

如果遇到问题，请：

1. 检查本文档的常见问题部分
2. 查看项目的 GitHub Issues
3. 提交新的 Issue 并包含详细的错误信息

---

**注意**: 这是一个开发版本的项目，生产环境部署前请进行充分测试。
