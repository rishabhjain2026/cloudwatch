import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

export function SeverityDonut({ data, height = 220 }) {
  return (
    <div style={{ width: '100%', height }} className="relative">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="84%"
            paddingAngle={3}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'var(--ip-surface-overlay)',
              border: '1px solid var(--ip-border)',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="font-display text-xl font-semibold text-text">
            {data.reduce((sum, d) => sum + d.value, 0)}
          </p>
          <p className="text-[11px] text-text-subtle">incidents</p>
        </div>
      </div>
    </div>
  );
}
