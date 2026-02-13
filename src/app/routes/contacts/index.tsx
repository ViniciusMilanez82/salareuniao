import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import { fetchContacts, createContact, updateContact, deleteContact } from '@/lib/api/contacts'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import {
  Plus, Search, X, Save, Trash2, Edit, Mail, Phone, Building2,
  Briefcase, StickyNote, UserPlus, Users, HelpCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { Contact } from '@/types/database.types'

export default function ContactsPage() {
  const [search, setSearch] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { workspace } = useAuthStore()

  // Form state
  const [form, setForm] = useState({
    name: '', email: '', company: '', job_title: '', phone: '', notes: ''
  })

  const resetForm = () => {
    setForm({ name: '', email: '', company: '', job_title: '', phone: '', notes: '' })
    setEditingContact(null)
  }

  const loadContacts = () => {
    if (!workspace?.id) return
    setLoading(true)
    fetchContacts(workspace.id)
      .then(setContacts)
      .catch(() => setContacts([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (workspace?.id) {
      loadContacts()
    } else {
      setContacts([])
      setLoading(false)
    }
  }, [workspace?.id])

  const openCreate = () => {
    resetForm()
    setShowForm(true)
  }

  const openEdit = (contact: Contact) => {
    setEditingContact(contact)
    setForm({
      name: contact.name || '',
      email: contact.email || '',
      company: contact.company || '',
      job_title: contact.job_title || '',
      phone: contact.phone || '',
      notes: contact.notes || '',
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('O nome do contato é obrigatório')
      return
    }
    if (!workspace?.id) return
    setSaving(true)
    try {
      if (editingContact) {
        await updateContact(editingContact.id, form)
        toast.success('Contato atualizado com sucesso!')
      } else {
        await createContact({ ...form, workspace_id: workspace.id })
        toast.success('Contato criado com sucesso!')
      }
      setShowForm(false)
      resetForm()
      loadContacts()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar contato')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este contato?')) return
    setDeleting(id)
    try {
      await deleteContact(id)
      toast.success('Contato removido')
      loadContacts()
    } catch {
      toast.error('Erro ao remover contato')
    } finally {
      setDeleting(null)
    }
  }

  const filtered = contacts.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2 flex items-center gap-2">
            <Users className="w-7 h-7 text-primary-500" />
            Contatos
          </h1>
          <p className="text-body text-gray-500 mt-1">
            {loading ? 'Carregando...' : `${contacts.length} contato(s) cadastrado(s)`}
          </p>
        </div>
        <Button onClick={openCreate} icon={<Plus className="w-4 h-4" />}>
          Novo Contato
        </Button>
      </div>

      {/* Dica para leigos */}
      {!loading && contacts.length === 0 && !showForm && (
        <Card className="bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center shrink-0">
              <UserPlus className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <h3 className="text-body font-semibold">Comece adicionando seus contatos</h3>
              <p className="text-body-sm text-gray-600 dark:text-gray-400 mt-1">
                Contatos são pessoas da sua rede profissional. Ao adicioná-los aqui, 
                você pode convidá-los para reuniões e acompanhar seus negócios.
              </p>
              <Button className="mt-3" size="sm" onClick={openCreate} icon={<Plus className="w-4 h-4" />}>
                Adicionar primeiro contato
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Search */}
      {contacts.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, email ou empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      )}

      {/* Modal / Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <Card className="w-full max-w-lg relative">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-h3 font-semibold">
                  {editingContact ? 'Editar Contato' : 'Novo Contato'}
                </h2>
                <p className="text-body-xs text-gray-500 mt-1">
                  {editingContact
                    ? 'Atualize as informações do contato'
                    : 'Preencha os dados para adicionar um novo contato'}
                </p>
              </div>
              <button onClick={() => { setShowForm(false); resetForm() }} className="btn-icon">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Input
                  label="Nome *"
                  placeholder="Ex: João Silva"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <Input
                    label="Email"
                    type="email"
                    placeholder="joao@empresa.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="relative">
                  <Input
                    label="Telefone"
                    placeholder="(11) 99999-9999"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Empresa"
                  placeholder="Nome da empresa"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
                <Input
                  label="Cargo"
                  placeholder="Ex: Diretor Comercial"
                  value={form.job_title}
                  onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Observações</label>
                <textarea
                  className="input-field min-h-[80px] resize-vertical"
                  placeholder="Anotações sobre o contato (opcional)"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <Button variant="ghost" onClick={() => { setShowForm(false); resetForm() }}>
                Cancelar
              </Button>
              <Button
                icon={<Save className="w-4 h-4" />}
                loading={saving}
                onClick={handleSave}
              >
                {editingContact ? 'Atualizar' : 'Criar Contato'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Contact List */}
      {loading ? (
        <div className="text-center py-16 text-gray-500">Carregando contatos...</div>
      ) : filtered.length === 0 && contacts.length > 0 ? (
        <div className="text-center py-16 text-gray-500">
          Nenhum contato encontrado para "{search}".
        </div>
      ) : filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card key={c.id} className="group hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <Avatar name={c.name} size="lg" src={c.avatar_url} />
                <div className="flex-1 min-w-0">
                  <h3 className="text-body font-semibold truncate">{c.name}</h3>
                  {c.job_title && (
                    <p className="text-body-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Briefcase className="w-3 h-3" /> {c.job_title}
                    </p>
                  )}
                  {c.company && (
                    <p className="text-body-xs text-gray-500 flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {c.company}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(c)} className="btn-icon w-8 h-8" title="Editar contato">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="btn-icon w-8 h-8 text-red-500"
                    title="Remover contato"
                    disabled={deleting === c.id}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t space-y-1.5">
                {c.email && (
                  <p className="text-body-xs text-gray-500 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <a href={`mailto:${c.email}`} className="hover:text-primary-500 transition-colors">{c.email}</a>
                  </p>
                )}
                {c.phone && (
                  <p className="text-body-xs text-gray-500 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400" /> {c.phone}
                  </p>
                )}
                {c.notes && (
                  <p className="text-body-xs text-gray-500 flex items-center gap-2 truncate">
                    <StickyNote className="w-3.5 h-3.5 text-gray-400 shrink-0" /> {c.notes}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
