import React from 'react';

interface RadialChartProps {
  data: {
    label: string;
    value: number;
    max: number;
    color?: string;
  }[];
  size?: number;
  strokeWidth?: number;
  showLabels?: boolean;
  centerContent?: React.ReactNode;
}

const RadialChart: React.FC<RadialChartProps> = ({
  data,
  size = 200,
  strokeWidth = 8,
  showLabels = true,
  centerContent,
}) => {
  const center = size / 2;
  const radius = (size - strokeWidth) / 2 - 10;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(51, 65, 85, 0.3)"
          strokeWidth={strokeWidth}
        />
        
        {/* Data segments */}
        {data.map((item, index) => {
          const percentage = (item.value / item.max) * 100;
          const offset = circumference - (percentage / 100) * circumference;
          const color = item.color || '#FF6B35';
          
          return (
            <circle
              key={index}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
              style={{
                transformOrigin: `${center}px ${center}px`,
              }}
            />
          );
        })}
      </svg>
      
      {/* Center content */}
      {centerContent && (
        <div className="absolute inset-0 flex items-center justify-center">
          {centerContent}
        </div>
      )}
      
      {/* Labels */}
      {showLabels && (
        <div className="absolute -bottom-8 left-0 right-0 flex flex-wrap justify-center gap-3 text-xs">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color || '#FF6B35' }}
              />
              <span className="text-slate-400">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RadialChart;

