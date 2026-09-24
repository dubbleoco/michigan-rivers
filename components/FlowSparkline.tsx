"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";

interface Props {
  history: { dateTime: string; value: number }[];
  idealMin: number;
  idealMax: number;
  color: string;
}

export default function FlowSparkline({ history, idealMin, idealMax, color }: Props) {
  if (!history || history.length < 2) {
    return <div className="h-16 flex items-center justify-center text-xs text-gray-500">No trend data</div>;
  }

  const data = history.map((h) => ({
    t: h.dateTime,
    cfs: Math.round(h.value),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white shadow-lg">
          <div>{format(parseISO(d.t), "h:mm a")}</div>
          <div className="font-bold">{d.cfs.toLocaleString()} CFS</div>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={64}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.4} />
            <stop offset="95%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <YAxis domain={["auto", "auto"]} hide />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={idealMin} stroke="#22c55e" strokeDasharray="3 3" strokeWidth={1} />
        <ReferenceLine y={idealMax} stroke="#22c55e" strokeDasharray="3 3" strokeWidth={1} />
        <Area
          type="monotone"
          dataKey="cfs"
          stroke={color}
          strokeWidth={2}
          fill={`url(#grad-${color.replace("#", "")})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
