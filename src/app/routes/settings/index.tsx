import { useState } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { useAuthStore } from '@/stores/useAuthStore'
import { User, Bell, Shield, Palette, Key, Globe, Save } from 'lucide-react'

const tabs = [
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'notifications', label: 'Notificações', icon: Bell },
  { id: 'security', label: 'Segurança', icon: Shield },
  { id: 'appearance', label: 'Aparência', icon: Palette },
  { id: 'api', label: 'API', icon: Key },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const { user, theme, setTheme } = useAuthStore()

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-h2">Configurações</h1>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-56 shrink-0 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-body-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          {activeTab === 'profile' && (
            <Card>
              <CardTitle>Informações do Perfil</CardTitle>
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <Avatar name={user?.name || 'U'} src={user?.avatar_url} size="xl" />
                  <div>
                    <Button variant="secondary" size="sm">Alterar Foto</Button>
                    <p className="text-body-xs text-gray-400 mt-1">JPG, PNG - Max 5MB</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Nome" defaultValue={user?.name} />
                  <Input label="Email" defaultValue={user?.email} disabled />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Empresa" defaultValue={user?.company || ''} />
                  <Input label="Cargo" defaultValue={user?.job_title || ''} />
                </div>
                <div>
                  <label className="label">Bio</label>
                  <textarea className="input-field min-h-[80px] resize-vertical" placeholder="Conte um pouco sobre você..." />
                </div>
                <div className="flex justify-end pt-4">
                  <Button icon={<Save className="w-4 h-4" />}>Salvar Alterações</Button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'appearance' && (
            <Card>
              <CardTitle>Aparência</CardTitle>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="label">Tema</label>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    {(['light', 'dark', 'system'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${
                          theme === t ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <Palette className={`w-6 h-6 mx-auto mb-2 ${theme === t ? 'text-primary-500' : 'text-gray-400'}`} />
                        <span className="text-body-sm font-medium capitalize">{t === 'system' ? 'Sistema' : t === 'light' ? 'Claro' : 'Escuro'}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">Idioma</label>
                  <select className="input-field">
                    <option>Português (BR)</option>
                    <option>English (US)</option>
                    <option>Español</option>
                  </select>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardTitle>Preferências de Notificação</CardTitle>
              <div className="mt-6 space-y-4">
                {[
                  { label: 'Email', desc: 'Receber notificações por email' },
                  { label: 'Push', desc: 'Notificações push no navegador' },
                  { label: 'Lembrete de sessão', desc: '15 minutos antes da sessão iniciar' },
                  { label: 'Resumo semanal', desc: 'Relatório semanal de atividades' },
                  { label: 'Ações atribuídas', desc: 'Quando um action item for atribuído' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-body-sm font-medium">{item.label}</p>
                      <p className="text-body-xs text-gray-500">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-gray-600 peer-checked:bg-primary-500" />
                    </label>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <CardTitle>Segurança</CardTitle>
              <div className="mt-6 space-y-6">
                <div>
                  <h4 className="text-body font-medium mb-3">Alterar Senha</h4>
                  <div className="space-y-3">
                    <Input label="Senha Atual" type="password" />
                    <Input label="Nova Senha" type="password" />
                    <Input label="Confirmar Nova Senha" type="password" />
                  </div>
                  <Button className="mt-3" size="sm">Atualizar Senha</Button>
                </div>
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-body font-medium">Autenticação de Dois Fatores</h4>
                      <p className="text-body-sm text-gray-500">Adicione uma camada extra de segurança</p>
                    </div>
                    <Button variant="secondary" size="sm">Ativar 2FA</Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'api' && (
            <Card>
              <CardTitle>Chaves de API</CardTitle>
              <p className="text-body-sm text-gray-500 mt-1">Gerencie suas chaves de acesso à API</p>
              <div className="mt-4">
                <Button variant="secondary" size="sm" icon={<Key className="w-4 h-4" />}>
                  Gerar Nova Chave
                </Button>
                <div className="mt-4 p-4 bg-gray-50 dark:bg-surface-dark rounded-lg border">
                  <p className="text-body-xs text-gray-500">Nenhuma chave de API criada ainda.</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
