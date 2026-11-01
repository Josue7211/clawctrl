import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import openapiTS, { astToString } from 'openapi-typescript'
import Ajv2020 from 'ajv/dist/2020.js'

const source = new URL('../shared/contracts/notes.openapi.json', import.meta.url)
const generated = new URL('../frontend/src/features/notes/notes-api.generated.ts', import.meta.url)
export const notesContract = JSON.parse(await readFile(source, 'utf8'))
function checkRefs(value) {
  if (!value || typeof value !== 'object') return
  if (value.$ref && !value.$ref.startsWith('#/components/')) throw new Error('Notes contract references must stay local')
  Object.values(value).forEach(checkRefs)
}
checkRefs(notesContract)
const ajv = new Ajv2020({ strict: false, allErrors: true })
const validators = new Map()
export function validateNoteSchema(name, value) {
  if (!validators.has(name)) validators.set(name, ajv.compile({ ...notesContract, $schema: 'https://json-schema.org/draft/2020-12/schema', $ref: `#/components/schemas/${name}` }))
  const validate = validators.get(name)
  if (!validate(value)) throw new Error(`Notes contract ${name}: ${ajv.errorsText(validate.errors)}`)
}
export function validateNoteExchange(method, path, status, value, contentType = 'application/json') {
  const segments = path.split('/')
  const route = notesContract.paths[path] || Object.entries(notesContract.paths).find(([template]) => {
    const parts = template.split('/')
    return parts.length === segments.length && parts.every((part, index) => /^\{[^}]+\}$/.test(part) ? !!segments[index] : part === segments[index])
  })?.[1]
  const operation = route?.[method.toLowerCase()]
  if (!operation) return
  const schema = operation.responses[String(status)]?.content?.[contentType]?.schema
  if (!schema) throw new Error(`Unspecified Notes response: ${method} ${path} ${status} ${contentType}`)
  const validate = ajv.compile({ ...notesContract, $schema: 'https://json-schema.org/draft/2020-12/schema', ...schema })
  if (!validate(value)) throw new Error(`Notes response drift: ${method} ${path} ${status}: ${ajv.errorsText(validate.errors)}`)
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const [name, schema] of Object.entries(notesContract.components.schemas)) {
    for (const example of schema.examples || []) validateNoteSchema(name, example)
  }
  const output = astToString(await openapiTS(notesContract))
  const text = '// Generated from shared/contracts/notes.openapi.json; run npm run contract:generate.\n' + output
  if (process.argv.includes('--check')) {
    if (await readFile(generated, 'utf8').catch(() => '') !== text) {
      throw new Error('Notes contract types are stale; run npm run contract:generate')
    }
    console.log('Notes contract examples and generated types agree.')
  } else {
    await writeFile(generated, text)
    console.log(`Generated ${fileURLToPath(generated)}`)
  }
}
