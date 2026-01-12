export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen grid place-items-center bg-background p-4">
            {children}
        </div>
    )
}
