"use client"

import { toast } from "sonner"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Play, Plus, X, Check } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MonacoEditor } from '@/components/ui/monaco-editor'
import { ResponseRules } from '@/components/dashboard/response-rules'
import { RequestLogs } from '@/components/dashboard/request-logs'
import { SchemaValidation } from '@/components/dashboard/schema-validation'

// Types
type EndpointResponse = {
    id: string
    status_code: number
    headers: Record<string, string>
    body: any
    delay_ms: number
}

export default function EndpointDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const [id, setId] = useState<string>('')
    const [endpoint, setEndpoint] = useState<any>(null)
    const [response, setResponse] = useState<EndpointResponse | null>(null)
    const [bodyString, setBodyString] = useState('{}')
    const [headerList, setHeaderList] = useState<{ key: string, value: string }[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [jsonError, setJsonError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'body' | 'logs' | 'rules' | 'validation'>('body')
    const [schemaCode, setSchemaCode] = useState('')
    const [schemaLanguage, setSchemaLanguage] = useState<'swift' | 'kotlin'>('swift')
    const router = useRouter()
    const supabase = createClient()

    // Unwrap params
    useEffect(() => {
        params.then((resolvedParams) => {
            setId(resolvedParams.id)
        })
    }, [params])

    // Validate JSON
    useEffect(() => {
        try {
            JSON.parse(bodyString)
            setJsonError(null)
        } catch (e: any) {
            setJsonError(e.message)
        }
    }, [bodyString])

    // Fetch Data
    useEffect(() => {
        if (!id) return

        const fetchData = async () => {
            setIsLoading(true)

            // Fetch Endpoint
            const { data: endpointData } = await supabase
                .from('endpoints')
                .select('*')
                .eq('id', id)
                .single()

            setEndpoint(endpointData)

            // Fetch Response Config
            const { data: responses } = await supabase
                .from('endpoint_responses')
                .select('*')
                .eq('endpoint_id', id)
                .limit(1)

            if (responses && responses.length > 0) {
                const resp = responses[0]
                setResponse(resp)
                setBodyString(JSON.stringify(resp.body, null, 2))
                if (resp.headers) {
                    setHeaderList(Object.entries(resp.headers).map(([k, v]) => ({ key: k, value: v as string })))
                }
            } else {
                setResponse({
                    id: '',
                    status_code: 200,
                    headers: { "Content-Type": "application/json" },
                    body: { message: "Hello World" },
                    delay_ms: 0
                })
                setBodyString(JSON.stringify({ message: "Hello World" }, null, 2))
                setHeaderList([{ key: "Content-Type", value: "application/json" }])
            }

            setIsLoading(false)
        }

        fetchData()
    }, [id])

    // Save Logic
    const handleSave = async () => {
        if (!response || !endpoint) return
        setIsSaving(true)

        let bodyJson = {}
        try {
            bodyJson = JSON.parse(bodyString)
        } catch (e) {
            toast.error("Invalid JSON")
            setIsSaving(false)
            return
        }

        const headerObj: Record<string, string> = {}
        headerList.forEach(h => {
            if (h.key) headerObj[h.key] = h.value
        })

        const payload = {
            endpoint_id: id,
            status_code: response.status_code,
            headers: headerObj,
            body: bodyJson,
            delay_ms: response.delay_ms
        }

        if (response.id) {
            const { error } = await supabase.from('endpoint_responses').update(payload).eq('id', response.id)
            if (error) {
                console.error("Error updating response:", error)
                toast.error("Failed to save response: " + error.message)
            } else {
                toast.success("Response configuration saved")
            }
        } else {
            const { data, error } = await supabase.from('endpoint_responses').insert(payload).select().single()
            if (error) {
                console.error("Error creating response:", error)
                toast.error("Failed to save response: " + error.message)
            } else if (data) {
                setResponse(data)
                toast.success("Response configuration saved")
            }
        }

        setIsSaving(false)
    }

    // Test Logic
    const handleTest = async () => {
        if (!endpoint) return
        const mockUrl = `${window.location.origin}/api/mock${endpoint.path}`
        if (endpoint.method === 'GET') {
            window.open(mockUrl, '_blank')
        } else {
            try {
                const res = await fetch(mockUrl, { method: endpoint.method })
                const text = await res.text()
                toast.success(`Status: ${res.status}`, { description: `Body: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}` })
            } catch (e: any) {
                toast.error("Request failed: " + e.message)
            }
        }
    }

    if (isLoading) return <div className="p-8">Loading...</div>
    if (!endpoint) return <div className="p-8">Endpoint not found</div>

    // Helper for status color
    const getStatusColor = (code: number) => {
        if (code >= 200 && code < 300) return "bg-green-500"
        if (code >= 300 && code < 400) return "bg-blue-500"
        if (code >= 400 && code < 500) return "bg-red-500"
        return "bg-yellow-500"
    }

    return (
        <div className="flex flex-col h-full overflow-hidden bg-background">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-card shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/endpoints"><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <Badge variant={endpoint.method.toLowerCase() as any} className="uppercase px-2 py-0.5 text-xs">{endpoint.method}</Badge>
                            <h1 className="text-xl font-bold tracking-tight font-mono truncate max-w-[200px] md:max-w-md">{endpoint.path}</h1>
                        </div>
                        <p className="text-muted-foreground text-xs mt-1 hidden md:block">Configure the mock response for this endpoint.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={handleTest} className="hidden md:flex">
                        <Play className="h-4 w-4 mr-2" /> Test Endpoint
                    </Button>
                    <div className="h-6 w-px bg-border mx-2 hidden md:block" />
                    <Button variant="ghost" size="sm" asChild className="hidden md:flex">
                        <Link href="/endpoints">Cancel</Link>
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-y-auto md:overflow-hidden min-h-0">
                {/* Left Panel: Configuration */}
                <div className="col-span-1 md:col-span-4 border-r bg-muted/10 p-6 overflow-y-auto space-y-6 md:h-full">

                    {/* Response Settings */}
                    <Card className="bg-card shadow-sm border-border/60">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <span className="p-1 rounded bg-primary/10 text-primary"><Check className="w-3 h-3" /></span>
                                Response Settings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Status Code */}
                            <div className="space-y-3">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider">HTTP Status Code</Label>
                                <Select
                                    value={response?.status_code.toString()}
                                    onValueChange={(val) => setResponse(prev => prev ? ({ ...prev, status_code: parseInt(val) }) : null)}
                                >
                                    <SelectTrigger className="font-mono text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${getStatusColor(response?.status_code || 200)}`} />
                                            <SelectValue placeholder="Select status" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="200">200 OK</SelectItem>
                                        <SelectItem value="201">201 Created</SelectItem>
                                        <SelectItem value="204">204 No Content</SelectItem>
                                        <SelectItem value="400">400 Bad Request</SelectItem>
                                        <SelectItem value="401">401 Unauthorized</SelectItem>
                                        <SelectItem value="403">403 Forbidden</SelectItem>
                                        <SelectItem value="404">404 Not Found</SelectItem>
                                        <SelectItem value="500">500 Server Error</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Delay */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Network Delay</Label>
                                    <Badge variant="secondary" className="font-mono text-[10px]">{response?.delay_ms}ms</Badge>
                                </div>
                                <Slider
                                    value={[response?.delay_ms || 0]}
                                    max={2000}
                                    step={50}
                                    onValueChange={(vals) => setResponse(prev => prev ? ({ ...prev, delay_ms: vals[0] }) : null)}
                                />
                                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                                    <span>0ms</span>
                                    <span>2s</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Response Headers */}
                    <Card className="bg-card shadow-sm border-border/60">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-medium">Response Headers</CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs text-primary hover:text-primary/80 px-2"
                                onClick={() => setHeaderList([...headerList, { key: '', value: '' }])}
                            >
                                <Plus className="h-3 w-3 mr-1" /> Add Header
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-0 divide-y divide-border/40">
                            {/* Header List */}
                            <div className="grid grid-cols-[1fr_1fr_24px] gap-4 py-2 px-1 text-[10px] font-medium text-muted-foreground uppercase">
                                <div>Key</div>
                                <div>Value</div>
                                <div></div>
                            </div>

                            {headerList.map((h, i) => (
                                <div key={i} className="grid grid-cols-[1fr_1fr_24px] gap-4 py-2 items-center group">
                                    <Input
                                        value={h.key}
                                        onChange={(e) => {
                                            const newList = [...headerList]
                                            newList[i].key = e.target.value
                                            setHeaderList(newList)
                                        }}
                                        className="h-7 text-xs font-mono bg-muted/40 border-transparent hover:border-border focus:border-primary px-2 transition-colors"
                                        placeholder="Key"
                                    />
                                    <Input
                                        value={h.value}
                                        onChange={(e) => {
                                            const newList = [...headerList]
                                            newList[i].value = e.target.value
                                            setHeaderList(newList)
                                        }}
                                        className="h-7 text-xs font-mono bg-muted/40 border-transparent hover:border-border focus:border-primary px-2 text-primary transition-colors"
                                        placeholder="Value"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                        onClick={() => {
                                            const newList = headerList.filter((_, idx) => idx !== i)
                                            setHeaderList(newList)
                                        }}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}

                            {headerList.length === 0 && (
                                <div className="py-4 text-center text-xs text-muted-foreground italic">
                                    No headers configured
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Panel: Editor or Logs or Rules */}
                <div className="col-span-1 md:col-span-8 flex flex-col h-[600px] md:h-full bg-background border-t md:border-t-0 md:border-l border-border min-h-0">
                    {/* Tabs */}
                    <div className="flex items-center justify-between border-b border-border px-4 bg-muted/20 overflow-x-auto hide-scrollbar">
                        <div className="flex">
                            <button
                                onClick={() => setActiveTab('body')}
                                className={`px-4 py-3 text-xs font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'body' ? 'text-foreground border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
                            >
                                RESPONSE BODY
                            </button>
                            <button
                                onClick={() => setActiveTab('logs')}
                                className={`px-4 py-3 text-xs font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'logs' ? 'text-foreground border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
                            >
                                REQUEST LOGS
                            </button>
                            <button
                                onClick={() => setActiveTab('rules')}
                                className={`px-4 py-3 text-xs font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'rules' ? 'text-foreground border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
                            >
                                RESPONSE RULES
                            </button>
                            <button
                                onClick={() => setActiveTab('validation')}
                                className={`px-4 py-3 text-xs font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'validation' ? 'text-foreground border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'}`}
                            >
                                SCHEMA VALIDATION
                            </button>
                        </div>
                        {activeTab === 'body' && (
                            <div className="hidden md:flex items-center gap-2">
                                {/* Monaco has built-in formatting (Right Click -> Format Document) */}
                                <span className="text-[10px] text-muted-foreground">Right click to format</span>
                            </div>
                        )}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 relative overflow-hidden min-h-0 bg-background flex flex-col">
                        {activeTab === 'body' ? (
                            <MonacoEditor
                                value={bodyString}
                                onChange={(val) => setBodyString(val || '')}
                                className="h-full"
                            />
                        ) : activeTab === 'logs' ? (
                            <RequestLogs endpointId={id} endpointPath={endpoint.path} />
                        ) : activeTab === 'rules' ? (
                            <div className="p-4 md:p-6 overflow-y-auto h-full">
                                <ResponseRules endpointId={id} />
                            </div>
                        ) : activeTab === 'validation' ? (
                            <div className="p-4 md:p-6 h-full overflow-hidden">
                                <SchemaValidation
                                    jsonBody={(() => {
                                        try { return JSON.parse(bodyString) }
                                        catch { return null }
                                    })()}
                                    code={schemaCode}
                                    onCodeChange={setSchemaCode}
                                    language={schemaLanguage}
                                    onLanguageChange={setSchemaLanguage}
                                />
                            </div>
                        ) : null}
                    </div>

                    {/* Footer - Only for Body */}
                    {activeTab === 'body' && (
                        <div className="h-8 border-t border-border bg-card flex items-center justify-between px-4 text-[10px] text-muted-foreground font-mono z-20 relative shrink-0">
                            <div className="flex items-center gap-4">
                                <span>JSON</span>
                                <span>UTF-8</span>
                                {jsonError && <span className="text-red-400 truncate max-w-[300px]" title={jsonError}>{jsonError}</span>}
                            </div>
                            <div className={`flex items-center gap-2 ${jsonError ? 'text-red-500' : 'text-green-500'}`}>
                                {jsonError ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                                {jsonError ? "Invalid JSON" : "Valid JSON"}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
