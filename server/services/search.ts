/**
 * Web Search - Serper API
 * Permite agentes pesquisarem fatos em tempo real
 */
import { query } from '../db.js'
import { decrypt } from '../lib/encrypt.js'

export async function getSerperKey(workspaceId: string): Promise<string | null> {
  const res = await query(
    `SELECT api_key_encrypted FROM integration_settings
     WHERE provider = 'serper' AND is_active = true
     AND (workspace_id = $1 OR workspace_id IS NULL)
     ORDER BY workspace_id DESC NULLS LAST
     LIMIT 1`,
    [workspaceId]
  )
  if (res.rows[0]?.api_key_encrypted) return decrypt(res.rows[0].api_key_encrypted)
  return process.env.SERPER_API_KEY || null
}

export async function webSearch(queryText: string, workspaceId: string): Promise<string> {
  const apiKey = await getSerperKey(workspaceId)
  if (!apiKey) return ''

  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: queryText, num: 5 }),
  })
  if (!res.ok) return ''

  const data = (await res.json()) as { organic?: { title: string; snippet: string }[] }
  const results = data.organic || []
  return results.map((r) => `${r.title}: ${r.snippet}`).join('\n\n')
}
