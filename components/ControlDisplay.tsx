"use client";

import { ExcavatorControls } from "../hooks/useExcavatorGamepad";

interface ControlDisplayProps {
  controls: ExcavatorControls;
}

export const ControlDisplay: React.FC<ControlDisplayProps> = ({ controls }) => {
  const formatValue = (value: number) => {
    return (value * 100).toFixed(0);
  };

  const getValueColor = (value: number) => {
    if (Math.abs(value) < 0.1) return "text-gray-400";
    if (value > 0) return "text-green-400";
    return "text-red-400";
  };

  const getProgressBarColor = (value: number) => {
    if (Math.abs(value) < 0.1) return "bg-gray-600";
    if (value > 0) return "bg-gradient-to-r from-green-500 to-green-400";
    return "bg-gradient-to-r from-red-500 to-red-400";
  };

  const ControlItem = ({ label, value, icon }: { label: string; value: number; icon: string }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{icon}</span>
          <span className="text-sm text-gray-300">{label}</span>
        </div>
        <span className={`text-sm font-medium ${getValueColor(value)}`}>
          {formatValue(value)}%
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full transition-all duration-200 ${getProgressBarColor(value)}`}
          style={{ width: `${Math.abs(value) * 100}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* 履带控制 */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-blue-400 flex items-center">
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
          履带控制
        </h4>
        <div className="space-y-3">
          <ControlItem label="左履带" value={controls.leftTrack} icon="🔄" />
          <ControlItem label="右履带" value={controls.rightTrack} icon="🔄" />
        </div>
      </div>

      {/* 工作装置控制 */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-yellow-400 flex items-center">
          <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full mr-2"></span>
          工作装置
        </h4>
        <div className="space-y-3">
          <ControlItem label="驾驶室旋转" value={controls.swing} icon="🔄" />
          <ControlItem label="大臂" value={controls.boom} icon="⬆️" />
          <ControlItem label="小臂" value={controls.stick} icon="↔️" />
          <ControlItem label="铲斗" value={controls.bucket} icon="🪣" />
        </div>
      </div>
    </div>
  );
};
