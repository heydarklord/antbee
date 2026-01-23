'use client'

import { useState } from 'react'
import { MonacoEditor } from '@/components/ui/monaco-editor'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Download, Code, Eye, FileText } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface ViewClientProps {
    id: string
    name: string
    mimeType: string
    size: number
}

export function ViewClient({ id, name, mimeType, size }: ViewClientProps) {
    const [content, setContent] = useState<string>('')
    const [loadingContent, setLoadingContent] = useState(false)

    // IMPORTANT: Using the new slug-based API route
    const rawUrl = `/api/content/${id}/${name}`

    // Simple helpers for display logic
    const isImage = mimeType.startsWith('image/')
    const isPdf = mimeType === 'application/pdf'
    // Broad check for text-like content to allow Code view
    const isText = mimeType.startsWith('text/') ||
        mimeType.includes('json') ||
        mimeType.includes('xml') ||
        mimeType.includes('javascript') ||
        mimeType.includes('typescript') ||
        mimeType.includes('css') ||
        mimeType.includes('html')

    const handleTabChange = async (value: string) => {
        if (value === 'code' && !content) {
            setLoadingContent(true)
            try {
                const res = await fetch(rawUrl)
                if (!res.ok) throw new Error('Failed to load content')
                const text = await res.text()
                setContent(text)
            } catch (error) {
                console.error('Error loading content:', error)
                toast.error('Failed to load code content')
            } finally {
                setLoadingContent(false)
            }
        }
    }

    const getLanguage = () => {
        if (mimeType.includes('json')) return 'json'
        if (mimeType.includes('html')) return 'html'
        if (mimeType.includes('javascript')) return 'javascript'
        if (mimeType.includes('typescript')) return 'typescript'
        if (mimeType.includes('css')) return 'css'
        if (mimeType.includes('markdown')) return 'markdown'
        return 'plaintext'
    }

    return (
        <div className="flex flex-col h-screen bg-background">
            <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/50 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg text-primary">
                        {isImage ? <Eye className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                    </div>
                    <div>
                        <h1 className="font-semibold text-lg leading-tight">{name}</h1>
                        <p className="text-xs text-muted-foreground">{mimeType} • {(size / 1024).toFixed(2)} KB</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link href={rawUrl} target="_blank" prefetch={false}>
                        <Button variant="outline" size="sm">
                            <Download className="mr-2 h-4 w-4" />
                            Download Raw
                        </Button>
                    </Link>
                </div>
            </header>

            <div className="flex-1 overflow-hidden p-6">
                <Tabs defaultValue="preview" className="h-full flex flex-col" onValueChange={handleTabChange}>
                    <div className="flex justify-between items-center mb-4">
                        <TabsList>
                            <TabsTrigger value="preview" className="flex items-center gap-2">
                                <Eye className="h-4 w-4" /> Preview
                            </TabsTrigger>
                            <TabsTrigger value="code" className="flex items-center gap-2" disabled={!isText}>
                                <Code className="h-4 w-4" /> Code
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="preview" className="flex-1 h-full border rounded-xl overflow-hidden bg-white/5 relative">
                        {isImage ? (
                            <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
                                <img src={rawUrl} alt={name} className="max-w-full max-h-full object-contain rounded-md shadow-sm" />
                            </div>
                        ) : (
                            <iframe
                                src={rawUrl}
                                className="w-full h-full border-none bg-white"
                                sandbox="allow-scripts"
                                title="File Preview"
                            />
                        )}
                    </TabsContent>

                    <TabsContent value="code" className="flex-1 h-full border rounded-xl overflow-hidden bg-[#1e1e1e]">
                        {loadingContent ? (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                Loading code...
                            </div>
                        ) : (
                            <MonacoEditor
                                value={content}
                                language={getLanguage()}
                                readOnly={true}
                                className="h-full"
                            />
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
