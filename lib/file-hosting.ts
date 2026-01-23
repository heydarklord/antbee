import { addDays, addWeeks, addMonths } from 'date-fns'

export const EXPIRY_OPTIONS = [
    { label: '1 Day', value: '1_day' },
    { label: '3 Days', value: '3_days' },
    { label: '1 Week', value: '1_week' },
    { label: '1 Month', value: '1_month' },
    { label: 'Never', value: 'never' },
] as const

export type ExpiryType = typeof EXPIRY_OPTIONS[number]['value']

export interface UploadMetadata {
    name: string
    size: number
    mimeType: string
    expiryType: ExpiryType
}

export function calculateExpiryDate(type: ExpiryType): Date | null {
    const now = new Date()
    switch (type) {
        case '1_day': return addDays(now, 1)
        case '3_days': return addDays(now, 3)
        case '1_week': return addWeeks(now, 1)
        case '1_month': return addMonths(now, 1)
        case 'never': return null
        default: return null
    }
}

export function getExpiryLabel(type: ExpiryType): string {
    return EXPIRY_OPTIONS.find(o => o.value === type)?.label || 'Unknown'
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
