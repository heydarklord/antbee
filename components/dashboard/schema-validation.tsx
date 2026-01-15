"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import {
    Play, RotateCcw, FileJson, FileCode, CheckCircle2,
    AlertCircle, AlertTriangle, TableProperties, ListOrdered,
    Activity, Braces
} from 'lucide-react'
import { SchemaValidator, ValidationReport } from '@/lib/validators/schema-validator'
import { MonacoEditor } from '@/components/ui/monaco-editor'
import { cn } from '@/lib/utils'

interface SchemaValidationProps {
    jsonBody: any
    code: string
    onCodeChange: (code: string) => void
    language: 'swift' | 'kotlin'
    onLanguageChange: (lang: 'swift' | 'kotlin') => void
}

export function SchemaValidation({ jsonBody, code, onCodeChange, language, onLanguageChange }: SchemaValidationProps) {
    const [jsonString, setJsonString] = useState("")
    const [strictMode, setStrictMode] = useState(true)
    const [report, setReport] = useState<ValidationReport | null>(null)
    const [activeTab, setActiveTab] = useState("diagnostics")

    // Initialize/Sync JSON
    useEffect(() => {
        try {
            setJsonString(JSON.stringify(jsonBody, null, 2))
        } catch {
            setJsonString("{}")
        }
    }, [jsonBody])

    const handleValidate = () => {
        try {
            const parsed = JSON.parse(jsonString)
            const result = SchemaValidator.validate(parsed, code, language, strictMode)
            setReport(result)

            // Auto-switch to diagnostics if failed
            if (!result.isValid) setActiveTab("diagnostics")
            else if (result.isValid && activeTab === 'diagnostics') setActiveTab("matrix")
        } catch (e) {
            console.error("Invalid JSON", e)
        }
    }

    return (
        <div className="flex h-full border rounded-lg bg-background overflow-hidden font-sans">
            {/* LEFT PANEL: INPUTS */}
            <div className="w-[45%] flex flex-col border-r bg-muted/5">
                {/* Header Actions */}
                <div className="h-12 border-b flex items-center justify-between px-4 bg-background/50 backdrop-blur">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider">
                            {language === 'swift' ? 'Swift 5' : 'Kotlin 1.9'}
                        </Badge>
                        <div className="flex items-center gap-2 ml-4">
                            <Label htmlFor="strict-mode" className="text-xs font-medium cursor-pointer">Strict</Label>
                            <Switch
                                id="strict-mode"
                                checked={strictMode}
                                onCheckedChange={setStrictMode}
                                className="scale-75 origin-left"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => {
                            setJsonString(JSON.stringify(jsonBody, null, 2))
                            setReport(null)
                        }}>
                            <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" onClick={handleValidate} className="h-7 text-xs bg-primary hover:bg-primary/90">
                            <Play className="mr-2 h-3 w-3" /> Run Validation
                        </Button>
                    </div>
                </div>

                {/* Input Areas */}
                <div className="flex-1 flex flex-col min-h-0">
                    {/* JSON Section */}
                    <div className="flex-1 flex flex-col min-h-0 border-b relative group">
                        <div className="absolute top-2 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Badge variant="secondary" className="text-[10px] bg-background/80 backdrop-blur border shadow-sm">
                                <FileJson className="mr-1 h-3 w-3" /> JSON Payload
                            </Badge>
                        </div>
                        <MonacoEditor
                            language="json"
                            value={jsonString}
                            onChange={(v) => setJsonString(v || "")}
                            className="bg-transparent"
                        />
                    </div>

                    {/* Model Section */}
                    <div className="flex-1 flex flex-col min-h-0 relative group">
                        <div className="absolute top-2 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                            <Tabs value={language} onValueChange={(v) => onLanguageChange(v as any)} className="h-6">
                                <TabsList className="h-6 p-0 bg-background/80 border">
                                    <TabsTrigger value="swift" className="h-6 text-[10px] px-2 data-[state=active]:bg-muted">Swift</TabsTrigger>
                                    <TabsTrigger value="kotlin" className="h-6 text-[10px] px-2 data-[state=active]:bg-muted">Kotlin</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                        <MonacoEditor
                            language={language === 'swift' ? 'swift' : 'kotlin'}
                            value={code}
                            onChange={(v) => onCodeChange(v || "")}
                            className="bg-transparent"
                        />
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL: RESULTS */}
            <div className="flex-1 flex flex-col bg-background min-h-0">
                <div className="h-12 border-b flex items-center px-4 justify-between bg-muted/5">
                    <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Validation Results</span>
                    </div>
                    {report && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-mono">
                                Execution: 12ms
                            </span>
                            <Badge variant={report.isValid ? "default" : "destructive"} className="ml-2">
                                {report.isValid ? "PASSED" : "FAILED"}
                            </Badge>
                        </div>
                    )}
                </div>

                <div className="flex-1 flex flex-col min-h-0 p-4">
                    {!report ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground/40 space-y-4">
                            <div className="p-4 rounded-full bg-muted/20">
                                <Braces className="h-12 w-12" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-sm font-medium text-foreground">Ready to Validate</h3>
                                <p className="text-xs max-w-[180px] mt-1">Upload your JSON and Model to verify compatibility.</p>
                            </div>
                        </div>
                    ) : (
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                            <TabsList className="w-full justify-start border-b rounded-none p-0 h-9 bg-transparent">
                                <TabsTrigger value="diagnostics" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-2 pt-1.5 text-xs">
                                    <AlertTriangle className="mr-2 h-3.5 w-3.5" /> Diagnostics ({report.errors.length + report.missingRequiredFields.length})
                                </TabsTrigger>
                                <TabsTrigger value="matrix" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-2 pt-1.5 text-xs">
                                    <TableProperties className="mr-2 h-3.5 w-3.5" /> Compatibility Matrix
                                </TabsTrigger>
                                <TabsTrigger value="trace" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 pb-2 pt-1.5 text-xs">
                                    <ListOrdered className="mr-2 h-3.5 w-3.5" /> Trace Log
                                </TabsTrigger>
                            </TabsList>

                            <div className="flex-1 min-h-0 mt-4">
                                <TabsContent value="diagnostics" className="h-full m-0">
                                    <ScrollArea className="h-full pr-4">
                                        <div className="space-y-3">
                                            {report.isValid && (
                                                <div className="flex flex-col items-center justify-center h-40 text-green-500 space-y-2 border rounded-md border-dashed border-green-500/20 bg-green-500/5 w-full">
                                                    <CheckCircle2 className="h-8 w-8" />
                                                    <span className="text-sm font-medium">All checks passed successfully</span>
                                                </div>
                                            )}

                                            {report.missingRequiredFields.map((f, i) => (
                                                <div key={i} className="flex gap-3 p-3 border rounded-md bg-destructive/5 border-destructive/20 text-sm w-full">
                                                    <div className="p-1 h-fit text-destructive shrink-0"><AlertCircle className="h-4 w-4" /></div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-mono font-medium text-destructive break-all">{f}</div>
                                                        <div className="text-muted-foreground text-xs mt-0.5">Missing required field in JSON payload.</div>
                                                    </div>
                                                </div>
                                            ))}

                                            {report.errors.map((e, i) => (
                                                <div key={i} className="flex gap-3 p-3 border rounded-md bg-orange-500/5 border-orange-500/20 text-sm w-full">
                                                    <div className="p-1 h-fit text-orange-500 shrink-0"><AlertTriangle className="h-4 w-4" /></div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-mono font-medium text-orange-600 dark:text-orange-400">Type Mismatch</div>
                                                        <div className="text-muted-foreground text-xs mt-0.5 break-all">{e}</div>
                                                    </div>
                                                </div>
                                            ))}

                                            {report.missingOptionalFields.length > 0 && (
                                                <div className="mt-6 pt-4 border-t w-full">
                                                    <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Warnings (Ignorable)</div>
                                                    {report.missingOptionalFields.map((f, i) => (
                                                        <div key={i} className="flex gap-2 p-2 text-xs text-yellow-600/80 font-mono items-start w-full">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-yellow-500 mt-1.5 shrink-0" />
                                                            <div className="min-w-0 break-all">
                                                                {f} <span className="text-muted-foreground opacity-50 whitespace-nowrap">- missing optional</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>

                                <TabsContent value="matrix" className="h-full m-0">
                                    <ScrollArea className="h-full border rounded-md">
                                        <div className="w-full text-left text-sm">
                                            <div className="flex bg-muted/40 text-xs font-medium text-muted-foreground border-b p-2 sticky top-0 backdrop-blur">
                                                <div className="w-8"></div>
                                                <div className="flex-1">Field</div>
                                                <div className="w-24">Type</div>
                                                <div className="w-20 text-center">Required</div>
                                                <div className="w-32">Status</div>
                                            </div>
                                            {report.analysis && report.analysis.map((row, i) => (
                                                <div key={i} className={cn("flex items-center p-2 border-b last:border-0 font-mono text-xs hover:bg-muted/20",
                                                    row.status === 'valid' ? '' : 'bg-red-500/5'
                                                )}>
                                                    <div className="w-8 flex justify-center">
                                                        {row.status === 'valid' ? (
                                                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                                        ) : row.status === 'missing_optional' ? (
                                                            <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />
                                                        ) : (
                                                            <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 font-medium">{row.path}</div>
                                                    <div className="w-24 text-muted-foreground truncate" title={row.expectedType}>{row.expectedType}</div>
                                                    <div className="w-20 text-center text-muted-foreground">{row.isRequired ? "YES" : "NO"}</div>
                                                    <div className="w-32">
                                                        <Badge variant="outline" className={cn("text-[10px] h-5",
                                                            row.status === 'valid' && "border-green-500/30 text-green-500",
                                                            row.status === 'missing_required' && "border-destructive/30 text-destructive bg-destructive/5",
                                                            row.status === 'type_mismatch' && "border-orange-500/30 text-orange-500 bg-orange-500/5",
                                                            row.status === 'missing_optional' && "border-yellow-500/30 text-yellow-600 bg-yellow-500/5",
                                                        )}>
                                                            {row.status.replace('_', ' ')}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>

                                <TabsContent value="trace" className="h-full m-0">
                                    <ScrollArea className="h-full border rounded-md bg-black/20 p-4">
                                        <div className="space-y-4 font-mono text-xs">
                                            {report.trace && report.trace.map((step, i) => (
                                                <div key={i} className="flex gap-3 relative group">
                                                    {/* Timeline Line */}
                                                    {i !== report.trace.length - 1 && (
                                                        <div className="absolute left-[7px] top-4 bottom-[-16px] w-[1px] bg-border/50" />
                                                    )}

                                                    <div className={cn("h-4 w-4 rounded-full border flex items-center justify-center shrink-0 z-10 mt-0.5",
                                                        step.status === 'success' ? "border-green-500 bg-green-500/10 text-green-500" :
                                                            step.status === 'error' ? "border-destructive bg-destructive/10 text-destructive" :
                                                                "border-blue-500 bg-blue-500/10 text-blue-500"
                                                    )}>
                                                        <div className={cn("h-1.5 w-1.5 rounded-full bg-current")} />
                                                    </div>
                                                    <div className="flex-1 pb-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={cn("font-bold",
                                                                step.status === 'error' ? "text-destructive" : "text-foreground"
                                                            )}>{step.step}</span>
                                                            <span className="text-muted-foreground/50 text-[10px]">{step.path}</span>
                                                        </div>
                                                        <p className="text-muted-foreground">{step.message}</p>
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground/30 tabular-nums">
                                                        +{step.timestamp - (report.trace[0]?.timestamp || 0)}ms
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>
                            </div>
                        </Tabs>
                    )}
                </div>
            </div>
        </div>
    )
}
