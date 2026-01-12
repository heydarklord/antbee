'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from 'date-fns'
import { RefreshCw, Clock, Wifi, Search, Hash, FileJson, ArrowRight, Activity } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { JsonEditor } from "@/components/ui/json-editor"

type RequestLog = {
    id: string
    method: string
    status_code: number
    duration_ms: number
    created_at: string
    query_params: any
    headers: any
    body: any
    endpoint?: { path: string }
}

export function RequestLogs({ endpointId }: { endpointId: string }) {
    const [logs, setLogs] = useState<RequestLog[]>([])
    const [selectedLog, setSelectedLog] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [detailTab, setDetailTab] = useState('overview')
    const activeDetailTab = (tab: string) => setDetailTab(tab)
    const supabase = createClient()

    // Key for localStorage
    const STORAGE_KEY = `request_logs_${endpointId}`

    useEffect(() => {
        // Load cached logs on mount
        const cached = localStorage.getItem(STORAGE_KEY)
        if (cached) {
            try {
                const parsed = JSON.parse(cached)
                setLogs(parsed)
                setLoading(false)
            } catch (e) { }
        }
    }, [endpointId])

    const fetchLogs = async () => {
        const { data, error } = await supabase
            .from('request_logs')
            .select('*')
            .eq('endpoint_id', endpointId)
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) {
            console.error("Error fetching logs:", error)
            setErrorMsg(error.message)
        } else {
            setErrorMsg(null)
            if (data) {
                setLogs(data)
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
            }
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchLogs()
        const interval = setInterval(fetchLogs, 3000)
        return () => clearInterval(interval)
    }, [endpointId])

    const getStatusColor = (code: number) => {
        if (code >= 200 && code < 300) return "text-green-500"
        if (code >= 300 && code < 400) return "text-blue-500"
        if (code >= 400 && code < 500) return "text-red-500"
        return "text-yellow-500"
    }

    const getStatusBg = (code: number) => {
        if (code >= 200 && code < 300) return "bg-green-500/10"
        if (code >= 300 && code < 400) return "bg-blue-500/10"
        if (code >= 400 && code < 500) return "bg-red-500/10"
        return "bg-yellow-500/10"
    }

    // Key-Value Table Component
    const KvTable = ({ data, title, icon: Icon }: { data: any, title: string, icon: any }) => {
        const entries = Object.entries(data || {})
        if (entries.length === 0) return null
        return (
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground/60">
                    <Icon className="w-3 h-3" />
                    <h3 className="text-[10px] font-bold uppercase tracking-wider">{title}</h3>
                </div>
                <div className="border border-white/5 rounded-md overflow-hidden bg-black/20">
                    {entries.map(([k, v], i) => (
                        <div key={k} className={`flex text-xs font-mono border-b border-white/5 last:border-0 ${i % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'}`}>
                            <div className="w-1/3 p-2 text-blue-400 border-r border-white/5 truncate shrink-0" title={k}>{k}</div>
                            <div className="w-2/3 p-2 text-white/80 break-all max-h-[60px] overflow-y-auto custom-scrollbar">{String(v)}</div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (loading && logs.length === 0) return <div className="p-8 flex flex-col items-center justify-center text-muted-foreground gap-2"><Activity className="animate-pulse" /><span>Listening for requests...</span></div>

    return (
        <div className="flex h-full flex-col bg-[#1e1e1e] min-h-0">
            {/* Toolbar */}
            <div className="flex-none flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#1e1e1e]">
                <div className="flex items-center gap-2 text-xs text-white/60">
                    <div className={`w-2 h-2 rounded-full ${errorMsg ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`} />
                    <span className="font-medium">{errorMsg ? 'Connection Error' : 'Live Traffic'}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-white/10 text-white/60" onClick={fetchLogs}>
                    <RefreshCw className="h-3 w-3" />
                </Button>
            </div>

            {errorMsg && (
                <div className="flex-none px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-[10px] text-red-500 flex items-center justify-center">
                    {errorMsg}
                </div>
            )}

            <div className="flex-1 flex overflow-hidden min-h-0">
                {/* Log List (Left) */}
                <div className={`w-[260px] border-r border-white/10 flex flex-col bg-[#1e1e1e] min-h-0 ${selectedLog ? 'hidden md:flex' : 'flex'}`}>
                    <div className="flex-1 overflow-y-auto min-h-0">
                        <div className="divide-y divide-white/5">
                            {logs.length === 0 && (
                                <div className="p-8 text-center text-xs text-white/30 italic">
                                    No requests recorded yet.
                                </div>
                            )}
                            {logs.map(log => (
                                <div
                                    key={log.id}
                                    className={`relative p-3 cursor-pointer transition-all hover:bg-white/5 group border-l-2 ${selectedLog === log.id ? 'bg-white/[0.08] border-primary' : 'border-transparent'}`}
                                    onClick={() => setSelectedLog(log.id)}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded text-white bg-white/10`}>
                                                {log.method}
                                            </span>
                                            <span className="text-[10px] text-white/40">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                                        </div>
                                        {selectedLog === log.id && <ArrowRight className="w-3 h-3 text-primary animate-in fade-in slide-in-from-left-2" />}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${getStatusColor(log.status_code)}`} />
                                            <span className={`text-xs font-mono font-bold ${getStatusColor(log.status_code)}`}>
                                                {log.status_code}
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-mono text-white/30 flex items-center gap-1">
                                            {log.duration_ms}ms
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Log Details (Right) */}
                <div className={`flex-1 flex flex-col bg-[#1e1e1e] min-h-0 ${!selectedLog ? 'hidden md:flex' : 'flex'}`}>
                    {selectedLog ? (
                        (() => {
                            const log = logs.find(l => l.id === selectedLog)!
                            return (
                                <div className="flex-1 flex flex-col min-h-0">
                                    {/* Summary Header - Always Visible */}
                                    <div className="flex-none p-6 border-b border-white/10 bg-[#1e1e1e]">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Badge variant="outline" className="bg-white/5 text-white border-white/10 font-mono text-sm px-3 py-1">{log.method}</Badge>
                                                    <span className={`font-mono text-2xl font-bold ${getStatusColor(log.status_code)}`}>{log.status_code}</span>
                                                </div>
                                                <div className="text-white/40 text-xs font-mono">
                                                    ID: {log.id}
                                                </div>
                                            </div>
                                            <div className="text-right space-y-1">
                                                <div className="flex items-center justify-end gap-2 text-white/60 text-xs">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(log.created_at).toLocaleString()}
                                                </div>
                                                <div className="flex items-center justify-end gap-2 text-white/60 text-xs text-right">
                                                    <Activity className="w-3 h-3" />
                                                    {log.duration_ms}ms latency
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tabs */}
                                    <div className="flex-1 flex flex-col min-h-0 bg-[#1e1e1e]">
                                        <div className="flex items-center border-b border-white/10 px-4">
                                            {['overview', 'headers', 'body'].map((tab) => (
                                                <button
                                                    key={tab}
                                                    onClick={() => activeDetailTab(tab)}
                                                    className={`px-4 py-3 text-xs font-medium transition-colors border-b-2 capitalize ${detailTab === tab ? 'text-white border-primary' : 'text-white/40 border-transparent hover:text-white'}`}
                                                >
                                                    {tab}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex-1 overflow-hidden relative">
                                            {detailTab === 'overview' && (
                                                <div className="absolute inset-0 overflow-y-auto p-6 space-y-8">
                                                    <KvTable title="Info & Query Params" icon={Search} data={log.query_params} />
                                                    <div className="p-4 rounded-md bg-white/5 border border-white/5">
                                                        <div className="text-xs text-white/40 mb-2 font-mono">REQUEST PATH</div>
                                                        <div className="font-mono text-sm text-white break-all">/api/mock{endpointId ? '' : log.endpoint?.path}</div>
                                                    </div>
                                                </div>
                                            )}

                                            {detailTab === 'headers' && (
                                                <div className="absolute inset-0 flex flex-col p-6">
                                                    <div className="flex items-center gap-2 mb-2 text-muted-foreground/60 flex-none">
                                                        <Hash className="w-3 h-3" />
                                                        <h3 className="text-[10px] font-bold uppercase tracking-wider">Request Headers</h3>
                                                    </div>
                                                    <div className="flex-1 border border-white/5 rounded-md overflow-hidden bg-black/20">
                                                        <div className="h-full overflow-y-auto custom-scrollbar">
                                                            {Object.entries(log.headers || {}).map(([k, v], i) => (
                                                                <div key={k} className={`flex text-xs font-mono border-b border-white/5 last:border-0 ${i % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'}`}>
                                                                    <div className="w-1/3 p-2 text-blue-400 border-r border-white/5 truncate shrink-0 sticky left-0 bg-[#1e1e1e]/50 backdrop-blur-sm" title={k}>{k}</div>
                                                                    <div className="w-2/3 p-2 text-white/80 break-all">{String(v)}</div>
                                                                </div>
                                                            ))}
                                                            {Object.keys(log.headers || {}).length === 0 && (
                                                                <div className="p-4 text-center text-xs text-white/20 italic">No headers</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {detailTab === 'body' && (
                                                <div className="absolute inset-0 flex flex-col p-6">
                                                    <div className="flex items-center gap-2 mb-4 text-muted-foreground/60 flex-none">
                                                        <FileJson className="w-3 h-3" />
                                                        <h3 className="text-[10px] font-bold uppercase tracking-wider">Request Body / Payload</h3>
                                                    </div>
                                                    <div className="flex-1 rounded-md border border-white/10 overflow-hidden bg-[#111]">
                                                        {log.body ? (
                                                            <JsonEditor
                                                                value={JSON.stringify(log.body, null, 2)}
                                                                onChange={() => { }}
                                                                readOnly={true}
                                                                className="border-none bg-transparent h-full"
                                                            />
                                                        ) : (
                                                            <div className="h-full flex items-center justify-center text-xs text-white/20 italic bg-black/20">
                                                                No Body Content
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })()
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-white/20 gap-4">
                            <Activity className="w-12 h-12 opacity-20" />
                            <div className="text-sm font-medium">Select a request to view details</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
