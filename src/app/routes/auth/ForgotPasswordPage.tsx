import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { resetPassword } from '@/lib/auth/auth'
import { ROUTES } from '@/config/routes'
import { ArrowLeft, Mail } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors }, getValues } = useForm<{ email: string }>()

  const onSubmit = async (data: { email: string }) => {
    setLoading(true)
    setError('')
    try {
      await resetPassword(data.email)
      setSent(true)
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar email')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <Mail className="w-8 h-8 text-primary-500" />
        </div>
        <h2 className="text-h3 mb-2">Email enviado!</h2>
        <p className="text-body-sm text-gray-500 mb-6">
          Enviamos um link de redefinição para <strong>{getValues('email')}</strong>.
          Verifique sua caixa de entrada.
        </p>
        <Link to={ROUTES.LOGIN} className="text-primary-500 font-medium hover:underline text-body-sm">
          Voltar para o login
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-h3 text-center mb-1">Redefinir senha</h2>
      <p className="text-body-sm text-gray-500 text-center mb-6">
        Insira seu email e enviaremos um link para redefinir sua senha
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
        <Button type="submit" loading={loading} className="w-full">
          Enviar link de redefinição
        </Button>
      </form>

      <div className="text-center mt-6">
        <Link to={ROUTES.LOGIN} className="inline-flex items-center gap-1 text-body-sm text-gray-500 hover:text-primary-500">
          <ArrowLeft className="w-4 h-4" /> Voltar para o login
        </Link>
      </div>
    </div>
  )
}
