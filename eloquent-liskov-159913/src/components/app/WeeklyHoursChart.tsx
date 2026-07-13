import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

type WeeklyHoursPoint = {
  label: string;
  hours: number;
};

interface WeeklyHoursChartProps {
  data: WeeklyHoursPoint[];
  weeklyTarget: number;
}

export default function WeeklyHoursChart({ data, weeklyTarget }: WeeklyHoursChartProps) {
  return (
    <>
      <ResponsiveContainer width="100%" height={110}>
        <BarChart data={data} barSize={18} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted)/0.4)" }}
            contentStyle={{
              fontSize: 11,
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--card))",
              color: "hsl(var(--foreground))",
            }}
            formatter={(value: number) => [`${value}h`, "Hours"]}
          />
          <ReferenceLine
            y={weeklyTarget}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="3 3"
            strokeOpacity={0.4}
          />
          <Bar
            dataKey="hours"
            radius={[4, 4, 0, 0]}
            fill="hsl(var(--primary))"
            opacity={0.85}
          />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-muted-foreground text-center mt-1">
        Dashed line = {weeklyTarget}h weekly target
      </p>
    </>
  );
}
