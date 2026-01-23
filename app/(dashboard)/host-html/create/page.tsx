'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MonacoEditor } from '@/components/ui/monaco-editor'
import { EXPIRY_OPTIONS, ExpiryType, calculateExpiryDate } from '@/lib/file-hosting'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Upload, FileCode, Check } from 'lucide-react'

export default function HostHtmlCreatePage() {
    const router = useRouter()
    const supabase = createClient()
    const queryClient = useQueryClient()

    const [name, setName] = useState('')
    const [code, setCode] = useState('<!DOCTYPE html>\n<html>\n<head>\n  <title>My Page</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>')
    const [file, setFile] = useState<File | null>(null)
    const [expiry, setExpiry] = useState<ExpiryType>('never')
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('code')

    // Generate random name if empty on mount
    useEffect(() => {
        setName(`page-${Math.random().toString(36).substring(7)}.html`)
    }, [])

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0]
            if (selectedFile.type !== 'text/html' && !selectedFile.name.endsWith('.html')) {
                toast.error('Only HTML files are supported')
                return
            }
            setFile(selectedFile)
            setName(selectedFile.name)
        }
    }

    const handleSave = async () => {
        try {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            let fileToUpload: File

            if (activeTab === 'code') {
                const blob = new Blob([code], { type: 'text/html' })
                fileToUpload = new File([blob], name, { type: 'text/html' })
            } else {
                if (!file) {
                    toast.error('Please select a file')
                    return
                }
                fileToUpload = file
            }

            const safeName = name.endsWith('.html') ? name : `${name}.html`
            const filePath = `${user.id}/${Date.now()}_${safeName}`

            // 1. Upload
            const { error: uploadError } = await supabase.storage
                .from('hosted_files')
                .upload(filePath, fileToUpload)

            if (uploadError) throw uploadError

            // 2. Insert DB
            const expiryDate = calculateExpiryDate(expiry)
            const { error: dbError } = await supabase
                .from('hosted_files')
                .insert({
                    user_id: user.id,
                    name: safeName,
                    storage_path: filePath,
                    mime_type: 'text/html',
                    size: fileToUpload.size,
                    expiry_type: expiry,
                    expires_at: expiryDate ? expiryDate.toISOString() : null,
                })

            if (dbError) throw dbError

            toast.success('HTML Page hosted successfully')
            await queryClient.invalidateQueries({ queryKey: ['hosted_html'] })
            // Redirect to list
            router.push('/host-html')

        } catch (error: any) {
            console.error('Error hosting HTML:', error)
            toast.error(error.message || 'Failed to host HTML')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-2rem)] p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Host HTML</h1>
                    <p className="text-muted-foreground mt-1">
                        Create a standalone webpage by pasting code or uploading a file.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? 'Hosting...' : 'Host Page'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full min-h-0">
                {/* Settings Panel */}
                <Card className="h-fit bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-6 space-y-4">
                        <div className="space-y-2">
                            <Label>Page Name</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="my-page.html"
                            />
                            <p className="text-xs text-muted-foreground">The final URL will contain this filename.</p>
                        </div>

                        <div className="space-y-2">
                            <Label>Expires In</Label>
                            <Select value={expiry} onValueChange={(v) => setExpiry(v as ExpiryType)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {EXPIRY_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="pt-4 border-t border-border/50">
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/10 text-primary text-sm">
                                <Check className="h-5 w-5 mt-0.5 shrink-0" />
                                <p>Pages will be served with <code>Content-Type: text/html</code> so browsers verify them as legitimate web pages.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Editor/Upload Area */}
                <Card className="col-span-2 flex flex-col min-h-0 h-full bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                        <div className="px-6 py-3 border-b border-border/50 flex items-center justify-between bg-card/30">
                            <TabsList>
                                <TabsTrigger value="code" className="gap-2"><FileCode className="h-4 w-4" /> Paste Code</TabsTrigger>
                                <TabsTrigger value="upload" className="gap-2"><Upload className="h-4 w-4" /> Upload File</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="code" className="flex-1 mt-0 relative min-h-0">
                            <MonacoEditor
                                value={code}
                                onChange={(val) => setCode(val || '')}
                                language="html"
                                className="absolute inset-0"
                            />
                        </TabsContent>

                        <TabsContent value="upload" className="flex-1 mt-0 flex items-center justify-center p-12">
                            {!file ? (
                                <div className="text-center p-12 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors relative w-full h-full flex flex-col items-center justify-center">
                                    <Upload className="h-16 w-16 text-muted-foreground mb-4" />
                                    <h3 className="text-xl font-medium mb-2">Upload HTML File</h3>
                                    <p className="text-muted-foreground mb-6">Drag & drop or click to browse</p>
                                    <input
                                        type="file"
                                        accept=".html,text/html"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={handleFileSelect}
                                    />
                                    <Button variant="outline">Browse Files</Button>
                                </div>
                            ) : (
                                <div className="text-center space-y-4">
                                    <div className="h-20 w-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                                        <FileCode className="h-10 w-10" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-lg">{file.name}</p>
                                        <p className="text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                                    </div>
                                    <Button variant="outline" onClick={() => setFile(null)}>Change File</Button>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </Card>
            </div>
        </div>
    )
}
