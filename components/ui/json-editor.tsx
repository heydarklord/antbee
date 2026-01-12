"use client"

import React from 'react'
import Editor from 'react-simple-code-editor'
import { highlight, languages } from 'prismjs'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-json'
import '@/components/ui/prism-theme.css'
import { cn } from '@/lib/utils'

interface JsonEditorProps {
    value: string
    onChange: (code: string) => void
    className?: string
    readOnly?: boolean
    error?: boolean
}

export function JsonEditor({ value, onChange, className, readOnly, error }: JsonEditorProps) {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        const target = e.currentTarget as HTMLTextAreaElement;
        const { selectionStart, selectionEnd, value } = target;

        const pairs: Record<string, string> = {
            '{': '}',
            '[': ']',
            '(': ')',
            '"': '"',
            "'": "'",
        };

        if (pairs[e.key]) {
            e.preventDefault();
            const open = e.key;
            const close = pairs[e.key];
            const newValue = value.substring(0, selectionStart) + open + value.substring(selectionStart, selectionEnd) + close + value.substring(selectionEnd);

            onChange(newValue);

            // Move cursor to between the pair (or after selection)
            // We need to wait for React/Editor to update value, but since this is a controlled input wrapper, 
            // typically we need to manually force the selection update after render or rely on the textarea behavior.
            // React-simple-code-editor doesn't expose a ref easily for imperative selection setting after render in a clean way via standard props
            // BUT, modifying the event target's selection immediately often works in React synthetic events for textareas 
            // before the state update flushes.
            // However, referencing the current target in a timeout is safer.

            setTimeout(() => {
                target.selectionStart = selectionStart + 1;
                target.selectionEnd = selectionEnd + 1;
            }, 0);
        }
    };

    return (
        <div className={cn("relative rounded-md border bg-muted/30 font-mono text-sm shadow-sm overflow-hidden",
            className,
            error && "border-destructive/50 ring-1 ring-destructive/20"
        )}>
            <div className="absolute top-2 right-2 z-10 text-xs text-muted-foreground select-none pointer-events-none">
                JSON
            </div>
            <Editor
                value={value}
                onValueChange={onChange}
                onKeyDown={handleKeyDown}
                highlight={code => highlight(code, languages.json, 'json')}
                padding={16}
                style={{
                    fontFamily: '"Fira code", "Fira Mono", monospace',
                    fontSize: 14,
                    minHeight: '200px',
                }}
                textareaClassName="focus:outline-none"
                readOnly={readOnly}
            />
        </div>
    )
}
