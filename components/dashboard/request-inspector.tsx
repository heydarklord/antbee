'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, RotateCw, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

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
        // ... (subscription logic remains)
    }, [])

    const fetchLogs = async () => {
        // Mock Mode Check
        // @ts-ignore
        if (supabase.isMock) {
            setLogs([
                {
                    id: 'mock-1',
                    method: 'POST',
                    path: '/api/v1/users',
                    status_code: 201,
                    created_at: new Date().toISOString(),
                    headers: { 'Content-Type': 'application/json' },
                    body: { name: "Test User" },
                    query_params: {},
                    endpoint: { path: '/api/v1/users' }
                },
                {
                    id: 'mock-2',
                    method: 'GET',
                    path: '/api/v1/products',
                    status_code: 200,
                    created_at: new Date(Date.now() - 1000 * 60).toISOString(),
                    headers: {},
                    body: null,
                    query_params: { page: "1" },
                    endpoint: { path: '/api/v1/products' }
                },
                {
                    id: 'mock-3',
                    method: 'DELETE',
                    path: '/api/v1/items/123',
                    status_code: 404,
                    created_at: new Date(Date.now() - 1000 * 300).toISOString(),
                    headers: {},
                    body: null,
                    query_params: {},
                    endpoint: { path: '/api/v1/items/123' }
                }
            ])
            return
        }

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
        }
    }

    return (
        <div className="flex h-[calc(100vh-100px)] border rounded-lg bg-card overflow-hidden">
            {/* List Column */}
            <div className="w-1/3 border-r flex flex-col">
                <div className="p-4 border-b space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={cn("h-2 w-2 rounded-full", isConnected ? "bg-green-500 animate-pulse" : "bg-yellow-500")} />
                            <span className="text-sm font-medium">Live Requests</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={fetchLogs}><RotateCw className="h-4 w-4" /></Button>
                    </div>
                </div>
                {errorMsg && (
                    <div className="bg-red-500/10 border-b border-red-500/20 p-2 text-[10px] text-red-500 text-center">
                        {errorMsg}
                    </div>
                )}
                <div className="flex-1 overflow-y-auto">
                    {logs.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                            Waiting for requests...
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div
                                key={log.id}
                                className={cn(
                                    "p-4 border-b cursor-pointer transition-colors hover:bg-muted/50",
                                    selectedLog?.id === log.id ? "bg-muted" : ""
                                )}
                                onClick={() => setSelectedLog(log)}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <Badge variant={log.method.toLowerCase() as any} className="text-[10px] px-1.5 py-0">{log.method}</Badge>
                                    <span className={cn("text-xs font-mono", log.status_code >= 400 ? "text-red-500" : "text-green-500")}>
                                        {log.status_code}
                                    </span>
                                </div>
                                <div className="font-mono text-xs truncate mb-1">{log.path}</div>
                                <div className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Details Column */}
            <div className="flex-1 flex flex-col bg-muted/10">
                {selectedLog ? (
                    <div className="flex flex-col h-full">
                        <div className="p-4 border-b bg-card flex justify-between items-center">
                            <div>
                                <h3 className="font-bold flex items-center gap-2">
                                    <Badge variant={selectedLog.method.toLowerCase() as any}>{selectedLog.method}</Badge>
                                    <span className="font-mono">{selectedLog.path}</span>
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">{selectedLog.id} • {new Date(selectedLog.created_at).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                                <div className={cn("text-xl font-bold", selectedLog.status_code >= 400 ? "text-red-500" : "text-green-500")}>
                                    {selectedLog.status_code}
                                </div>
                                <div className="text-xs text-muted-foreground">Status</div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            <div>
                                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">Headers</h4>
                                <div className="bg-card border rounded-md p-4 font-mono text-xs overflow-x-auto">
                                    {Object.entries(selectedLog.headers || {}).map(([k, v]) => (
                                        <div key={k} className="flex gap-2 mb-1">
                                            <span className="text-blue-500">{k}:</span>
                                            <span className="text-foreground">{String(v)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">Query Params</h4>
                                <div className="bg-card border rounded-md p-4 font-mono text-xs">
                                    {selectedLog.query_params && Object.keys(selectedLog.query_params).length > 0 ? (
                                        <pre>{JSON.stringify(selectedLog.query_params, null, 2)}</pre>
                                    ) : <span className="text-muted-foreground px-2">No query params</span>}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">Body</h4>
                                <div className="bg-card border rounded-md p-4 font-mono text-xs overflow-x-auto">
                                    {selectedLog.body ? (
                                        <pre>{JSON.stringify(selectedLog.body, null, 2)}</pre>
                                    ) : <span className="text-muted-foreground px-2">No body content</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                        <Search className="h-12 w-12 mb-4 opacity-20" />
                        <p>Select a request to view details</p>
                    </div>
                )}
            </div>
        </div>
    )
}
