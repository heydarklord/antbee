import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string, filename: string }> }
) {
    try {
        const { id, filename } = await params
        console.log(`[API/Content] Accessing file. ID: ${id}, Filename (URL): ${filename}`)
        const supabase = await createClient()

        // 1. Fetch metadata
        const { data: fileData, error: dbError } = await supabase
            .from('hosted_files')
            .select('*')
            .eq('id', id)
            .single()

        if (dbError || !fileData) {
            console.error('[API/Content] DB Error or Not Found:', dbError)
            return new NextResponse('File not found', { status: 404 })
        }

        // 2. Check expiry
        if (fileData.expires_at && new Date(fileData.expires_at) < new Date()) {
            return new NextResponse('File has expired', { status: 410 })
        }

        // 3. Increment views (fire and forget / optimistic)
        await supabase
            .from('hosted_files')
            .update({ views: fileData.views + 1 })
            .eq('id', id)

        // 4. Download file
        const { data: fileBlob, error: storageError } = await supabase.storage
            .from('hosted_files')
            .download(fileData.storage_path)

        if (storageError || !fileBlob) {
            console.error('[API/Content] Storage Error:', storageError)
            // If the file is missing in storage but exists in DB, it's a 404 effectively for the content
            return new NextResponse('File content not found', { status: 404 })
        }

        // 5. Serve with stored MIME type
        return new NextResponse(fileBlob, {
            headers: {
                'Content-Type': fileData.mime_type,
                'Cache-Control': 'public, max-age=3600',
            },
        })
    } catch (error) {
        console.error('[API/Content] Details Error:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
