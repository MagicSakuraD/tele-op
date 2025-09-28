"use client";

import { useState, useEffect, useRef } from "react";

// 设备类型枚举
export enum DeviceType {
  EXCAVATOR = 'excavator',
  WHEEL_LOADER = 'wheel_loader'
}

// 北通BTP-BD2E手柄控制状态接口
export interface BetopControls {
  rotation: number; // 方向盘旋转: -1 (左) to 1 (右)
  brake: number; // 刹车: 0 (松开) to 1 (踩死)
  throttle: number; // 油门: 0 (松开) to 1 (踩死)
  gear: string; // 档位: 'P' | 'R' | 'N' | 'D'
  boom: number; // 大臂: -1 (降) to 1 (提)
  bucket: number; // 铲斗: -1 (收) to 1 (翻)
}

// 统一控制接口
export interface UnifiedVehicleControls {
  // 装载机专用控制
  rotation: number; // 方向盘旋转: -1 (左) to 1 (右)
  brake: number; // 刹车: 0 (松开) to 1 (踩死)
  throttle: number; // 油门: 0 (松开) to 1 (踩死)
  gear: string; // 档位: 'P' | 'R' | 'N' | 'D'
  
  // 共用控制
  boom: number; // 大臂: -1 (降) to 1 (提)
  bucket: number; // 铲斗: -1 (收) to 1 (翻)
  
  // 兼容性属性（设为默认值）
  leftTrack: number; // 左履带: -1 (后) to 1 (前)
  rightTrack: number; // 右履带: -1 (后) to 1 (前)
  swing: number; // 驾驶室旋转: -1 (左) to 1 (右)
  stick: number; // 小臂: -1 (收) to 1 (伸)
  
  // 设备类型标识
  deviceType: DeviceType;
}

// 北通手柄映射配置（被识别为Xbox手柄）
const BETOP_MAPPING = {
  ID_KEYWORDS: ['BTP-BD2E', 'Xbox', 'Microsoft', 'Controller'], // 支持多种识别方式
  AXIS: {
    STEER: 0,     // ax0 左右方向
    THROTTLE_BRAKE: 1, // ax1 油门/刹车合并：-1油门最大，1刹车最大
    BUCKET: 2,    // ax2 铲斗
    BOOM: 3,      // ax3 大臂：-1降，1提
  },
  BUTTONS: {
    R: 0, // btn0 倒挡 (A按钮)
    N: 1, // btn1 空挡 (B按钮)
    D: 2, // btn2 前进挡 (X按钮)
    P: 3, // btn3 P挡 (Y按钮)
  }
};

// 死区，避免摇杆轻微晃动产生误操作
const DEADZONE = 0.1;

/**
 * 标准化普通摇杆轴的函数
 * @param value - 原始轴值 (-1 to 1)
 * @returns - 处理死区后的值
 */
const normalizeAxisValue = (value: number): number => {
  return Math.abs(value) > DEADZONE ? value : 0;
};

// 北通手柄控制钩子
export const useBetopGamepad = () => {
  const [controls, setControls] = useState<BetopControls>({
    rotation: 0,
    brake: 0,
    throttle: 0,
    gear: 'P',
    boom: 0,
    bucket: 0,
  });

  const animationFrameRef = useRef<number | null>(null);
  const currentGearRef = useRef<string>('P'); // 使用 ref 存储当前档位，避免闭包陷阱

  useEffect(() => {
    let isActive = true;

    const updateControls = () => {
      if (!isActive) return;

      const gamepads = navigator.getGamepads();
      // 查找手柄（支持北通和Xbox识别）
      let gp: Gamepad | null = null;
      for (const g of gamepads) {
        if (!g) continue;
        // 检查是否匹配任何关键字
        const isMatch = BETOP_MAPPING.ID_KEYWORDS.some(keyword => 
          g.id.toLowerCase().includes(keyword.toLowerCase())
        );
        if (isMatch) {
          gp = g; 
          break;
        }
      }

      if (gp) {
        // 首次识别日志
        if ((window as any).__last_gamepad_id__ !== gp.id) {
          (window as any).__last_gamepad_id__ = gp.id;
          console.log("[Gamepad] detected:", gp.id, "axes:", gp.axes.length, "buttons:", gp.buttons.length);
        }

        let rotation = 0;
        let throttle = 0;
        let brake = 0;
        let boom = controls.boom ?? 0;
        let bucket = controls.bucket ?? 0;

        // 手柄轴映射（支持北通和Xbox）
        rotation = normalizeAxisValue(gp.axes[BETOP_MAPPING.AXIS.STEER] || 0);
        const tBrake = gp.axes[BETOP_MAPPING.AXIS.THROTTLE_BRAKE] || 0; // -1..1
        // -1 = full throttle, 1 = full brake
        throttle = parseFloat((((-tBrake + 1) / 2)).toFixed(2)); // -1..1 -> 1..0
        brake = parseFloat((((tBrake + 1) / 2)).toFixed(2));     // -1..1 -> 0..1
        bucket = normalizeAxisValue(gp.axes[BETOP_MAPPING.AXIS.BUCKET] || 0);
        boom = normalizeAxisValue(gp.axes[BETOP_MAPPING.AXIS.BOOM] || 0);

        const newControls: BetopControls = {
          rotation,
          brake,
          throttle,
          gear: currentGearRef.current, // 使用 ref 中的最新档位值，避免闭包陷阱
          boom,
          bucket,
        };

        // 检查档位按钮（按下时切换，松开时保持）
        const lastButtonStates = (window as any).__last_button_states__ || {};
        const currentButtonStates = {
          P: gp.buttons[BETOP_MAPPING.BUTTONS.P]?.pressed || false,
          R: gp.buttons[BETOP_MAPPING.BUTTONS.R]?.pressed || false,
          N: gp.buttons[BETOP_MAPPING.BUTTONS.N]?.pressed || false,
          D: gp.buttons[BETOP_MAPPING.BUTTONS.D]?.pressed || false,
        };
        
        // 检测按钮从"未按下"变为"按下"的瞬间
        let gearChanged = false;
        if (currentButtonStates.P && !lastButtonStates.P) {
          newControls.gear = 'P';
          currentGearRef.current = 'P'; // 更新 ref 中的档位值
          gearChanged = true;
          console.log('[Gear] 切换到 P档');
        } else if (currentButtonStates.R && !lastButtonStates.R) {
          newControls.gear = 'R';
          currentGearRef.current = 'R'; // 更新 ref 中的档位值
          gearChanged = true;
          console.log('[Gear] 切换到 R档');
        } else if (currentButtonStates.N && !lastButtonStates.N) {
          newControls.gear = 'N';
          currentGearRef.current = 'N'; // 更新 ref 中的档位值
          gearChanged = true;
          console.log('[Gear] 切换到 N档');
        } else if (currentButtonStates.D && !lastButtonStates.D) {
          newControls.gear = 'D';
          currentGearRef.current = 'D'; // 更新 ref 中的档位值
          gearChanged = true;
          console.log('[Gear] 切换到 D档');
        }
        
        // 如果没有档位变化，保持当前档位（newControls.gear已经是正确的值）
        
        // 简化的调试信息（只在档位变化时打印）
        if (gearChanged) {
          console.log(`[Gamepad] 档位切换: ${controls.gear} -> ${newControls.gear}`);
        }
        
        // 如果没有按钮按下，保持当前档位不变
        (window as any).__last_button_states__ = currentButtonStates;

        // 使用函数式更新，避免依赖 controls 状态
        setControls(prevControls => {
          const hasChanged = Object.keys(newControls).some(key => {
            if (key === 'gear') {
              return newControls[key] !== prevControls[key];
            }
            const newValue = newControls[key as keyof BetopControls];
            const prevValue = prevControls[key as keyof BetopControls];
            if (typeof newValue === 'number' && typeof prevValue === 'number') {
              return Math.abs(newValue - prevValue) > 0.01;
            }
            return newValue !== prevValue;
          });
          
          // 只有在有变化时才更新状态，避免无限循环
          return hasChanged ? newControls : prevControls;
        });
      }

      if (isActive) {
        animationFrameRef.current = requestAnimationFrame(updateControls);
      }
    };

    // 开始轮询
    updateControls();

    // 清理函数
    return () => {
      isActive = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []); // 空依赖数组，只在组件挂载时运行一次

  return controls;
};

// 统一控制钩子 - 返回完整的 UnifiedVehicleControls
export const useUnifiedVehicleGamepad = (deviceType: DeviceType): UnifiedVehicleControls => {
  const betopControls = useBetopGamepad();

  return {
    // 装载机专用控制
    rotation: betopControls.rotation,
    brake: betopControls.brake,
    throttle: betopControls.throttle,
    gear: betopControls.gear,
    
    // 共用控制
    boom: betopControls.boom,
    bucket: betopControls.bucket,
    
    // 兼容性属性（设为默认值）
    leftTrack: 0,
    rightTrack: 0,
    swing: 0,
    stick: 0,
    
    // 设备类型
    deviceType: DeviceType.WHEEL_LOADER,
  };
};

// 为了向后兼容，保留原有的钩子名称
export const useWheelLoaderGamepad = useBetopGamepad;
export const useExcavatorGamepad = useBetopGamepad;
export const useVehicleGamepad = useUnifiedVehicleGamepad;