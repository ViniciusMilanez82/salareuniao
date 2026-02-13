import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/config/routes'
import { FileQuestion, Home } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-surface dark:bg-surface-dark flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <FileQuestion className="w-20 h-20 mx-auto text-gray-400 dark:text-gray-500 mb-6" aria-hidden />
        <h1 className="text-h1 font-bold text-gray-900 dark:text-white mb-2">Página não encontrada</h1>
        <p className="text-body text-gray-600 dark:text-gray-400 mb-8">
          O endereço que você acessou não existe ou foi movido.
        </p>
        <Link to={ROUTES.DASHBOARD}>
          <Button className="gap-2">
            <Home className="w-4 h-4" />
            Voltar ao painel
          </Button>
        </Link>
      </div>
    </div>
  )
}
