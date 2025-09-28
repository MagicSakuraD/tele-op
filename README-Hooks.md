# LiveKit 官方 Hooks 和组件使用指南

## 🎯 问题解决

### 问题：参与者上下文错误
**错误信息**: "No participant provided, make sure you are inside a participant context or pass the participant explicitly"

**根本原因**: 某些 LiveKit 组件需要在特定的上下文中使用，不能直接在任意位置使用。

## 🔧 解决方案

### 1. 使用官方 Hooks 替代组件

根据 [LiveKit React Hooks 文档](https://docs.livekit.io/reference/components/react/hook/)，我们使用以下官方 hooks：

#### **[useConnectionQualityIndicator](https://docs.livekit.io/reference/components/react/hook/useconnectionqualityindicator/)**
```tsx
function CustomConnectionQuality() {
  const { quality } = useConnectionQualityIndicator();
  
  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-yellow-400';
      case 'poor': return 'text-orange-400';
      case 'unknown': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };
  
  const getQualityText = (quality: string) => {
    switch (quality) {
      case 'excellent': return '优秀';
      case 'good': return '良好';
      case 'poor': return '较差';
      case 'unknown': return '未知';
      default: return '未知';
    }
  };
  
  return (
    <span className={`text-sm font-medium ${getQualityColor(quality)}`}>
      {getQualityText(quality)}
    </span>
  );
}
```

#### **[useLocalParticipant](https://docs.livekit.io/reference/components/react/hook/uselocalparticipant/)**
```tsx
function CustomParticipantName() {
  const { localParticipant } = useLocalParticipant();
  
  if (!localParticipant) return <span className="text-gray-400">未知</span>;
  
  return (
    <span className="text-green-400 font-medium">
      {localParticipant.name || localParticipant.identity || '操作员'}
    </span>
  );
}
```

### 2. 正确的组件使用方式

#### 在参与者上下文中使用组件
```tsx
// ✅ 正确：在 ParticipantTile 上下文中
<GridLayout tracks={tracks} className="h-full">
  <div className="relative group">
    <ParticipantTile className="rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl" />
    {/* 参与者信息覆盖层 */}
    <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-xl p-3 border border-white/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ParticipantName className="text-white font-medium" />
          <ConnectionQualityIndicator />
        </div>
        <div className="text-xs text-gray-300">挖掘机端</div>
      </div>
    </div>
  </div>
</GridLayout>
```

#### 在房间上下文中使用自定义组件
```tsx
// ✅ 正确：使用自定义组件
<div className="flex justify-between items-center">
  <span className="text-gray-300">操作员</span>
  <CustomParticipantName />
</div>

<div className="flex justify-between items-center">
  <span className="text-gray-300">连接质量</span>
  <CustomConnectionQuality />
</div>
```

## 📚 官方 Hooks 参考

### 核心 Hooks

#### **[useDataChannel](https://docs.livekit.io/reference/components/react/hook/usedatachannel/)**
- **功能**: 发送和接收数据通道消息
- **使用**: 发送控制指令到挖掘机
```tsx
const { send } = useDataChannel();
send(new TextEncoder().encode(JSON.stringify(command)), { reliable: true });
```

#### **[useConnectionQualityIndicator](https://docs.livekit.io/reference/components/react/hook/useconnectionqualityindicator/)**
- **功能**: 获取连接质量信息
- **返回**: `{ className, quality }`
- **使用**: 显示连接质量状态

#### **[useLocalParticipant](https://docs.livekit.io/reference/components/react/hook/uselocalparticipant/)**
- **功能**: 获取本地参与者信息
- **返回**: 本地参与者的详细信息
- **使用**: 显示操作员信息

#### **[useRoomContext](https://docs.livekit.io/reference/components/react/hook/useroomcontext/)**
- **功能**: 获取房间上下文
- **返回**: 房间实例
- **使用**: 访问房间状态和方法

### 其他有用的 Hooks

#### **[useParticipants](https://docs.livekit.io/reference/components/react/hook/useparticipants/)**
- **功能**: 获取所有参与者列表
- **使用**: 显示房间中的参与者

#### **[useParticipantPermissions](https://docs.livekit.io/reference/components/react/hook/useparticipantpermissions/)**
- **功能**: 获取参与者权限
- **使用**: 检查用户权限

#### **[useParticipantAttributes](https://docs.livekit.io/reference/components/react/hook/useparticipantattributes/)**
- **功能**: 获取参与者属性
- **使用**: 显示自定义参与者信息

## 🏗️ 组件架构

### 上下文层次结构
```
LiveKitRoom (根组件)
├── RoomContext (房间上下文)
│   ├── ParticipantContext (参与者上下文) - 仅在特定组件中
│   │   ├── ParticipantName ✅
│   │   └── ConnectionQualityIndicator ✅
│   └── 自定义组件 (使用 hooks)
│       ├── CustomParticipantName ✅
│       └── CustomConnectionQuality ✅
```

### 最佳实践

1. **在正确的上下文中使用组件**
   - `ParticipantName` 和 `ConnectionQualityIndicator` 需要在参与者上下文中
   - 使用 `ParticipantTile` 或 `ParticipantContext` 提供上下文

2. **使用 Hooks 创建自定义组件**
   - 当组件不在正确上下文中时，使用相应的 hooks
   - 创建自定义组件来显示相同的信息

3. **错误处理**
   - 检查 hooks 返回值是否为 null
   - 提供默认值和错误状态

## 🎨 样式组件

根据 [LiveKit 样式组件文档](https://docs.livekit.io/reference/components/react/concepts/style-components/)，我们可以：

1. **自定义样式**: 通过 className 属性
2. **主题定制**: 使用 CSS 变量
3. **响应式设计**: 使用 Tailwind CSS 类

## 🚀 性能优化

1. **避免不必要的重渲染**: 使用 hooks 而不是直接访问组件
2. **条件渲染**: 检查数据可用性
3. **错误边界**: 处理组件错误

## 📖 参考资源

- [LiveKit React Hooks](https://docs.livekit.io/reference/components/react/hook/)
- [LiveKit 构建块](https://docs.livekit.io/reference/components/react/concepts/building-blocks/)
- [LiveKit 样式组件](https://docs.livekit.io/reference/components/react/concepts/style-components/)
- [useDataChannel](https://docs.livekit.io/reference/components/react/hook/usedatachannel/)
- [useConnectionQualityIndicator](https://docs.livekit.io/reference/components/react/hook/useconnectionqualityindicator/)
- [useLocalParticipant](https://docs.livekit.io/reference/components/react/hook/uselocalparticipant/)

通过正确使用官方 hooks 和组件，我们避免了上下文错误，同时保持了代码的清晰性和可维护性！
