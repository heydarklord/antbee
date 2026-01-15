"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, CheckCircle2, Play } from 'lucide-react'
import { SchemaValidator, ValidationReport } from '@/lib/validators/schema-validator'

import Editor from 'react-simple-code-editor'
import { highlight, languages } from 'prismjs'
import 'prismjs/components/prism-swift'
import 'prismjs/components/prism-kotlin'
import 'prismjs/themes/prism-dark.css'

interface SchemaValidationProps {
    jsonBody: any
    code: string
    onCodeChange: (code: string) => void
    language: 'swift' | 'kotlin'
    onLanguageChange: (lang: 'swift' | 'kotlin') => void
}

export function SchemaValidation({ jsonBody, code, onCodeChange, language, onLanguageChange }: SchemaValidationProps) {
    // Report can remain local, re-validation is fast/cheap
    const [report, setReport] = useState<ValidationReport | null>(null)

    const handleValidate = () => {
        const result = SchemaValidator.validate(jsonBody, code, language)
        setReport(result)
    }

    // Default placeholders
    const placeholder = language === 'swift'
        ? `struct User: Codable {\n    let id: Int\n    let name: String\n    let bio: String?\n}`
        : `data class User(\n    val id: Int,\n    val name: String,\n    val bio: String? = null\n)`

    return (
        <div className="flex flex-col h-full gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Tabs value={language} onValueChange={(v) => onLanguageChange(v as any)}>
                        <TabsList>
                            <TabsTrigger value="swift">Swift</TabsTrigger>
                            <TabsTrigger value="kotlin">Kotlin</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <p className="text-xs text-muted-foreground">
                        Paste your {language === 'swift' ? 'Struct/Class' : 'Data Class'} below to validate the current response JSON.
                    </p>
                </div>
                <Button size="sm" onClick={handleValidate}>
                    <Play className="mr-2 h-4 w-4" /> Validate
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
                {/* Code Input */}
                <div className="border rounded-md bg-[#1e1e1e] overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-auto relative font-mono text-sm">
                        <Editor
                            value={code}
                            onValueChange={onCodeChange}
                            highlight={code => highlight(code, language === 'swift' ? languages.swift : languages.kotlin, language)}
                            padding={16}
                            placeholder={placeholder}
                            className="min-h-full font-mono"
                            style={{
                                fontFamily: '"Fira Code", "Fira Mono", monospace',
                                fontSize: 13,
                                backgroundColor: 'transparent',
                                minHeight: '100%'
                            }}
                            textareaClassName="focus:outline-none"
                        />
                    </div>
                </div>

                {/* Validation Report */}
                <Card className="flex flex-col overflow-hidden bg-card/50">
                    <CardContent className="p-0 flex-1 flex flex-col h-full">
                        <div className="p-4 border-b bg-muted/20 font-medium text-sm">
                            Validation Report
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {!report && (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center p-4 opacity-50">
                                    <CheckCircle2 className="h-12 w-12 mb-2" />
                                    <p>Run validation to see results</p>
                                </div>
                            )}

                            {report && report.isValid && (
                                <div className="flex flex-col items-center justify-center h-full text-green-500 space-y-2">
                                    <CheckCircle2 className="h-16 w-16" />
                                    <h3 className="text-xl font-bold">Valid Schema</h3>
                                    <p className="text-sm text-center text-muted-foreground max-w-xs">
                                        The JSON response matches your {language === 'swift' ? 'Swift' : 'Kotlin'} definition.
                                    </p>
                                </div>
                            )}

                            {report && !report.isValid && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-destructive font-bold">
                                        <AlertCircle className="h-5 w-5" />
                                        <span>Validation Failed</span>
                                    </div>

                                    {report.missingRequiredFields.length > 0 && (
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase text-destructive font-bold">Missing Required Fields (Must Fix)</Label>
                                            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 space-y-1">
                                                {report.missingRequiredFields.map((field, i) => (
                                                    <div key={i} className="text-sm text-destructive font-mono flex items-center gap-2">
                                                        <span>•</span> {field}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {report.missingOptionalFields.length > 0 && (
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase text-yellow-500 font-bold">Missing Optional Fields (Can Ignore)</Label>
                                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-3 space-y-1">
                                                {report.missingOptionalFields.map((field, i) => (
                                                    <div key={i} className="text-sm text-yellow-600 font-mono flex items-center gap-2">
                                                        <span>•</span> {field}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {report.errors.filter(e => !e.startsWith('Missing')).length > 0 && (
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase text-orange-500 font-bold">Type Errors</Label>
                                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-md p-3 space-y-2">
                                                {report.errors.filter(e => !e.startsWith('Missing')).map((error, i) => (
                                                    <div key={i} className="text-sm text-orange-500 font-mono flex items-start gap-2">
                                                        <span className="mt-1">•</span>
                                                        <span className="break-all">{error}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
