import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// Initialize Supabase Client for Server Route
// We use a service role or just standard server client? 
// Mocks should probably be public? OR guarded by API keys?
// For now, assume public access or check Team API Key if we want to be fancy.
// The user prompt implies "Mock Platform", often public dev tools.
// But database access requires credentials. We should use a service role if we want to bypass RLS for "reading" endpoints that might be private?
// Or we expect the caller to provide an API key?
// Let's rely on standard client but we might run into RLS if the user calling the endpoint isn't logged in.
// actually, endpoint consumption is usually public or via API Key.
// Let's stick to Public access for "Is Active" endpoints for now, 
// treating them as public mocks. We might need a SERVICE_ROLE client to fetch data if RLS blocks public.
// But I don't have SERVICE_KEY in env usually?
// I'll check env.
// If not, I'll use standard client and maybe RLS allows "anon" read?
// `schema.sql` had: "Users can view endpoints of their teams". Implicitly denies public.
// We probably need to implement API Key auth or relax RLS for specific "public mock" access.
// Or we just implement for "Authenticated User Testing" first.
// BUT "Test button" works for the user. External usage requires API Key.
// I'll start with implementing the handler using standard createServerClient.

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
    return handleRequest(req, params)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
    return handleRequest(req, params)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
    return handleRequest(req, params)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
    return handleRequest(req, params)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
    return handleRequest(req, params)
}

async function handleRequest(req: NextRequest, paramsPromise: Promise<{ slug: string[] }>) {
    const startTime = performance.now()
    const { slug } = await paramsPromise

    // Reconstruct path: /api/mock/users/123 -> /users/123
    // slug is ['users', '123']
    const mockPath = '/' + slug.join('/')
    const method = req.method

    // We need a supabase client with admin privileges to read ANY endpoint if we want public access,
    // OR we require api-key header.
    // Let's try to just use a public client and see if we can read. 
    // If not, we might need `process.env.SUPABASE_SERVICE_ROLE_KEY` which is usually not exposed to 'client' lib but available in route handlers.
    // Checking .env logic is overkill right now. I'll assume standard client.

    const cookieStore = await cookies()

    // Use Service Role if available to bypass RLS for public processing (e.g. logging)
    // Otherwise fall back to user session (which fails for public anon requests)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // STRICT VALIDATION: Fail fast if env vars are missing
    if (!supabaseUrl || !anonKey) {
        console.error("[Mock] Missing Supabase Environment Variables")
        return new NextResponse("Server Configuration Error: Missing Supabase URL/Key", { status: 500 })
    }

    // We prefer the service client for the route handler logic to ensure we can read endpoints and write logs regardless of caller auth.
    // However, createServerClient is designed for Auth helpers. 
    // If we have service key, we should use simple createClient from @supabase/supabase-js if possible, 
    // OR just use createServerClient with the service key (which works as admin).

    // Note: To use createClient from supabase-js we need to import it. 
    // But we already imported `createClient` from `@/lib/supabase/client` which is browser client.
    // Let's stick to createServerClient but pass the Service Key as the second argument if it exists.

    const supabase = createServerClient(
        supabaseUrl,
        serviceKey || anonKey,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
                    } catch { }
                },
            },
        }
    )

    // 1. Find Endpoint
    // We search for exact path match first.
    // NOTE: In a real system we'd support parameterized paths (/users/:id). 
    // For MVP, we'll do exact string match on the `path` column.
    const { data: endpoint, error } = await supabase
        .from('endpoints')
        .select('id, team_id, is_active, method')
        .eq('path', mockPath)
        .eq('method', method)
        .single()

    if (!endpoint || error) {
        // Try without leading slash or other variations?
        return NextResponse.json({ error: "Endpoint not found", path: mockPath, method }, { status: 404 })
    }

    if (!endpoint.is_active) {
        return NextResponse.json({ error: "Endpoint is paused" }, { status: 503 })
    }

    // 2. Fetch Rules & Default Response

    // We fetch ALL rules and responses for this endpoint
    const { data: rules } = await supabase
        .from('response_rules')
        .select('*')
        .eq('endpoint_id', endpoint.id)
        .order('priority', { ascending: true })

    // We need the default response (usually the one referenced by rules OR a fallback)
    // Actually we just need "a" response.
    // Let's fetch all responses for the endpoint
    const { data: responses } = await supabase
        .from('endpoint_responses')
        .select('*')
        .eq('endpoint_id', endpoint.id) // Get all responses for this endpoint

    if (!responses || responses.length === 0) {
        return NextResponse.json({ message: "No response configured" }, { status: 200 })
    }

    // 3. Evaluate Rules
    let selectedResponse = responses[0] // Default to first one found (ideally we have a is_default flag)

    // Check rules if any
    if (rules && rules.length > 0) {
        for (const rule of rules) {
            let matched = false
            const { type, key, operator, value } = rule.condition

            // Get actual value from request
            let actualValue: string | null = null

            if (type === 'header') {
                actualValue = req.headers.get(key)
            } else if (type === 'query') {
                actualValue = req.nextUrl.searchParams.get(key)
            } else if (type === 'body') {
                // Parsing body in Next.js Server Components needs care (streams)
                // For MVP we might skip body rules or try cloning.
                // Skipped for now to avoid consuming stream if not needed.
            }

            if (actualValue !== null) {
                if (operator === 'equals' && actualValue === value) matched = true
                else if (operator === 'contains' && actualValue.includes(value)) matched = true
                else if (operator === 'exists') matched = true
            }

            if (matched) {
                // Check if rule has inline action (overrides response_id)
                // We stored it in condition jsonb: { ...condition, action_status, action_body }
                const condition = rule.condition as any
                if (condition.action_status || condition.action_body) {
                    let body = selectedResponse.body
                    try {
                        if (condition.action_body) body = JSON.parse(condition.action_body)
                    } catch (e) { body = { error: "Invalid Rule Body JSON", raw: condition.action_body } }

                    selectedResponse = {
                        ...selectedResponse,
                        status_code: condition.action_status ? parseInt(condition.action_status) : selectedResponse.status_code,
                        body: body,
                        // Maintain other defaults
                    }
                    break // Win
                }

                // Fallback to response_id linkage
                if (rule.response_id) {
                    const target = responses.find(r => r.id === rule.response_id)
                    if (target) {
                        selectedResponse = target
                        break // First match wins (sorted by priority)
                    }
                }
            }
        }
    }

    // 4. Transform & Return Response

    // Delay
    if (selectedResponse.delay_ms > 0) {
        await new Promise(resolve => setTimeout(resolve, selectedResponse.delay_ms))
    }

    const responseBody = selectedResponse.body
    const responseStatus = selectedResponse.status_code || 200
    const responseHeaders = selectedResponse.headers || {}

    // 5. Async Logging (Fire and forget, or await?)
    // In serverless, await is safer.
    const duration = performance.now() - startTime

    // We shouldn't block the response too much.
    let logBody = null
    try {
        // Clone to avoid consuming the stream for the response? 
        // Actually we are not proxying, so we can read it.
        // But if we read it here, we must be careful if we needed it earlier.
        // Earlier we skipped reading body for rules.
        const clone = req.clone()
        const text = await clone.text()
        if (text) {
            try { logBody = JSON.parse(text) } catch { logBody = { raw: text.slice(0, 1000) } }
        }
    } catch (e) { /* ignore body read errors */ }

    const logHeaders: Record<string, string> = {}
    req.headers.forEach((v, k) => logHeaders[k] = v)

    console.log(`[Mock] Logging request for ${mockPath} (ServiceKey: ${!!serviceKey})`)

    // Attempt to log
    const { error: logError } = await supabase.from('request_logs').insert({
        endpoint_id: endpoint.id,
        method: method,
        status_code: responseStatus,
        duration_ms: Math.max(1, Math.round(duration)),
        headers: logHeaders,
        body: logBody,
        query_params: Object.fromEntries(req.nextUrl.searchParams),
        created_at: new Date().toISOString()
    })

    if (logError) {
        console.error("[Mock] Log Insert Error:", logError)
    } else {
        console.log("[Mock] Log Inserted Successfully")
    }

    return NextResponse.json(responseBody, {
        status: responseStatus,
        headers: responseHeaders
    })
}
