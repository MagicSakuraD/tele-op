'use client';

import {
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  TrackLoop,
  useRoomContext,
  useConnectionQualityIndicator,
  useConnectionState,
} from '@livekit/components-react';
import { useDataChannel } from '@livekit/components-react';
import { Track, VideoQuality, TrackEvent } from 'livekit-client';
import '@livekit/components-styles';
import { useEffect, useRef, useState } from 'react';
import { useUnifiedVehicleGamepad, DeviceType } from '../../hooks/useExcavatorGamepad';
import type { UnifiedVehicleControls } from '../../hooks/useExcavatorGamepad';

export default function Page() {
  // 挖掘机远程控制房间
  const room = process.env.NEXT_PUBLIC_ROOM_NAME || 'excavator-control-room';
  const name = 'operator-console';
  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    let mounted = true;
    (async () => {
      try {
        const resp = await fetch(`/api/token?room=${room}&username=${name}`);
        const data = await resp.json();
        if (!mounted) return;
        if (data.token) {
          setToken(data.token);
          // 使用本地Docker LiveKit服务器
          setServerUrl('ws://192.168.3.41:7880');
        }
      } catch (e) {
        console.error(e);
      }
    })();
  
    return () => {
      mounted = false;
    };
  }, [isClient]);

  if (!isClient || token === '' || serverUrl === '') {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl">🚜</span>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg font-medium">正在连接到挖掘机控制系统...</p>
          <p className="text-sm text-gray-400 mt-2">请稍候</p>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      options={{
        adaptiveStream: {
          pixelDensity: 1,  // 修复：避免4K视频流，减少带宽消耗
        },
        dynacast: true,
        // 启用带宽自适应
        // 已在 adaptiveStream 字段的对象内设置，因此无需再次设置为 true
        // adaptiveStream: true,  // 已指定详细配置，避免重复
      }}
      onConnected={() => console.log('Connected to excavator room')}
      onDisconnected={() => console.log('Disconnected from excavator room')}
    >
      <div data-lk-theme="default" className="h-screen bg-gray-900">
        <ExcavatorControlInterface />
      </div>
    </LiveKitRoom>
  );
}


// 自定义参与者名称显示组件
function CustomParticipantName() {
  const room = useRoomContext();
  const localParticipant = room?.localParticipant;
  
  if (!localParticipant) return <span className="text-gray-400">未知</span>;
  
  return (
    <span className="text-green-400 font-medium">
      {localParticipant.name || localParticipant.identity || '操作员'}
    </span>
  );
}

function ExcavatorControlInterface() {
  const room = useRoomContext();
  const controls = useUnifiedVehicleGamepad(DeviceType.WHEEL_LOADER);

  useEffect(() => {
    console.log('UnifiedVehicleControls =>', controls);
  }, [controls]);

  // DataChannel: 分 topic 发送（analog: lossy, gear: reliable）
  const { send: sendAnalog } = useDataChannel('controls/analog', (msg) => {
    console.log('Analog message received:', msg);
  });
  const { send: sendGear } = useDataChannel('controls/gear', (msg) => {
    console.log('Gear message received:', msg);
  });

  // 发送档位（低频，可靠）
  const lastGearRef = useRef<string | null>(null);
  useEffect(() => {
    // 只有装载机有意义；挖掘机忽略
    if (!room || room.state !== 'connected') return;
    if (!controls.gear) return;
    if (controls.gear === lastGearRef.current) return;
    try {
      const payload = {
        t: Date.now(),
        type: 'gear',
        device: controls.deviceType,
        gear: controls.gear,
      };
      const bytes = new TextEncoder().encode(JSON.stringify(payload));
      sendGear?.(bytes, { reliable: true });
      lastGearRef.current = controls.gear;
    } catch (e) {
      console.warn('send gear failed', e);
    }
  }, [room, room?.state, controls.gear, controls.deviceType, sendGear]);

  // 发送连续量（高频，可丢）
  const lastAnalogRef = useRef<any | null>(null);
  useEffect(() => {
    if (!room || room.state !== 'connected') return;
    const fps = 15;  // 优化：15fps对远程操控足够，减少网络负载
    const epsilon = 0.05; // 优化：5%死区，过滤手柄摇杆物理噪音
    let timer: number | null = null;

    const tick = () => {
      const prev = lastAnalogRef.current;
      const v = {
        leftTrack: controls.leftTrack,
        rightTrack: controls.rightTrack,
        swing: controls.swing,
        stick: controls.stick,
        boom: controls.boom,
        bucket: controls.bucket,
        rotation: controls.rotation,
        brake: controls.brake,
        throttle: controls.throttle,
      };

      const keys = Object.keys(v) as (keyof typeof v)[];
      const changed = !prev || keys.some((k) => {
        const a = Number(prev[k] ?? 0);
        const b = Number(v[k] ?? 0);
        return Math.abs(a - b) > epsilon;
      });

      if (changed) {
        try {
          const payload = {
            t: Date.now(),
            type: 'analog',
            device: controls.deviceType,
            v,
          };
          const bytes = new TextEncoder().encode(JSON.stringify(payload));
          sendAnalog?.(bytes, { reliable: false });
          lastAnalogRef.current = v;
          // 只在有显著变化时打印
          const significantChanges = keys.filter(k => {
            const a = Number(prev?.[k] ?? 0);
            const b = Number(v[k] ?? 0);
            return Math.abs(a - b) > 0.1;
          });
          if (significantChanges.length > 0) {
            console.log(`[Control] 发送控制指令: ${significantChanges.join(', ')}`);
          }
        } catch (e) {
          console.warn('send analog failed', e);
        }
      }
    };

    timer = window.setInterval(tick, Math.max(10, Math.floor(1000 / fps))) as unknown as number;
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [room, room?.state, controls, sendAnalog]);

  return (
    <div className="h-full relative bg-black overflow-hidden">
      <ExcavatorVideoStream />
      <RoomAudioRenderer />

      </div>
  );
}

// 延迟监控组件
function LatencyMonitor() {
  const room = useRoomContext();
  const [latency, setLatency] = useState<number | null>(null);
  
  useEffect(() => {
    if (!room) return;
    
    const updateLatency = () => {
      // 获取连接质量信息
      const connectionQuality = room.localParticipant?.connectionQuality;
      if (connectionQuality) {
        // 根据连接质量估算延迟
        let estimatedLatency: number;
        switch (connectionQuality) {
          case 'excellent':
            estimatedLatency = 20;
            break;
          case 'good':
            estimatedLatency = 50;
            break;
          case 'poor':
            estimatedLatency = 100;
            break;
          default:
            estimatedLatency = 150;
        }
        setLatency(estimatedLatency);
      }
    };
    
    updateLatency();
    
    // 监听连接质量变化
    const interval = setInterval(updateLatency, 1000);
    return () => clearInterval(interval);
  }, [room]);
  
  if (latency === null) return null;
  
  const getLatencyColor = (latency: number) => {
    if (latency < 50) return 'text-green-400';
    if (latency < 100) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/60">网络延迟:</span>
      <span className={`font-mono ${getLatencyColor(latency)}`}>
        {latency}ms
      </span>
    </div>
  );
}

// 视频分辨率信息组件
function VideoResolutionInfo() {
  const room = useRoomContext();
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }], { onlySubscribed: true });
  const [resolution, setResolution] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // 稳定选取一个远程视频轨（避免依赖整个 tracks 数组导致频繁重跑）
  const videoTrack: any = (() => {
    const remoteVideo = tracks.find(
      (t) => !t.participant.isLocal && (t.publication?.kind === 'video' || t.source === Track.Source.Camera)
    );
    return remoteVideo?.publication?.track as any;
  })();

  useEffect(() => {
    if (!videoTrack) return;

    const ms: MediaStreamTrack | undefined = videoTrack.mediaStreamTrack;
    const safeSet = (w?: number, h?: number) => {
      if (!w || !h) return;
      setResolution((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };

    // 初始读取 settings
    const s = ms?.getSettings?.();
    safeSet(s?.width as number | undefined, s?.height as number | undefined);

    const onDims = () => {
      const dims = (videoTrack as any).dimensions;
      if (dims?.width && dims?.height) safeSet(dims.width, dims.height);
      else {
        const s2 = ms?.getSettings?.();
        safeSet(s2?.width as number | undefined, s2?.height as number | undefined);
      }
    };

    videoTrack.on?.(TrackEvent.VideoDimensionsChanged, onDims);
    return () => {
      videoTrack.off?.(TrackEvent.VideoDimensionsChanged, onDims);
    };
  }, [videoTrack]);

  if (!resolution.w || !resolution.h) return null;

  return (
    <div className="flex items-center justify-between">
      <span className="text-white/60">视频分辨率:</span>
      <span className="font-mono text-green-400">
        {resolution.w}x{resolution.h}
      </span>
    </div>
  );
}


// 精简页面需求：只负责远程视频与状态显示

function ExcavatorVideoStream() {
  const room = useRoomContext();
  
  // 获取所有远程参与者
  const remoteParticipants = room?.remoteParticipants || new Map();
  
  // 获取所有相机轨道（包含本地/占位），随后手动过滤
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: false }],
    { onlySubscribed: true }
  );

  // 简化视频调试信息（保留关键）
  console.log('[Video] state=', room?.state, 'participants=', remoteParticipants.size, 'tracks=', tracks.length);
  
  // 详细分析每个远程参与者
  // if (remoteParticipants.size > 0) {
  //   console.log('🔍 远程参与者详细信息:');
  //   remoteParticipants.forEach((participant, identity) => {
  //     console.log(`  - 参与者: ${identity}`);
  //     console.log(`    - 连接质量: ${participant.connectionQuality}`);
  //     console.log(`    - 发布的轨道数量: ${participant.trackPublications.size}`);
      
  //     // 检查每个发布的轨道
  //     participant.trackPublications.forEach((publication, trackSid) => {
  //       console.log(`    - 轨道 ${trackSid}:`);
  //       console.log(`      - 类型: ${publication.kind}`);
  //       console.log(`      - 来源: ${publication.source}`);
  //       console.log(`      - 是否订阅: ${publication.isSubscribed}`);
  //       console.log(`      - 是否启用: ${publication.isEnabled}`);
  //       console.log(`      - 是否静音: ${publication.isMuted}`);
  //       console.log(`      - 轨道状态: ${publication.track ? '已连接' : '未连接'}`);
  //     });
  //   });
  // }
  
  // 仅保留远程的视频相机轨
  const remoteVideoTracks = tracks.filter((t) => !t.participant.isLocal && (t.publication?.kind === 'video' || t.source === Track.Source.Camera));
  
  // 简化的视频状态日志
  if (remoteVideoTracks.length === 0 && remoteParticipants.size > 0) {
    console.log('[Video] 有远程参与者但无视频轨道');
  }

  const hasVideo = remoteVideoTracks.length > 0;
  const hasRemoteParticipants = remoteParticipants.size > 0;
  const connectionStatus = hasRemoteParticipants ? (hasVideo ? "connected" : "connecting") : "disconnected";

  // 状态变化监控
  // console.log('[Video summary]', { state: connectionStatus, hasRemoteParticipants, hasVideo });

  const containerRef = useRef<HTMLDivElement | null>(null);

  // 视频分辨率信息已在UI上显示，无需console输出

  return (
    <div ref={containerRef} className="relative w-screen h-screen overflow-hidden bg-black">
      {/* 退出按钮 - 右上角 */}
      <div className="absolute top-6 right-6 z-10">
        <button 
          onClick={() => window.location.href = '/'}
          className="backdrop-blur-md bg-black/30 hover:bg-black/50 rounded-xl p-3 transition-all duration-300 border border-white/20 hover:border-white/40"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 主视频区域 */}
      <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center">
        {hasVideo ? (
          <div className="w-full h-full">
            <TrackLoop tracks={remoteVideoTracks}>
              <ParticipantTile className="w-full h-full object-cover" />
            </TrackLoop>
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
            <div className="text-center text-white/30">
              <div className="text-6xl mb-4">🚜</div>
              <p className="text-xl">
                {connectionStatus === "connecting"
                  ? "正在连接视频流..."
                  : "等待远程挖掘机连接..."}
              </p>
              <p className="text-sm opacity-75">1920x1080 @ 30fps</p>
            </div>
          </div>
        )}
      </div>

      {/* 网络状态指示器 - 左上角 */}
      <div className="absolute top-6 left-6 z-50">
        <div className="backdrop-blur-md bg-black/30 rounded-xl p-3 border border-white/20">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === "connected" ? "bg-green-400" : 
              connectionStatus === "connecting" ? "bg-yellow-400 animate-pulse" : 
              "bg-red-400"
            }`} />
            <span className="text-white text-sm font-medium">
              {connectionStatus === "connected" ? "已连接" : 
               connectionStatus === "connecting" ? "连接中" : "未连接"}
            </span>
            {connectionStatus === "connected" && (
              <span className="text-xs text-white/60 font-mono">Live</span>
            )}
          </div>
        </div>
      </div>

      {/* 连接状态详情 - 左下角 */}
      <div className="absolute bottom-6 left-6 z-50">
        <div className="backdrop-blur-md bg-black/30 rounded-xl p-4 min-w-[280px] border border-white/20">
          <div className="text-white/80 text-sm font-medium mb-3">
            连接状态
          </div>
          
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-white/60">房间状态:</span>
              <span className={`font-mono ${
                room?.state === 'connected' ? "text-green-400" : "text-red-400"
              }`}>
                {room?.state || 'unknown'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-white/60">远程参与者:</span>
              <span className={`font-mono ${
                remoteParticipants.size > 0 ? "text-green-400" : "text-white/40"
              }`}>
                {remoteParticipants.size}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-white/60">视频轨道:</span>
              <span className={`font-mono ${
                tracks.length > 0 ? "text-green-400" : "text-white/40"
              }`}>
                {tracks.length}
              </span>
            </div>
            
            {/* 视频分辨率信息 */}
            <VideoResolutionInfo />
            
            {/* 延迟监控信息 */}
            <LatencyMonitor />
          </div>
        </div>
      </div>

    </div>
  );
}
