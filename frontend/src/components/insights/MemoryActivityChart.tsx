'use client';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface MemoryActivityData {
  dates: string[];
  counts: number[];
}

interface Props {
  height?: number;
  data?: MemoryActivityData;
}

export default function MemoryActivityChart({ height = 250, data }: Props) {
  // Transform API shape { dates[], counts[] } into recharts-friendly [{ date, count }]
  const chartData = (data?.dates ?? []).map((date, i) => ({
    date,
    count: data?.counts[i] ?? 0,
  }));

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716c' }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716c' }} />
          <Tooltip
            cursor={{ fill: '#f5f5f4' }}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          <Bar dataKey="count" name="Memories" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
