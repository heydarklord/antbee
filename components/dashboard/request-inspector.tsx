'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Search, RotateCw, Hash, FileJson, Activity, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { MonacoEditor } from '@/components/ui/monaco-editor'

type RequestLog = {
    id: string
    method: string
    path?: string // Join with endpoint to get path usually, or stored directly
    created_at: string
    status_code: number
    headers: any
    body: any
    query_params: any
    endpoint?: { path: string } // if joined
}

export function RequestInspector() {
    const [logs, setLogs] = useState<RequestLog[]>([])
    const [selectedLog, setSelectedLog] = useState<RequestLog | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const supabase = createClient()

    useEffect(() => {
        // Initial fetch
        fetchLogs()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const fetchLogs = async () => {
        const { data, error } = await supabase
            .from('request_logs')
            .select('*, endpoint:endpoints(path)')
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) {
            console.error("Inspector Error:", error)
            setErrorMsg(error.message)
        } else if (data) {
            setErrorMsg(null)
            const formatted = data.map((log: any) => ({
                ...log,
                path: log.endpoint?.path || 'Unknown'
            }))
            setLogs(formatted)
            setIsConnected(true)
        }
    }

    const getStatusColor = (code: number) => {
        if (code >= 200 && code < 300) return "text-green-500"
        if (code >= 300 && code < 400) return "text-blue-500"
        if (code >= 400 && code < 500) return "text-red-500"
        return "text-yellow-500"
    }

    // Key-Value Table Component
    const KvTable = ({ data, title, icon: Icon }: { data: any, title: string, icon: any }) => {
        const entries = Object.entries(data || {})
        if (entries.length === 0) return (
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground/60">
                    <Icon className="w-3 h-3" />
                    <h3 className="text-[10px] font-bold uppercase tracking-wider">{title}</h3>
                </div>
                <div className="p-4 text-center text-xs text-muted-foreground italic border border-border/50 rounded-md bg-muted/20">
                    No {title.toLowerCase()}
                </div>
            </div>
        )
        return (
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground/60">
                    <Icon className="w-3 h-3" />
                    <h3 className="text-[10px] font-bold uppercase tracking-wider">{title}</h3>
                </div>
                <div className="border border-border/50 rounded-md overflow-hidden bg-muted/20">
                    {entries.map(([k, v], i) => (
                        <div key={k} className={`flex text-xs font-mono border-b border-border/50 last:border-0 ${i % 2 === 0 ? 'bg-transparent' : 'bg-muted/10'}`}>
                            <div className="w-1/3 p-2 text-blue-500 border-r border-border/50 truncate shrink-0" title={k}>{k}</div>
                            <div className="w-2/3 p-2 text-foreground/80 break-all max-h-[60px] overflow-y-auto custom-scrollbar">{String(v)}</div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-[calc(100vh-140px)] border border-border rounded-lg bg-card overflow-hidden shadow-2xl">
            {/* List Column */}
            <div className="w-1/3 border-r border-border flex flex-col bg-muted/20">
                <div className="p-3 border-b border-border bg-card">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={cn("h-2 w-2 rounded-full", isConnected ? "bg-green-500 animate-pulse" : "bg-yellow-500")} />
                            <span className="text-xs font-medium text-foreground">Live Traffic</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted" onClick={fetchLogs}>
                            <RotateCw className="h-3 w-3" />
                        </Button>
                    </div>
                </div>

                {errorMsg && (
                    <div className="bg-destructive/10 border-b border-destructive/20 p-2 text-[10px] text-destructive text-center">
                        {errorMsg}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {logs.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-xs italic">
                            Waiting for requests...
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div
                                key={log.id}
                                className={cn(
                                    "p-3 border-b border-border/50 cursor-pointer transition-all hover:bg-muted/50 border-l-2",
                                    selectedLog?.id === log.id ? "bg-muted border-l-primary" : "border-l-transparent"
                                )}
                                onClick={() => setSelectedLog(log)}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <Badge variant="outline" className="bg-muted text-foreground border-border text-[10px] px-1.5 py-0 h-5">
                                        {log.method}
                                    </Badge>
                                    <span className={cn("text-xs font-mono font-bold", getStatusColor(log.status_code))}>
                                        {log.status_code}
                                    </span>
                                </div>
                                <div className="font-mono text-[11px] text-muted-foreground truncate mb-1">
                                    /api/mock{log.path}
                                </div>
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Details Column */}
            <div className="flex-1 flex flex-col bg-background min-h-0">
                {selectedLog ? (
                    <div className="flex flex-col h-full min-h-0">
                        {/* Header */}
                        <div className="p-6 border-b border-border bg-card">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <Badge variant="outline" className="bg-muted text-foreground border-border font-mono text-sm px-3 py-1">
                                            {selectedLog.method}
                                        </Badge>
                                        <span className="font-mono text-lg text-foreground/80">
                                            /api/mock{selectedLog.path}
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground font-mono flex items-center gap-3">
                                        <span>ID: {selectedLog.id}</span>
                                        <span>•</span>
                                        <span>{new Date(selectedLog.created_at).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={cn("text-2xl font-bold", getStatusColor(selectedLog.status_code))}>
                                        {selectedLog.status_code}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 min-h-0">
                            <KvTable title="Request Headers" icon={Hash} data={selectedLog.headers} />

                            <KvTable title="Query Parameters" icon={Search} data={selectedLog.query_params} />

                            <div className="flex flex-col h-[300px] min-h-[300px]">
                                <div className="flex items-center gap-2 mb-2 text-muted-foreground/60 flex-none">
                                    <FileJson className="w-3 h-3" />
                                    <h3 className="text-[10px] font-bold uppercase tracking-wider">Request Body</h3>
                                </div>
                                <div className="flex-1 rounded-md border border-border/50 overflow-hidden bg-card">
                                    {selectedLog.body ? (
                                        <MonacoEditor
                                            value={JSON.stringify(selectedLog.body, null, 2)}
                                            readOnly={true}
                                            className="h-full"
                                        />
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic bg-muted/20">
                                            No Body Content
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
                        <Activity className="w-16 h-16 opacity-10" />
                        <div className="text-sm font-medium">Select a request to view details</div>
                    </div>
                )}
            </div>
        </div>
    )
}

