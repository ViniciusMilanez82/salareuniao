import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { signUpWithEmail } from '@/lib/auth/auth'
import { useAuthStore } from '@/stores/useAuthStore'
import { ROUTES } from '@/config/routes'
import { Check, X } from 'lucide-react'

interface RegisterForm {
  name: string
  email: string
  password: string
  confirmPassword: string
  company?: string
  jobTitle?: string
  acceptTerms: boolean
}

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>()
  const password = watch('password', '')

  const passwordRules = [
    { label: 'Mínimo 8 caracteres', valid: password.length >= 8 },
    { label: 'Uma letra maiúscula', valid: /[A-Z]/.test(password) },
    { label: 'Uma letra minúscula', valid: /[a-z]/.test(password) },
    { label: 'Um número', valid: /[0-9]/.test(password) },
  ]

  const passwordStrength = passwordRules.filter((r) => r.valid).length

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true)
    setError('')
    try {
      const result = await signUpWithEmail(data.email, data.password, data.name, data.company, data.jobTitle)
      // Auto-login após registro
      const { setUser, setWorkspace, setMembership } = useAuthStore.getState()
      setUser(result.user as any)
      if (result.workspaces?.length > 0) {
        setWorkspace(result.workspaces[0] as any)
        setMembership({ role: result.workspaces[0].role } as any)
      }
      navigate(ROUTES.DASHBOARD)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-h3 text-center mb-1">Crie sua conta grátis</h2>
      <p className="text-body-sm text-gray-500 text-center mb-2">
        Comece a criar debates com agentes de IA em minutos
      </p>
      <p className="text-body-xs text-gray-400 text-center mb-6">
        Sua conta já vem com 15 agentes prontos para usar
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-body-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          id="name"
          label="Nome completo"
          placeholder="João Silva"
          error={errors.name?.message}
          {...register('name', { required: 'Nome obrigatório' })}
        />

        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="seu@email.com"
          error={errors.email?.message}
          {...register('email', { required: 'Email obrigatório' })}
        />

        <div>
          <Input
            id="password"
            label="Senha"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password', { required: 'Senha obrigatória', minLength: { value: 8, message: 'Mínimo 8 caracteres' } })}
          />
          {password && (
            <div className="mt-2">
              <div className="flex gap-1 mb-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i <= passwordStrength
                        ? passwordStrength <= 2 ? 'bg-red-500' : passwordStrength === 3 ? 'bg-accent-500' : 'bg-secondary-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                ))}
              </div>
              <ul className="space-y-1">
                {passwordRules.map((rule) => (
                  <li key={rule.label} className="flex items-center gap-1.5 text-body-xs">
                    {rule.valid ? (
                      <Check className="w-3 h-3 text-secondary-500" />
                    ) : (
                      <X className="w-3 h-3 text-gray-400" />
                    )}
                    <span className={rule.valid ? 'text-secondary-600' : 'text-gray-400'}>{rule.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <Input
          id="confirmPassword"
          label="Confirmar senha"
          type="password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Confirme sua senha',
            validate: (val) => val === password || 'As senhas não coincidem',
          })}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            id="company"
            label="Empresa"
            placeholder="Opcional"
            {...register('company')}
          />
          <Input
            id="jobTitle"
            label="Cargo"
            placeholder="Opcional"
            {...register('jobTitle')}
          />
        </div>

        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 accent-primary-500 mt-0.5"
            {...register('acceptTerms', { required: 'Aceite os termos' })}
          />
          <span className="text-body-sm text-gray-600">
            Aceito os{' '}
            <a href="#" className="text-primary-500 hover:underline">termos de serviço</a>
            {' '}e a{' '}
            <a href="#" className="text-primary-500 hover:underline">política de privacidade</a>
          </span>
        </label>
        {errors.acceptTerms && (
          <p className="text-body-xs text-red-500">{errors.acceptTerms.message}</p>
        )}

        <Button type="submit" loading={loading} className="w-full">
          Criar conta
        </Button>
      </form>

      <p className="text-center text-body-sm text-gray-500 mt-6">
        Já tem conta?{' '}
        <Link to={ROUTES.LOGIN} className="text-primary-500 font-medium hover:underline">
          Fazer login
        </Link>
      </p>
    </div>
  )
}
