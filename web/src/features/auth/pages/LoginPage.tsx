import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowRightIcon,
  CheckCircleIcon,
  EnvelopeSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  HeartbeatIcon,
  LockKeyIcon,
  ShieldCheckIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import type { z } from 'zod'
import fullLogo from '../../../assets/bencorp-full.png'
import { Button } from '../../../components/ui/Button'
import { FormField } from '../../../components/ui/FormField'
import { getApiErrorMessage } from '../../../lib/api'
import { defaultRouteForRole, useAuth } from '../auth-context'
import { login } from '../auth.api'
import { loginSchema } from '../auth.schema'

type LoginForm = z.infer<typeof loginSchema>

const trustPoints = [
  {
    icon: ShieldCheckIcon,
    title: 'Acesso por perfil',
    text: 'Cada profissional visualiza apenas o necessário para sua atuação.',
  },
  {
    icon: HeartbeatIcon,
    title: 'Fluxo assistencial integrado',
    text: 'Triagem, atendimento e histórico no mesmo ambiente de trabalho.',
  },
  {
    icon: UsersThreeIcon,
    title: 'Cuidado centrado nas pessoas',
    text: 'Informação organizada para apoiar decisões clínicas responsáveis.',
  },
]

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', senha: '' },
  })

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (session) => {
      signIn(session)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? defaultRouteForRole(session.usuario.papel), {
        replace: true,
      })
    },
  })

  if (user) {
    return <Navigate to={defaultRouteForRole(user.papel)} replace />
  }

  const onSubmit = handleSubmit((values) => mutation.mutate(values))

  return (
    <main className="login-page">
      <section className="login-story" aria-label="Sobre o PAD BenCorp">
        <div className="brand-rings brand-rings--large" aria-hidden="true" />
        <div className="login-story__content">
          <p className="login-story__eyebrow">Cuidado corporativo desde 2008</p>
          <h1>Decisões seguras em cada etapa do atendimento.</h1>
          <p className="login-story__lead">
            Uma experiência clara para conduzir o cuidado ocupacional do
            acolhimento ao registro clínico.
          </p>

          <div className="trust-list">
            {trustPoints.map(({ icon: Icon, title, text }, index) => (
              <article
                className="trust-item login-reveal"
                style={{ '--reveal-index': index } as React.CSSProperties}
                key={title}
              >
                <span className="trust-item__icon" aria-hidden="true">
                  <Icon size={22} weight="duotone" />
                </span>
                <div>
                  <h2>{title}</h2>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="login-access">
        <div className="login-card">
          <img
            className="login-card__logo"
            src={fullLogo}
            alt="BenCorp Benefícios e Saúde Ocupacional"
          />
          <div className="login-card__heading">
            <p>Pronto Atendimento Digital</p>
            <h2>Bem-vindo ao PAD</h2>
            <span>Entre com suas credenciais profissionais.</span>
          </div>

          <form className="login-form" onSubmit={onSubmit} noValidate>
            <FormField
              label="E-mail profissional"
              type="email"
              autoComplete="email"
              placeholder="nome@empresa.com.br"
              icon={<EnvelopeSimpleIcon size={19} />}
              error={errors.email?.message}
              {...register('email')}
            />
            <FormField
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Digite sua senha"
              icon={<LockKeyIcon size={19} />}
              action={
                <button
                  className="password-toggle"
                  type="button"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? (
                    <EyeSlashIcon size={19} />
                  ) : (
                    <EyeIcon size={19} />
                  )}
                </button>
              }
              error={errors.senha?.message}
              {...register('senha')}
            />

            {mutation.isError ? (
              <div className="form-alert" role="alert">
                <span aria-hidden="true">
                  <ShieldCheckIcon size={18} />
                </span>
                {getApiErrorMessage(mutation.error)}
              </div>
            ) : null}

            <Button
              type="submit"
              className="login-submit"
              loading={mutation.isPending}
              icon={<ArrowRightIcon size={19} />}
            >
              Acessar plataforma
            </Button>
          </form>

          {import.meta.env.DEV ? (
            <details className="demo-access">
              <summary>Credenciais de demonstração</summary>
              <div>
                <p>
                  <CheckCircleIcon size={16} weight="fill" />
                  Médico: carla.nogueira@pad.local
                </p>
                <p>Senha: Senha@123</p>
              </div>
            </details>
          ) : null}

          <p className="login-card__footer">
            Ambiente protegido. O acesso e as ações são registrados.
          </p>
        </div>
      </section>
    </main>
  )
}
