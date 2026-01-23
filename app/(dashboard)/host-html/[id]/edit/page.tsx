'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MonacoEditor } from '@/components/ui/monaco-editor'
import { EXPIRY_OPTIONS, ExpiryType, calculateExpiryDate } from '@/lib/file-hosting'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Check, Save, Loader2 } from 'lucide-react'

export default function EditHtmlPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const supabase = createClient()
    const queryClient = useQueryClient()

    const [name, setName] = useState('')
    const [code, setCode] = useState('')
    const [originalPath, setOriginalPath] = useState('')
    const [expiry, setExpiry] = useState<ExpiryType>('never')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const fetchFile = async () => {
            try {
                // 1. Get Metadata
                const { data: fileData, error: dbError } = await supabase
                    .from('hosted_files')
                    .select('*')
                    .eq('id', id)
                    .single()

                if (dbError) throw dbError

                setName(fileData.name)
                setOriginalPath(fileData.storage_path)
                setExpiry(fileData.expiry_type as ExpiryType)

                // 2. Download Content
                const { data: blob, error: storageError } = await supabase.storage
                    .from('hosted_files')
                    .download(fileData.storage_path)

                if (storageError) throw storageError

                const text = await blob.text()
                setCode(text)

            } catch (error) {
                console.error('Error loading file:', error)
                toast.error('Failed to load file')
                router.push('/host-html')
            } finally {
                setLoading(false)
            }
        }

        fetchFile()
    }, [id, router, supabase])

    const handleSave = async () => {
        try {
            setSaving(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const safeName = name.endsWith('.html') ? name : `${name}.html`
            // Keep original path if name hasn't changed to avoid clutter? 
            // Actually, if name changes, we should probably generate new path or rename. 
            // For simplicity, let's keep original path unless we want to support renaming deeply.
            // If we just overwrite the blob at originalPath, the name in DB is just metadata. 
            // So we can update name in DB and overwrite content at storage_path.

            const blob = new Blob([code], { type: 'text/html' })
            const fileToUpload = new File([blob], safeName, { type: 'text/html' })

            // 1. Upload/Overwrite
            const { error: uploadError } = await supabase.storage
                .from('hosted_files')
                .upload(originalPath, fileToUpload, { upsert: true })

            if (uploadError) throw uploadError

            // 2. Update DB
            const updates: any = {
                name: safeName,
                size: fileToUpload.size,
            }

            // Only update expiry if it changed meaningfully (handled by user selection)
            const newExpiryDate = calculateExpiryDate(expiry)
            updates.expiry_type = expiry
            updates.expires_at = newExpiryDate ? newExpiryDate.toISOString() : null

            const { error: dbError } = await supabase
                .from('hosted_files')
                .update(updates)
                .eq('id', id)

            if (dbError) throw dbError

            toast.success('File saved successfully')
            await queryClient.invalidateQueries({ queryKey: ['hosted_html'] })

        } catch (error: any) {
            console.error('Error saving HTML:', error)
            toast.error(error.message || 'Failed to save HTML')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="flex flex-col h-[calc(100vh-2rem)] p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Edit HTML</h1>
                    <p className="text-muted-foreground mt-1">
                        Modify the content and settings of your hosted page.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" /> Save Changes
                            </>
                        )}
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

                {/* Editor Area */}
                <Card className="col-span-2 flex flex-col min-h-0 h-full bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden">
                    <div className="flex-1 relative">
                        <MonacoEditor
                            value={code}
                            onChange={(val) => setCode(val || '')}
                            language="html"
                            className="absolute inset-0"
                        />
                    </div>
                </Card>
            </div>
        </div>
    )
}
