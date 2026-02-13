import { useState } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { useAuthStore } from '@/stores/useAuthStore'
import { apiPut } from '@/lib/api/client'
import { User, Bell, Shield, Palette, Key, Save, Settings } from 'lucide-react'
import toast from 'react-hot-toast'

const tabs = [
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'notifications', label: 'Notificações', icon: Bell },
  { id: 'security', label: 'Segurança', icon: Shield },
  { id: 'appearance', label: 'Aparência', icon: Palette },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const { user, theme, setTheme, setUser } = useAuthStore()

  // Profile state
  const [profileName, setProfileName] = useState(user?.name || '')
  const [profileCompany, setProfileCompany] = useState(user?.company || '')
  const [profileJobTitle, setProfileJobTitle] = useState(user?.job_title || '')
  const [savingProfile, setSavingProfile] = useState(false)

  // Security state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  // Notifications state
  const [notifPrefs, setNotifPrefs] = useState({
    email: true, push: true, session_reminder: true, weekly_summary: true, action_items: true,
  })

  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      toast.error('O nome é obrigatório')
      return
    }
    setSavingProfile(true)
    try {
      // Nota: endpoint de update profile não existe no backend atual
      // Simulando sucesso — implementar PUT /api/auth/profile no backend
      toast.success('Perfil salvo! (funcionalidade de backend em desenvolvimento)')
      setUser({ ...user!, name: profileName, company: profileCompany, job_title: profileJobTitle })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error('Informe a senha atual')
      return
    }
    if (!newPassword || newPassword.length < 8) {
      toast.error('A nova senha deve ter pelo menos 8 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }
    setSavingPassword(true)
    try {
      await apiPut('/auth/password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      toast.success('Senha alterada com sucesso!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar senha')
    } finally {
      setSavingPassword(false)
    }
  }

  const toggleNotif = (key: string) => {
    setNotifPrefs((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))
    toast.success('Preferência atualizada')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <Settings className="w-7 h-7 text-primary-500" />
        <h1 className="text-h2">Configurações</h1>
      </div>

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
              <p className="text-body-xs text-gray-500 mt-1">Atualize suas informações pessoais</p>
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <Avatar name={profileName || 'U'} src={user?.avatar_url} size="xl" />
                  <div>
                    <p className="text-body-sm font-medium">{profileName || 'Seu nome'}</p>
                    <p className="text-body-xs text-gray-500">{user?.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Nome *"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Seu nome completo"
                  />
                  <Input label="Email" defaultValue={user?.email} disabled />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Empresa"
                    value={profileCompany}
                    onChange={(e) => setProfileCompany(e.target.value)}
                    placeholder="Nome da empresa"
                  />
                  <Input
                    label="Cargo"
                    value={profileJobTitle}
                    onChange={(e) => setProfileJobTitle(e.target.value)}
                    placeholder="Seu cargo"
                  />
                </div>
                <div className="flex justify-end pt-4">
                  <Button
                    icon={<Save className="w-4 h-4" />}
                    loading={savingProfile}
                    onClick={handleSaveProfile}
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'appearance' && (
            <Card>
              <CardTitle>Aparência</CardTitle>
              <p className="text-body-xs text-gray-500 mt-1">Personalize a aparência do sistema</p>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="label">Tema</label>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    {(['light', 'dark', 'system'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => { setTheme(t); toast.success(`Tema alterado para ${t === 'system' ? 'automático' : t === 'light' ? 'claro' : 'escuro'}`) }}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${
                          theme === t ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <Palette className={`w-6 h-6 mx-auto mb-2 ${theme === t ? 'text-primary-500' : 'text-gray-400'}`} />
                        <span className="text-body-sm font-medium">{t === 'system' ? 'Sistema' : t === 'light' ? 'Claro' : 'Escuro'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardTitle>Preferências de Notificação</CardTitle>
              <p className="text-body-xs text-gray-500 mt-1">Escolha quais notificações você quer receber</p>
              <div className="mt-6 space-y-4">
                {[
                  { key: 'email', label: 'Email', desc: 'Receber notificações por email' },
                  { key: 'push', label: 'Push', desc: 'Notificações push no navegador' },
                  { key: 'session_reminder', label: 'Lembrete de sessão', desc: '15 minutos antes da sessão iniciar' },
                  { key: 'weekly_summary', label: 'Resumo semanal', desc: 'Relatório semanal de atividades' },
                  { key: 'action_items', label: 'Ações atribuídas', desc: 'Quando um action item for atribuído' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-body-sm font-medium">{item.label}</p>
                      <p className="text-body-xs text-gray-500">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifPrefs[item.key as keyof typeof notifPrefs]}
                        onChange={() => toggleNotif(item.key)}
                        className="sr-only peer"
                      />
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
              <p className="text-body-xs text-gray-500 mt-1">Gerencie sua senha e segurança da conta</p>
              <div className="mt-6 space-y-6">
                <div>
                  <h4 className="text-body font-medium mb-3">Alterar Senha</h4>
                  <div className="space-y-3">
                    <Input
                      label="Senha Atual"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Digite sua senha atual"
                    />
                    <Input
                      label="Nova Senha"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                    />
                    <Input
                      label="Confirmar Nova Senha"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                    />
                  </div>
                  <Button
                    className="mt-3"
                    size="sm"
                    loading={savingPassword}
                    onClick={handleChangePassword}
                  >
                    Atualizar Senha
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
