export type FieldSchema = {
    name: string
    jsonKey: string // The actual key in the JSON
    type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any'
    isOptional: boolean
    rawType: string
    nestedType?: string // e.g. "User" for a property of type User, or "User" for [User]
}

export type ValidationReport = {
    isValid: boolean
    errors: string[] // Type Mismatches
    missingRequiredFields: string[] // REQUIRED: Must be present
    missingOptionalFields: string[] // OPTIONAL: Can be ignored
}

export class SchemaValidator {

    // Parses code into a Map of StructName -> Fields[]
    // Returns the name of the first detected struct as the root
    static parseSchemas(code: string, lang: 'swift' | 'kotlin'): { schemas: Record<string, FieldSchema[]>, root: string | null } {
        const schemas: Record<string, FieldSchema[]> = {}
        let root: string | null = null

        const lines = code.split('\n')
        let currentScope: string | null = null

        // Temporary storage for mappings found in the current scope
        // Map<PropertyName, JsonKey>
        let scopeMappings: Record<string, string> = {}
        // Pending annotation for Kotlin (e.g. @SerialName found on previous line)
        let pendingSerialName: string | null = null

        // Regex patterns
        const structPattern = lang === 'swift'
            ? /struct\s+(\w+)/
            : /(?:data\s+)?class\s+(\w+)/

        // Swift: let name: Type
        // Capture until end of line or '=' (ignoring default values roughly)
        // This allows [String: String]? or complex generics
        // Excludes comments starting with //
        const swiftFieldPattern = /(?:let|var)\s+(\w+)\s*:\s*([^=\n]+)/

        // Swift CodingKeys: case name = "jsonKey"
        const swiftCodingKeyPattern = /case\s+(\w+)\s*=\s*"([^"]+)"/

        // Kotlin: @SerialName("jsonKey") val name: Type
        // Allow <, >, ?, comma, space, brackets, colon in type
        const kotlinSingleLinePattern = /(?:@SerialName\s*\(\s*"([^"]+)"\s*\)\s*)?(?:val|var)\s+(\w+)\s*:\s*([\w<>?,\s\[\]:]+)/
        // Matches just the annotation
        const kotlinAnnotationPattern = /@SerialName\s*\(\s*"([^"]+)"\s*\)/
        // Matches just the field
        const kotlinFieldOnlyPattern = /(?:val|var)\s+(\w+)\s*:\s*([\w<>?,\s\[\]:]+)/

        // PRE-PASS: Determine scopes and fields, handling order independence
        for (const line of lines) {
            const trimmedLine = line.trim()
            if (!trimmedLine || trimmedLine.startsWith('//')) continue

            // Check for new scope
            const structMatch = structPattern.exec(trimmedLine)
            if (structMatch) {
                const structName = structMatch[1]

                currentScope = structName
                scopeMappings = {} // Reset for new scope
                pendingSerialName = null

                if (!root) root = structName
                if (!schemas[structName]) schemas[structName] = []
                continue
            }

            // If inside a scope...
            if (currentScope) {
                if (lang === 'swift') {
                    // Try matching Field
                    const fieldMatch = swiftFieldPattern.exec(trimmedLine)
                    if (fieldMatch) {
                        const name = fieldMatch[1]
                        let rawType = fieldMatch[2].trim()

                        // Clean up rawType if it has trailing comments or weirdness
                        if (rawType.includes('//')) {
                            rawType = rawType.split('//')[0].trim()
                        }

                        // Avoid duplicates
                        if (!schemas[currentScope].some(f => f.name === name)) {
                            // Check if we already found a mapping for this field (keys before props)
                            const mappedKey = scopeMappings[name] || name

                            schemas[currentScope].push({
                                name,
                                jsonKey: mappedKey,
                                rawType,
                                type: this.mapType(rawType),
                                isOptional: rawType.endsWith('?'),
                                nestedType: this.extractNestedType(rawType)
                            })
                        }
                    }

                    // Try matching CodingKey
                    const keyMatch = swiftCodingKeyPattern.exec(trimmedLine)
                    if (keyMatch) {
                        const propertyName = keyMatch[1]
                        const jsonKey = keyMatch[2]

                        // 2. Store for future
                        scopeMappings[propertyName] = jsonKey // Store mapping

                        // 1. Update existing (keys after props)
                        const existingField = schemas[currentScope].find(f => f.name === propertyName)
                        if (existingField) {
                            existingField.jsonKey = jsonKey
                        }
                    }

                } else {
                    // Kotlin

                    // Check for standalone annotation line
                    const annotationMatch = kotlinAnnotationPattern.exec(trimmedLine)
                    if (annotationMatch) {
                        pendingSerialName = annotationMatch[1]
                        continue
                    }

                    // Check for field line (possibly with inline annotation)
                    let fieldMatch = kotlinSingleLinePattern.exec(trimmedLine)

                    // If simple pattern didn't capture annotation but we have a field match, check if we have a pending annotation
                    if (!fieldMatch) {
                        const simpleMatch = kotlinFieldOnlyPattern.exec(trimmedLine)
                        if (simpleMatch) {
                            fieldMatch = [simpleMatch[0], pendingSerialName || undefined, simpleMatch[1], simpleMatch[2]] as any
                        }
                    }

                    if (fieldMatch) {
                        const customKey = fieldMatch[1] || pendingSerialName
                        const name = fieldMatch[2]
                        let rawType = fieldMatch[3].trim()
                        if (rawType.includes('//')) {
                            rawType = rawType.split('//')[0].trim()
                        }

                        if (!schemas[currentScope].some(f => f.name === name)) {
                            schemas[currentScope].push({
                                name,
                                jsonKey: customKey || name,
                                rawType,
                                type: this.mapType(rawType),
                                isOptional: rawType.endsWith('?'),
                                nestedType: this.extractNestedType(rawType)
                            })
                        }
                        // Reset pending
                        pendingSerialName = null
                    }
                }
            }
        }

        return { schemas, root }
    }

    private static mapType(raw: string): FieldSchema['type'] {
        const t = raw.replace('?', '').trim()

        // Swift Dictionary [String: Any] -> START with [ but HAS :
        // This prevents dictionaries from being treated as arrays
        if (t.startsWith('[') && t.includes(':')) return 'object'

        if (t.startsWith('[') || t.startsWith('Array<') || t.startsWith('List<')) return 'array'
        if (t === 'String') return 'string'
        if (['Int', 'Double', 'Float', 'Long', 'CGFloat', 'number'].includes(t)) return 'number'
        if (['Bool', 'Boolean'].includes(t)) return 'boolean'
        return 'object'
    }

    private static extractNestedType(raw: string): string | undefined {
        let t = raw.replace('?', '').trim()

        // Ignore Dictionaries
        if (t.startsWith('[') && t.includes(':')) return undefined

        if (t.startsWith('[') && t.endsWith(']')) {
            t = t.substring(1, t.length - 1)
        }
        else if ((t.startsWith('Array<') || t.startsWith('List<')) && t.endsWith('>')) {
            const start = t.indexOf('<') + 1
            t = t.substring(start, t.length - 1)
        }
        const baseType = t.trim()
        if (['String', 'Int', 'Double', 'Float', 'Bool', 'Boolean'].includes(baseType)) return undefined
        return baseType
    }

    static validate(json: any, code: string, lang: 'swift' | 'kotlin'): ValidationReport {
        const { schemas, root } = this.parseSchemas(code, lang)

        const report: ValidationReport = {
            isValid: true,
            errors: [],
            missingRequiredFields: [],
            missingOptionalFields: []
        }

        if (!root) {
            report.isValid = false
            report.errors.push("No Struct or Class definition found.")
            return report
        }

        this.validateScope(json, root, schemas, report, '')

        // Deduplicate
        report.errors = [...new Set(report.errors)]
        report.missingRequiredFields = [...new Set(report.missingRequiredFields)]
        report.missingOptionalFields = [...new Set(report.missingOptionalFields)]

        if (report.errors.length > 0 || report.missingRequiredFields.length > 0) {
            report.isValid = false
        }

        return report
    }

    private static validateScope(
        data: any,
        scopeName: string,
        schemas: Record<string, FieldSchema[]>,
        report: ValidationReport,
        pathPrefix: string
    ) {
        const fields = schemas[scopeName]
        if (!fields) return

        if (typeof data !== 'object' || data === null) {
            report.errors.push(`Expected object for type '${scopeName}' at '${pathPrefix || 'root'}', got ${typeof data}`)
            return
        }

        for (const field of fields) {
            const key = field.jsonKey
            const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key
            const value = data[key]
            const exists = key in data

            // 1. Existence
            if (!exists || value === null) {
                if (!field.isOptional) {
                    report.missingRequiredFields.push(currentPath)
                } else {
                    report.missingOptionalFields.push(currentPath)
                }
                continue
            }

            // 2. Type Checking (if exists and not null)
            if (exists && value !== null) {
                if (field.type === 'array') {
                    if (!Array.isArray(value)) {
                        report.errors.push(`Type mismatch at '${currentPath}': Expected Array, got ${typeof value}`)
                    } else if (field.nestedType && schemas[field.nestedType]) {
                        value.forEach((item, index) => {
                            this.validateScope(item, field.nestedType!, schemas, report, `${currentPath}[${index}]`)
                        })
                    }
                }
                else if (field.type === 'object' && field.nestedType && schemas[field.nestedType]) {
                    this.validateScope(value, field.nestedType, schemas, report, currentPath)
                }
                else if (field.type !== 'any' && field.type !== 'object') {
                    const actualType = typeof value
                    if (actualType !== field.type) {
                        report.errors.push(`Type mismatch at '${currentPath}': Expected ${field.rawType}, got ${actualType}`)
                    }
                }
            }
        }
    }
}
