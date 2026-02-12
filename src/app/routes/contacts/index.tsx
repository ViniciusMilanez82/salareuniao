import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Plus, Search, Star, Mail, Phone, Building } from 'lucide-react'

const mockContacts = [
  { id: '1', name: 'Ricardo Mendes', email: 'ricardo@corp.com', company: 'TechCorp', job_title: 'CEO', phone: '+55 11 99999-0001', is_favorite: true, tags: ['vip', 'decisor'] },
  { id: '2', name: 'Fernanda Costa', email: 'fernanda@innov.io', company: 'InnovTech', job_title: 'CTO', phone: '+55 11 99999-0002', is_favorite: true, tags: ['técnico'] },
  { id: '3', name: 'Bruno Almeida', email: 'bruno@bigdata.ai', company: 'BigData AI', job_title: 'Head de Dados', phone: '+55 11 99999-0003', is_favorite: false, tags: ['dados'] },
  { id: '4', name: 'Camila Rocha', email: 'camila@legalx.com', company: 'LegalX', job_title: 'Sócia', phone: '+55 11 99999-0004', is_favorite: false, tags: ['jurídico'] },
]

export default function ContactsPage() {
  const [search, setSearch] = useState('')

  const filtered = mockContacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.company.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2">Contatos</h1>
          <p className="text-body text-gray-500 mt-1">{mockContacts.length} contatos</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />}>Novo Contato</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Buscar contatos..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((contact) => (
          <Card key={contact.id} interactive>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={contact.name} size="lg" />
                <div>
                  <h3 className="text-body font-semibold">{contact.name}</h3>
                  <p className="text-body-sm text-gray-500">{contact.job_title}</p>
                </div>
              </div>
              {contact.is_favorite && <Star className="w-4 h-4 text-accent-500 fill-accent-500" />}
            </div>
            <div className="mt-4 space-y-2 text-body-sm text-gray-500">
              <div className="flex items-center gap-2"><Building className="w-4 h-4" /> {contact.company}</div>
              <div className="flex items-center gap-2"><Mail className="w-4 h-4" /> {contact.email}</div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4" /> {contact.phone}</div>
            </div>
            <div className="flex gap-1.5 mt-3 pt-3 border-t">
              {contact.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
