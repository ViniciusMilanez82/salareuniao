import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { signInWithEmail } from '@/lib/supabase/auth'
import { useAuthStore } from '@/stores/useAuthStore'
import { ROUTES } from '@/config/routes'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { setUser } = useAuthStore()

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    setError('')
    try {
      const result = await signInWithEmail(data.email, data.password)
      setUser(result.user as any)
      if (result.workspaces?.length > 0) {
        const { setWorkspace, setMembership } = useAuthStore.getState()
        setWorkspace(result.workspaces[0] as any)
        setMembership({ role: result.workspaces[0].role } as any)
      }
      navigate(ROUTES.DASHBOARD)
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-h3 text-center mb-1">Acessar plataforma</h2>
      <p className="text-body-sm text-gray-500 text-center mb-6">
        Entre com suas credenciais para continuar
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-body-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="seu@email.com"
          error={errors.email?.message}
          {...register('email', { required: 'Email obrigatório' })}
        />

        <Input
          id="password"
          label="Senha"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password', { required: 'Senha obrigatória', minLength: { value: 6, message: 'Mínimo 6 caracteres' } })}
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-primary-500 rounded" />
            <span className="text-body-sm text-gray-600">Lembrar-me</span>
          </label>
          <Link to={ROUTES.FORGOT_PASSWORD} className="text-body-sm text-primary-500 hover:underline">
            Esqueci minha senha
          </Link>
        </div>

        <Button type="submit" loading={loading} className="w-full">
          Entrar
        </Button>
      </form>

      <p className="text-center text-body-sm text-gray-500 mt-6">
        Não tem conta?{' '}
        <Link to={ROUTES.REGISTER} className="text-primary-500 font-medium hover:underline">
          Criar nova conta
        </Link>
      </p>
    </div>
  )
}
