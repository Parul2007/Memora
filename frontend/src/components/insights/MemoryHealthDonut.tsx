'use client';
import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fetchMemoryHealthBreakdown, MemoryHealthBreakdown } from '../../services/dashboardService';

export default function MemoryHealthDonut({ height = 200 }: { height?: number }) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetchMemoryHealthBreakdown().then((res: MemoryHealthBreakdown) => {
      setData([
        { name: 'Healthy', value: res.healthy, color: '#10b981' },
        { name: 'Fading', value: res.fading, color: '#f59e0b' },
        { name: 'Decayed', value: res.decayed, color: '#ef4444' }
      ]);
    }).catch(console.error);
  }, []);

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} 
            itemStyle={{ color: '#11120D', fontWeight: 600 }}
          />
          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
