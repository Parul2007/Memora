'use client';
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';

interface EmotionalHistoryData {
  dates: string[];
  values: number[];
}

interface Props {
  height?: number;
  showAnnotations?: boolean;
  data?: EmotionalHistoryData;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const sentiment = payload[0].value as number;
    return (
      <div style={{ backgroundColor: 'white', padding: '12px', border: '1px solid #e7e5e4', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', maxWidth: '200px' }}>
        <div style={{ fontSize: '12px', color: '#78716c', marginBottom: '4px' }}>{label}</div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: sentiment > 0 ? '#22c55e' : sentiment < 0 ? '#ef4444' : '#78716c' }}>
          Score: {sentiment.toFixed(2)}
        </div>
      </div>
    );
  }
  return null;
};

export default function EmotionalJourneyChart({ height = 250, showAnnotations = false, data }: Props) {
  // Transform API shape { dates[], values[] } into recharts-friendly [{ date, sentiment }]
  const chartData = (data?.dates ?? []).map((date, i) => ({
    date,
    sentiment: data?.values[i] ?? 0,
  }));

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716c' }} dy={10} />
          <YAxis domain={[-1, 1]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716c' }} ticks={[-1, -0.5, 0, 0.5, 1]} />
          <ReferenceLine y={0} stroke="#a8a29e" strokeDasharray="3 3" />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="sentiment"
            stroke="#11120D"
            strokeWidth={3}
            dot={{ r: 4, strokeWidth: 2, fill: 'white' }}
            activeDot={{ r: 6, strokeWidth: 0, fill: '#11120D' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
