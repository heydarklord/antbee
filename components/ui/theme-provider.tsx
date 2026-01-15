"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

const PRIMARY_COLORS = [
    { name: 'Zinc', class: 'zinc', light: '#18181b', dark: '#fafafa' },
    { name: 'Red', class: 'red', light: '#dc2626', dark: '#ef4444' },
    { name: 'Orange', class: 'orange', light: '#ea580c', dark: '#f97316' },
    { name: 'Green', class: 'green', light: '#16a34a', dark: '#22c55e' },
    { name: 'Blue', class: 'blue', light: '#2563eb', dark: '#3b82f6' },
    { name: 'Violet', class: 'violet', light: '#7c3aed', dark: '#8b5cf6' },
]

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
    React.useEffect(() => {
        const savedColor = localStorage.getItem('primaryColor')
        if (savedColor) {
            const color = PRIMARY_COLORS.find(c => c.name === savedColor)
            if (color) {
                const root = document.documentElement
                if (savedColor === 'Zinc') {
                    root.style.removeProperty('--primary')
                    root.style.removeProperty('--primary-foreground')
                    root.style.removeProperty('--ring')
                } else {
                    root.style.setProperty('--primary', color.light)
                    root.style.setProperty('--primary-foreground', '#ffffff')
                    root.style.setProperty('--ring', color.light)
                }
            }
        }
    }, [])

    return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
