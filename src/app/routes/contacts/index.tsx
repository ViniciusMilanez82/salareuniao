import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Plus, Search } from 'lucide-react'

export default function ContactsPage() {
  const [search, setSearch] = useState('')

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2">Contatos</h1>
          <p className="text-body text-gray-500 mt-1">0 contatos</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />}>Novo Contato</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Buscar contatos..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
      </div>

      <div className="text-center py-16 text-gray-500">
        Nenhum contato encontrado. API de contatos ainda não disponível.
      </div>
    </div>
  )
}
