import React from 'react';

interface RadarChartProps {
  data: {
    label: string;
    value: number;
    max: number;
    color?: string;
  }[];
  size?: number;
  levels?: number;
}

const RadarChart: React.FC<RadarChartProps> = ({
  data,
  size = 300,
  levels = 5,
}) => {
  const center = size / 2;
  const radius = size / 2 - 40;
  const angleStep = (2 * Math.PI) / data.length;

  // Generate points for each axis
  const getPoint = (index: number, distance: number) => {
    const angle = index * angleStep - Math.PI / 2;
    return {
      x: center + distance * Math.cos(angle),
      y: center + distance * Math.sin(angle),
    };
  };

  // Generate polygon points for data
  const dataPoints = data
    .map((item, index) => {
      const distance = (item.value / item.max) * radius;
      return getPoint(index, distance);
    })
    .map((p) => `${p.x},${p.y}`)
    .join(' ');

  // Generate background grid
  const gridLines = Array.from({ length: levels }, (_, i) => {
    const levelRadius = (radius * (i + 1)) / levels;
    const points = data
      .map((_, index) => getPoint(index, levelRadius))
      .map((p) => `${p.x},${p.y}`)
      .join(' ');
    return (
      <polygon
        key={i}
        points={points}
        fill="none"
        stroke="rgba(51, 65, 85, 0.2)"
        strokeWidth="1"
      />
    );
  });

  // Generate axis lines
  const axisLines = data.map((_, index) => {
    const point = getPoint(index, radius);
    return (
      <line
        key={index}
        x1={center}
        y1={center}
        x2={point.x}
        y2={point.y}
        stroke="rgba(51, 65, 85, 0.3)"
        strokeWidth="1"
      />
    );
  });

  // Generate labels
  const labels = data.map((item, index) => {
    const point = getPoint(index, radius + 20);
    const angle = index * angleStep - Math.PI / 2;
    return (
      <text
        key={index}
        x={point.x}
        y={point.y}
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-xs fill-slate-400 font-medium"
        transform={`rotate(${(angle * 180) / Math.PI + 90} ${point.x} ${point.y})`}
      >
        {item.label}
      </text>
    );
  });

  return (
    <div className="relative">
      <svg width={size} height={size} className="overflow-visible">
        {/* Background grid */}
        {gridLines}
        
        {/* Axis lines */}
        {axisLines}
        
        {/* Data area */}
        <polygon
          points={dataPoints}
          fill="rgba(255, 107, 53, 0.1)"
          stroke="rgba(255, 107, 53, 0.5)"
          strokeWidth="2"
          className="transition-all duration-1000 ease-out"
        />
        
        {/* Data points */}
        {data.map((item, index) => {
          const distance = (item.value / item.max) * radius;
          const point = getPoint(index, distance);
          return (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="4"
              fill={item.color || '#FF6B35'}
              stroke="white"
              strokeWidth="2"
              className="transition-all duration-1000 ease-out"
            />
          );
        })}
        
        {/* Labels */}
        {labels}
      </svg>
    </div>
  );
};

export default RadarChart;

