import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import { fetchIntegrations, saveIntegration, deleteIntegration } from '@/lib/api/integrations'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Key, Save, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const PROVIDER_INFO: Record<string, { docs: string; placeholder: string }> = {
  openai: { docs: 'https://platform.openai.com/api-keys', placeholder: 'sk-...' },
  anthropic: { docs: 'https://console.anthropic.com/settings/keys', placeholder: 'sk-ant-...' },
  elevenlabs: { docs: 'https://elevenlabs.io/app/settings/api-keys', placeholder: '...' },
  serper: { docs: 'https://serper.dev/dashboard', placeholder: 'Chave Serper' },
}

export default function AdminIntegrationsPage() {
  const { workspace } = useAuthStore()
  const [integrations, setIntegrations] = useState<{ provider: string; label: string; configured: boolean; is_active: boolean }[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    if (workspace?.id) {
      fetchIntegrations(workspace.id)
        .then(setIntegrations)
        .catch(() => setIntegrations([]))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [workspace?.id])

  const handleSave = async (provider: string) => {
    const key = editing[provider]?.trim()
    if (!key || !workspace?.id) return
    setSaving(provider)
    try {
      await saveIntegration(workspace.id, provider, key)
      toast.success(`${PROVIDER_INFO[provider]?.placeholder || provider} configurado`)
      setEditing((e) => ({ ...e, [provider]: '' }))
      const list = await fetchIntegrations(workspace.id)
      setIntegrations(list)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar')
    } finally {
      setSaving(null)
    }
  }

  const handleDelete = async (provider: string) => {
    if (!workspace?.id) return
    if (!confirm('Remover integração?')) return
    setSaving(provider)
    try {
      await deleteIntegration(workspace.id, provider)
      toast.success('Integração removida')
      const list = await fetchIntegrations(workspace.id)
      setIntegrations(list)
    } catch (err: any) {
      toast.error('Erro ao remover')
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-h2">Integrações</h1>
        <p className="text-gray-500">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-h2">Integrações</h1>
        <p className="text-body text-gray-500 mt-1">
          Configure as APIs para LLM, TTS e pesquisa web. Os agentes usarão essas chaves para debates inteligentes.
        </p>
      </div>

      <div className="grid gap-4">
        {integrations.map((int) => (
          <Card key={int.provider}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <Key className="w-5 h-5 text-primary-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{int.label}</CardTitle>
                    <p className="text-body-xs text-gray-500 mt-0.5">
                      {int.configured ? (
                        <Badge variant="success">Configurado</Badge>
                      ) : (
                        <Badge variant="default">Não configurado</Badge>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex-1 max-w-md space-y-2">
                  <input
                    type="password"
                    placeholder={PROVIDER_INFO[int.provider]?.placeholder || 'API Key'}
                    value={editing[int.provider] ?? ''}
                    onChange={(e) => setEditing((x) => ({ ...x, [int.provider]: e.target.value }))}
                    className="input-field text-body-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={!editing[int.provider]?.trim() || saving === int.provider}
                      onClick={() => handleSave(int.provider)}
                      icon={<Save className="w-4 h-4" />}
                    >
                      {saving === int.provider ? 'Salvando...' : 'Salvar'}
                    </Button>
                    {int.configured && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDelete(int.provider)}
                        disabled={saving === int.provider}
                        icon={<Trash2 className="w-4 h-4" />}
                      >
                        Remover
                      </Button>
                    )}
                    <a
                      href={PROVIDER_INFO[int.provider]?.docs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-body-xs text-primary-500 hover:underline"
                    >
                      Obter chave →
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
