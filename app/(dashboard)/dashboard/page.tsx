'use client'

import { VolumeChart } from '@/components/dashboard/volume-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, BarChart3, Clock, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function DashboardPage() {
    const [stats, setStats] = useState({
        totalRequests: 0,
        activeEndpoints: 0,
        errorRate: 0,
        avgLatency: 0
    })
    const [chartData, setChartData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)

            // Check for Mock Mode (Missing Env Vars)
            // @ts-ignore
            if (supabase.isMock) {
                console.log("Rendering Dashboard in Mock Mode")
                setStats({
                    activeEndpoints: 3,
                    totalRequests: 1250,
                    errorRate: 2.5,
                    avgLatency: 145
                })
                setChartData([])
                setLoading(false)
                return
            }

            // 1. Active Endpoints
            const { count: activeCount } = await supabase
                .from('endpoints')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true)

            // 2. Request stats
            // Fetch validation: limit to last 1000 to calculate avg latency/error rate clientside for MVP
            const { data: recentLogs, count: totalRequests } = await supabase
                .from('request_logs')
                .select('status_code, duration_ms', { count: 'exact' })
                .order('created_at', { ascending: false })
                .limit(1000)

            let errorRate = 0
            let avgLatency = 0

            if (recentLogs && recentLogs.length > 0) {
                const errors = recentLogs.filter(l => l.status_code >= 400).length
                errorRate = parseFloat(((errors / recentLogs.length) * 100).toFixed(1))

                const totalDur = recentLogs.reduce((acc, curr) => acc + (curr.duration_ms || 0), 0)
                avgLatency = Math.round(totalDur / recentLogs.length)
            }

            setStats({
                activeEndpoints: activeCount || 0,
                totalRequests: totalRequests || 0,
                errorRate,
                avgLatency
            })
            setChartData([])
            setLoading(false)
        }

        fetchData()
    }, [])

    return (
        <div className="p-8 space-y-8 animate-in">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">Overview</h2>
                    <p className="text-muted-foreground mt-1">Monitor your API performance and health.</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalRequests}</div>
                        <p className="text-xs text-muted-foreground">
                            Last 30 days
                        </p>
                    </CardContent>
                </Card>
                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Endpoints</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeEndpoints}</div>
                        <p className="text-xs text-muted-foreground">
                            Currently active
                        </p>
                    </CardContent>
                </Card>
                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.errorRate}%</div>
                        <p className="text-xs text-muted-foreground">
                            Last 24 hours
                        </p>
                    </CardContent>
                </Card>
                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Latency</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.avgLatency}ms</div>
                        <p className="text-xs text-muted-foreground">
                            Last 24 hours
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card className="col-span-4 glass-card">
                <CardHeader>
                    <CardTitle>Request Volume Over Time</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    <VolumeChart data={chartData} />
                </CardContent>
            </Card>
        </div>
    )
}
