import { RequestInspector } from '@/components/dashboard/request-inspector'

export default function RequestsPage() {
    return (
        <div className="p-8 h-screen flex flex-col">
            <div className="mb-6">
                <h2 className="text-3xl font-bold tracking-tight">Request Inspector</h2>
                <p className="text-muted-foreground">Real-time inspection of incoming requests.</p>
            </div>
            <div className="flex-1 min-h-0">
                <RequestInspector />
            </div>
        </div>
    )
}
