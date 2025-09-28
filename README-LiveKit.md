# LiveKit 远程操作应用

这是一个基于 Next.js 和 LiveKit 的实时视频通信应用，连接到本地部署的 LiveKit 服务器。

## 配置说明

### 服务器配置
- **LiveKit 服务器地址**: `ws://111.186.56.118:7880`
- **API 密钥**: `APInW6ERFGxxjaE`
- **API 密钥**: `M0IHgofsZ8DeAoYoBWEO4RoM1hUcig0GFAnZssicettB`

### 环境变量
配置文件 `.env.local` 包含：
```
LIVEKIT_API_KEY=APInW6ERFGxxjaE
LIVEKIT_API_SECRET=M0IHgofsZ8DeAoYoBWEO4RoM1hUcig0GFAnZssicettB
LIVEKIT_URL=ws://111.186.56.118:7880
NEXT_PUBLIC_LIVEKIT_URL=ws://111.186.56.118:7880
```

## 启动应用

1. **启动 LiveKit 服务器**:
   ```bash
   cd /root/Code/LiveKit
   livekit-server --config config.yaml
   ```

2. **启动 Next.js 应用**:
   ```bash
   cd /root/Code/LiveKit/NextLive/tele-op
   npm run dev
   ```

3. **访问应用**:
   - 主页: http://localhost:3000
   - 视频房间: http://localhost:3000/room

## 功能特性

- ✅ 实时视频通话
- ✅ 音频通话
- ✅ 屏幕共享
- ✅ 多参与者支持
- ✅ 自适应视频质量
- ✅ 自动音频/视频优化

## API 端点

- `GET /api/token?room=<房间名>&username=<用户名>` - 生成访问令牌

## 技术栈

- **前端**: Next.js 15, React 19, TypeScript
- **实时通信**: LiveKit Client SDK
- **UI 组件**: LiveKit React Components
- **服务器**: LiveKit Server (本地部署)

## 注意事项

1. 确保 LiveKit 服务器在端口 7880 上运行
2. 确保防火墙允许 7880 和 7881 端口的访问
3. 对于生产环境，建议配置 TURN 服务器以提高连接成功率
4. 确保客户端能够访问服务器的公网 IP 地址
