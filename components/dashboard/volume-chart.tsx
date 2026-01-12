'use client'

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts"

type ChartData = {
    time: string
    requests: number
}

export function VolumeChart({ data }: { data: ChartData[] }) {
    if (!data || data.length === 0) {
        return (
            <div className="flex h-[300px] w-full items-center justify-center text-muted-foreground">
                No data available
            </div>
        )
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <XAxis
                    dataKey="time"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--border)',
                        borderRadius: '0.5rem',
                        color: 'var(--foreground)'
                    }}
                    itemStyle={{ color: 'var(--foreground)' }}
                />
                <Area
                    type="monotone"
                    dataKey="requests"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRequests)"
                />
            </AreaChart>
        </ResponsiveContainer>
    )
}
