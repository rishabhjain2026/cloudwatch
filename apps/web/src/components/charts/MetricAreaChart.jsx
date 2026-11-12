import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const tooltipStyle = {
  background: 'var(--ip-surface-overlay)',
  border: '1px solid var(--ip-border)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--ip-text)',
};

export function MetricAreaChart({
  data,
  dataKey = 'value',
  color = 'var(--ip-accent)',
  unit = '%',
  height = 220,
}) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--ip-grid-line)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--ip-text-subtle)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: 'var(--ip-text-subtle)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
            domain={[0, 'auto']}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [`${value}${unit}`, 'Value']}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#fill-${dataKey})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
