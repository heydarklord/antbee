"use client"

import { useState } from 'react'
import { ChevronRight, ChevronDown, Plus, Trash2, MoreHorizontal, Type } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// --- Immutable Helpers ---

const setIn = (obj: any, path: (string | number)[], value: any): any => {
    if (path.length === 0) return value
    const [head, ...tail] = path
    const copy = Array.isArray(obj) ? [...obj] : { ...obj }

    // Handle array numeric keys
    if (Array.isArray(copy) && typeof head === 'number') {
        copy[head] = setIn(copy[head], tail, value)
        return copy
    }

    copy[head] = setIn(copy[head], tail, value)
    return copy
}

const deleteIn = (obj: any, path: (string | number)[]): any => {
    if (path.length === 0) return undefined
    const [head, ...tail] = path

    if (tail.length === 0) {
        if (Array.isArray(obj)) {
            const copy = [...obj]
            if (typeof head === 'number') copy.splice(head, 1)
            return copy
        } else {
            const copy = { ...obj }
            delete copy[head]
            return copy
        }
    }

    const copy = Array.isArray(obj) ? [...obj] : { ...obj }
    copy[head] = deleteIn(copy[head], tail)
    return copy
}

const renameKeyIn = (obj: any, path: (string | number)[], oldKey: string, newKey: string): any => {
    // Navigate to parent
    if (path.length === 0) return obj // Cannot rename root

    // We need to modify the parent of the target key
    // Actually, "path" usually points to the item. 
    // If we want to rename key at `path`, `path`'s last element is `oldKey`.

    const parentPath = path.slice(0, -1)
    const currentKey = path[path.length - 1]

    // Get parent
    let parent = obj
    for (const p of parentPath) parent = parent[p]

    if (Array.isArray(parent)) return obj // Cannot rename array indices

    // Create new parent object with ordered keys to maintain specific position if possible, 
    // or just standard generic object key replacement
    const newParent = { ...parent }
    const value = newParent[currentKey]
    delete newParent[currentKey]
    newParent[newKey] = value

    return setIn(obj, parentPath, newParent)
}

// --- Component ---

interface VisualJsonEditorProps {
    data: any
    onChange: (newData: any) => void
    isPatchMode?: boolean
}

export function VisualJsonEditor({ data, onChange, isPatchMode }: VisualJsonEditorProps) {

    const handleUpdate = (path: (string | number)[], value: any) => {
        onChange(setIn(data, path, value))
    }

    const handleDelete = (path: (string | number)[]) => {
        onChange(deleteIn(data, path))
    }

    const handleRename = (path: (string | number)[], newKey: string) => {
        const oldKey = path[path.length - 1] as string
        if (oldKey === newKey) return
        onChange(renameKeyIn(data, path, oldKey, newKey))
    }

    const handleAddChild = (path: (string | number)[], type: 'string' | 'number' | 'boolean' | 'object' | 'array') => {
        // Navigate to target container
        let target = data
        for (const p of path) target = target[p]

        let initialValue: any = ""
        if (type === 'number') initialValue = 0
        if (type === 'boolean') initialValue = false
        if (type === 'object') initialValue = {}
        if (type === 'array') initialValue = []

        if (Array.isArray(target)) {
            // Push to array
            const newArray = [...target, initialValue]
            onChange(setIn(data, path, newArray))
        } else {
            // Add to object with generic name
            let baseKey = "new_field"
            let counter = 1
            let newKey = baseKey
            while (newKey in target) {
                newKey = `${baseKey}_${counter++}`
            }
            const newObject = { ...target, [newKey]: initialValue }
            onChange(setIn(data, path, newObject))
        }
    }

    return (
        <div className="font-mono text-sm">
            <Node
                value={data}
                name="root"
                path={[]}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onRename={handleRename}
                onAdd={handleAddChild}
                isRoot={true}
            />
        </div>
    )
}

interface NodeProps {
    name: string | number
    value: any
    path: (string | number)[]
    isRoot?: boolean
    onUpdate: (path: (string | number)[], value: any) => void
    onDelete: (path: (string | number)[]) => void
    onRename: (path: (string | number)[], newKey: string) => void
    onAdd: (path: (string | number)[], type: 'string' | 'number' | 'boolean' | 'object' | 'array') => void
}

function Node({ name, value, path, isRoot, onUpdate, onDelete, onRename, onAdd }: NodeProps) {
    const [isExpanded, setIsExpanded] = useState(true)
    const type = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value

    const isContainer = type === 'object' || type === 'array'
    const childCount = isContainer ? Object.keys(value).length : 0

    // Ensure we handle "null" properly (typeof null is object)
    const effectiveType = value === null ? 'null' : type

    const handleValueChange = (val: string) => {
        if (effectiveType === 'number') {
            const num = parseFloat(val)
            onUpdate(path, isNaN(num) ? 0 : num)
        } else {
            onUpdate(path, val)
        }
    }

    return (
        <div className="relative group">
            {/* Guide Line - Removed in favor of hierarchy border in children container */}

            <div className={cn(
                "flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-white/5 transition-colors border border-transparent hover:border-white/5",
                isRoot && "mb-2 pb-2 border-b hover:border-b-border"
            )}>
                {/* Expander */}
                {isContainer ? (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="h-5 w-5 flex items-center justify-center rounded hover:bg-white/10 text-muted-foreground"
                    >
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </button>
                ) : (
                    <div className="w-5" /> // Spacer
                )}

                {/* Key / Name */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isRoot ? (
                        <span className="text-muted-foreground font-semibold px-1">root</span>
                    ) : (
                        typeof name === 'number' ? (
                            <span className="text-muted-foreground/60 text-xs px-1">[{name}]</span>
                        ) : (
                            <input
                                className="bg-transparent border-none focus:ring-0 focus:bg-white/10 rounded px-1 min-w-[60px] w-auto max-w-[150px] text-foreground font-medium placeholder:text-muted-foreground/50 transition-colors"
                                value={name}
                                onChange={(e) => onRename(path, e.target.value)}
                            />
                        )
                    )}

                    {/* Type Badge */}
                    <Badge variant="secondary" className={cn(
                        "h-4 px-1 text-[9px] uppercase tracking-wider font-normal bg-opacity-50 hover:bg-opacity-100 transition-all cursor-default",
                        effectiveType === 'string' && "text-green-400 bg-green-400/10 hover:bg-green-400/20",
                        effectiveType === 'number' && "text-blue-400 bg-blue-400/10 hover:bg-blue-400/20",
                        effectiveType === 'boolean' && "text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20",
                        effectiveType === 'object' && "text-purple-400 bg-purple-400/10 hover:bg-purple-400/20",
                        effectiveType === 'array' && "text-orange-400 bg-orange-400/10 hover:bg-orange-400/20",
                    )}>
                        {effectiveType}
                    </Badge>
                </div>

                {/* Value Input */}
                {!isContainer && (
                    <div className="flex-1 min-w-[120px]">
                        {effectiveType === 'boolean' ? (
                            <Switch
                                checked={value}
                                onCheckedChange={(c) => onUpdate(path, c)}
                                className="scale-75 origin-left"
                            />
                        ) : effectiveType === 'string' ? (
                            <Input
                                className="h-7 text-xs bg-black/20 border-white/10 focus:border-primary/50"
                                value={value}
                                onChange={(e) => handleValueChange(e.target.value)}
                            />
                        ) : effectiveType === 'number' ? (
                            <Input
                                type="number"
                                className="h-7 text-xs bg-black/20 border-white/10 focus:border-primary/50 font-mono text-blue-400"
                                value={value}
                                onChange={(e) => handleValueChange(e.target.value)}
                            />
                        ) : (
                            <span className="text-muted-foreground text-xs italic">null</span>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center transition-opacity">
                    {isContainer && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <Plus className="h-3.5 w-3.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onAdd(path, 'string')}>Add String</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onAdd(path, 'number')}>Add Number</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onAdd(path, 'boolean')}>Add Boolean</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onAdd(path, 'object')}>Add Object</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onAdd(path, 'array')}>Add Array</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    {!isRoot && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => onDelete(path)}>
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Children */}
            {isContainer && isExpanded && (
                <div className="pl-6 border-l border-white/5 ml-2.5">
                    {Object.entries(value).map(([key, val], index) => (
                        <Node
                            key={`${key}-${index}`} // Composite key to avoid issues when renaming
                            name={Array.isArray(value) ? Number(key) : key}
                            value={val}
                            path={[...path, Array.isArray(value) ? Number(key) : key]}
                            onUpdate={onUpdate}
                            onDelete={onDelete}
                            onRename={onRename}
                            onAdd={onAdd}
                        />
                    ))}
                    {childCount === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground italic opacity-50">
                            Empty {effectiveType}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
