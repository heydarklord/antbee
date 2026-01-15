"use client"

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { MonacoEditor } from '@/components/ui/monaco-editor'
import { ArrowLeftRight, CheckCircle2, AlertTriangle, Save, RefreshCw, Upload, Download, Split, Columns, PanelLeft, FileJson, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VisualJsonEditor } from '@/components/gui-editor/visual-json-editor'
import { ImportEndpointModal } from '@/components/gui-editor/import-modal'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

// Mock initial JSON
const DEFAULT_JSON = JSON.stringify({
    "user_id": 1042,
    "username": "admin_user",
    "is_active": true,
    "attributes": {
        "role": "super_admin",
        "permissions": [
            "read",
            "write"
        ]
    }
}, null, 2)

export default function GuiEditorPage() {
    const [jsonString, setJsonString] = useState(DEFAULT_JSON)
    const [viewMode, setViewMode] = useState<'gui' | 'split' | 'json'>('split')
    const [isValid, setIsValid] = useState(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [isImportOpen, setIsImportOpen] = useState(false)
    const [diffMode, setDiffMode] = useState(false) // Patch mode

    // Check validity on change
    useEffect(() => {
        try {
            JSON.parse(jsonString)
            setIsValid(true)
            setErrorMessage(null)
        } catch (e: any) {
            setIsValid(false)
            setErrorMessage(e.message)
        }
    }, [jsonString])

    const handleGuiChange = (newJson: any) => {
        setJsonString(JSON.stringify(newJson, null, 2))
    }

    const handleImport = (payload: string) => {
        setJsonString(JSON.stringify(JSON.parse(payload), null, 2)) // Re-format
        toast.success("Payload imported successfully")
        setIsImportOpen(false)
    }

    const parsedData = useMemo(() => {
        try {
            return JSON.parse(jsonString)
        } catch {
            return null
        }
    }, [jsonString])

    return (
        <div className="h-full flex flex-col bg-background overflow-hidden relative">
            {/* Header */}
            <div className="h-14 border-b flex items-center justify-between px-4 bg-card/50 backdrop-blur-sm z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="font-semibold text-lg tracking-tight">Payload Editor</h1>

                    {/* View Controls */}
                    <div className="flex items-center bg-muted/50 rounded-lg p-1 border border-border/50">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn("h-7 px-3 text-xs rounded-md", viewMode === 'gui' && "bg-background shadow-sm text-foreground")}
                            onClick={() => setViewMode('gui')}
                        >
                            <PanelLeft className="mr-2 h-3.5 w-3.5" /> GUI
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn("h-7 px-3 text-xs rounded-md", viewMode === 'split' && "bg-background shadow-sm text-foreground")}
                            onClick={() => setViewMode('split')}
                        >
                            <Columns className="mr-2 h-3.5 w-3.5" /> Split
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn("h-7 px-3 text-xs rounded-md", viewMode === 'json' && "bg-background shadow-sm text-foreground")}
                            onClick={() => setViewMode('json')}
                        >
                            <FileJson className="mr-2 h-3.5 w-3.5" /> JSON
                        </Button>
                    </div>

                    <div className="h-6 w-px bg-border/50 mx-2" />

                    {/* Status Indicator */}
                    <Badge variant="outline" className={cn(
                        "h-7 px-3 gap-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
                        isValid ? "border-green-500/20 bg-green-500/10 text-green-500" : "border-destructive/20 bg-destructive/10 text-destructive"
                    )}>
                        {isValid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                        {isValid ? "Valid JSON" : "Invalid Syntax"}
                    </Badge>
                </div>

                <div className="flex items-center gap-2">
                    {/* Patch Mode Toggle (Visual Only for now) */}
                    <div className="flex items-center gap-2 mr-4 opacity-0 md:opacity-100 transition-opacity">
                        <Label htmlFor="patch-mode" className="text-xs text-muted-foreground font-medium cursor-pointer">Patch Mode</Label>
                        <Switch id="patch-mode" checked={diffMode} onCheckedChange={setDiffMode} className="scale-75" />
                    </div>

                    <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)} className="h-8 gap-2 border-border/60 hover:bg-muted">
                        <Download className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Import</span>
                    </Button>
                    <Button size="sm" className="h-8 gap-2" onClick={() => toast.success("Payload saved locally")}>
                        <Save className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Save Payload</span>
                    </Button>
                </div>
            </div>

            {/* Main Editor Area */}
            <div className="flex-1 flex min-h-0 relative">

                {/* Visual Editor Panel */}
                <div className={cn(
                    "flex flex-col min-w-0 transition-all duration-300 border-r",
                    viewMode === 'json' ? "w-0 border-none overflow-hidden opacity-0" :
                        viewMode === 'gui' ? "w-full" : "w-[50%]"
                )}>
                    {/* Toolbar for Tree */}
                    <div className="h-10 border-b flex items-center justify-between px-4 bg-muted/10 shrink-0">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Structure Tree</span>
                        {/* Add root field button could go here */}
                    </div>

                    <div className="flex-1 overflow-y-auto bg-card/30 p-4 relative">
                        {isValid && parsedData ? (
                            <VisualJsonEditor
                                data={parsedData}
                                onChange={handleGuiChange}
                                isPatchMode={diffMode}
                            />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-200">
                                <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4 border border-destructive/20">
                                    <AlertTriangle className="h-8 w-8 text-destructive" />
                                </div>
                                <h3 className="font-semibold text-lg mb-2">GUI Disabled</h3>
                                <p className="text-muted-foreground text-sm max-w-[250px]">
                                    Visual editor is disabled because the JSON contains syntax errors.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-6 gap-2"
                                    onClick={() => setViewMode('json')} // Or jump to error
                                >
                                    Fix in JSON Editor
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Raw JSON Panel */}
                <div className={cn(
                    "flex flex-col min-w-0 transition-all duration-300",
                    viewMode === 'gui' ? "w-0 overflow-hidden opacity-0" :
                        viewMode === 'json' ? "w-full" : "w-[50%]"
                )}>
                    <div className="h-10 border-b flex items-center justify-between px-4 bg-muted/10 shrink-0">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Raw JSON</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground font-mono">UTF-8</span>
                        </div>
                    </div>

                    <div className="flex-1 relative group">
                        <MonacoEditor
                            language="json"
                            value={jsonString}
                            onChange={(val) => setJsonString(val || "{}")}
                            className="bg-transparent"
                        />

                        {/* Error Overlay in Editor if needed, sticking to Monaco's red squiggles generally, but can add a bottom card */}
                        {!isValid && errorMessage && (
                            <div className="absolute bottom-4 left-4 right-4 bg-destructive/90 text-destructive-foreground p-3 rounded-md shadow-lg backdrop-blur supports-[backdrop-filter]:bg-destructive/60 flex items-start gap-3 animate-in slide-in-from-bottom-2">
                                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="font-medium text-sm">Invalid JSON Syntax</p>
                                    <p className="text-xs opacity-90 mt-1 font-mono">{errorMessage}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ImportEndpointModal open={isImportOpen} onOpenChange={setIsImportOpen} onImport={handleImport} />
        </div>
    )
}
