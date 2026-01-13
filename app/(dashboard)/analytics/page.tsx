'use client'

import { VolumeChart } from '@/components/dashboard/volume-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, BarChart3, Clock, AlertTriangle, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'


export default function AnalyticsPage() {
    const [filterMethod, setFilterMethod] = useState('ALL')
    const [stats, setStats] = useState({
        totalRequests: 0,
        errorRate: 0,
        avgLatency: 0,
        successRate: 100
    })
    const [chartData, setChartData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    // Refactored Component Logic
    const [recentLogs, setRecentLogs] = useState<any[]>([])

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true)



            try {
                let query = supabase
                    .from('request_logs')
                    .select('status_code, duration_ms, created_at, method, body, query_params')
                    .order('created_at', { ascending: false })
                    .limit(1000)

                if (filterMethod !== 'ALL') {
                    query = query.eq('method', filterMethod)
                }

                const { data: logs, error } = await query

                if (error) {
                    console.error("Analytics Fetch Error:", error)
                }

                if (logs && logs.length > 0) {
                    setRecentLogs(logs)
                    const total = logs.length
                    const errors = logs.filter(l => l.status_code >= 400).length

                    // FXIED: Number casting
                    const totalLatency = logs.reduce((acc, curr) => acc + (Number(curr.duration_ms) || 0), 0)

                    setStats({
                        totalRequests: total,
                        errorRate: parseFloat(((errors / total) * 100).toFixed(2)),
                        avgLatency: Math.round(totalLatency / total),
                        successRate: parseFloat((((total - errors) / total) * 100).toFixed(2))
                    })

                    // Real Data for Chart: Latency over Time
                    const chart = logs.slice(0, 50).reverse().map((l) => ({
                        time: new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                        requests: Number(l.duration_ms) || 0
                    }))
                    setChartData(chart)

                } else {
                    setRecentLogs([])
                    setStats({
                        totalRequests: 0,
                        errorRate: 0,
                        avgLatency: 0,
                        successRate: 100
                    })
                    setChartData([])
                }
            } catch (e) {
                console.error("Unexpected error:", e)
            } finally {
                setLoading(false)
            }
        }

        fetchAnalytics()
    }, [filterMethod])

    const exportCSV = () => {
        if (recentLogs.length === 0) return

        const headers = ["ID", "Method", "Status", "Latency (ms)", "Created At", "Query", "Body"]
        const csvContent = [
            headers.join(","),
            ...recentLogs.map(log => [
                log.id || '',
                log.method,
                log.status_code,
                log.duration_ms,
                log.created_at,
                `"${JSON.stringify(log.query_params || {}).replace(/"/g, '""')}"`,
                `"${JSON.stringify(log.body || {}).replace(/"/g, '""')}"`
            ].join(","))
        ].join("\n")

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement("a")
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", `analytics_export_${new Date().toISOString()}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="p-8 space-y-8 animate-in">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">Usage Analytics</h2>
                    <p className="text-muted-foreground mt-1">Real-time API monitoring and health metrics.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline">Last 24 Hours</Button>
                    <Button variant="default" onClick={exportCSV} disabled={recentLogs.length === 0}>
                        <Download className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <select
                    className="bg-card border border-border rounded-md h-9 text-sm px-3 focus:outline-none focus:ring-1 focus:ring-primary w-[150px]"
                    value={filterMethod}
                    onChange={(e) => setFilterMethod(e.target.value)}
                >
                    <option value="ALL">All Methods</option>
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                </select>
                {/* Placeholder for future Environment filter */}
                <select className="bg-card border border-border rounded-md h-9 text-sm px-3 focus:outline-none focus:ring-1 focus:ring-primary opacity-50 cursor-not-allowed" disabled><option>Env: Production</option></select>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="glass-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">TOTAL REQUESTS</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                                <span className="text-4xl font-bold">{stats.totalRequests}</span>
                            )}
                        </div>
                        <div className="mt-4 h-1 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 w-[100%]"></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="glass-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">AVG. LATENCY</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                                <span className="text-4xl font-bold">{stats.avgLatency}ms</span>
                            )}
                        </div>
                        <div className="mt-4 h-1 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-500 w-[40%]"></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="glass-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">ERROR RATE</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                                <span className="text-4xl font-bold">{stats.errorRate}%</span>
                            )}
                        </div>
                        <div className="mt-4 h-1 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-red-500" style={{ width: `${Math.min(stats.errorRate, 100)}%` }}></div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="glass-card">
                <CardHeader>
                    <CardTitle>Request Latency Trend (Last 50)</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    <VolumeChart data={chartData} />
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-8">
                <Card className="glass-card">
                    <CardHeader><CardTitle>Status Code Distribution</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-green-500" /> Success</span>
                                <span>{stats.successRate}%</span>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${stats.successRate}%` }} /></div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500" /> Error</span>
                                <span>{stats.errorRate}%</span>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden"><div className="h-full bg-red-500" style={{ width: `${stats.errorRate}%` }} /></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="glass-card">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center p-8 text-muted-foreground text-sm">
                            Real-time data enabled
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
