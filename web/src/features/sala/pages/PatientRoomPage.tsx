import {
  ShieldCheckIcon,
  VideoCameraIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
} from '@livekit/components-react'
import { useMutation } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'react-router-dom'
import fullLogo from '../../../assets/bencorp-full.png'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { getApiErrorMessage } from '../../../lib/api'
import { exchangePatientLink } from '../sala.api'

/**
 * Sala vista pelo paciente — única tela fora do shell autenticado.
 *
 * O paciente entra por link, sem conta e possivelmente pelo celular, em pé no
 * corredor da empresa. Por isso a tela tem um alvo só: um botão grande. Tudo
 * mais é contexto de confiança (marca, aviso de privacidade), não navegação.
 */
export function PatientRoomPage() {
  const { atendimentoId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const opaqueToken = searchParams.get('token') ?? ''

  const access = useMutation({
    mutationFn: () =>
      exchangePatientLink({ token: opaqueToken, attendanceId: atendimentoId }),
  })

  if (access.data) {
    return (
      <div className="conference-screen">
        <LiveKitRoom
          token={access.data.token}
          serverUrl={access.data.url}
          connect
          audio
          video
          data-lk-theme="default"
          className="conference-room"
        >
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    )
  }

  const invalidLink = !atendimentoId || !opaqueToken

  return (
    <main className="patient-room-page">
      <div className="brand-rings" aria-hidden="true" />

      <section className="patient-room-card page-enter">
        <img src={fullLogo} alt="BenCorp Benefícios e Saúde Ocupacional" />

        <span className="patient-room-card__icon" aria-hidden="true">
          {invalidLink ? (
            <WarningCircleIcon size={29} weight="duotone" />
          ) : (
            <VideoCameraIcon size={29} weight="duotone" />
          )}
        </span>

        <p>Pronto Atendimento Digital</p>
        <h1>
          {invalidLink ? 'Link de acesso incompleto' : 'Sua sala está pronta'}
        </h1>
        <span className="patient-room-card__lead">
          {invalidLink
            ? 'Solicite um novo convite ao profissional responsável pelo seu atendimento.'
            : 'Procure um local reservado e com boa conexão antes de entrar.'}
        </span>

        {access.isError ? (
          <Alert tone="error">{getApiErrorMessage(access.error)}</Alert>
        ) : null}

        <Button
          type="button"
          size="lg"
          block
          disabled={invalidLink}
          loading={access.isPending}
          icon={<VideoCameraIcon size={18} weight="fill" />}
          onClick={() => access.mutate()}
        >
          Entrar no atendimento
        </Button>

        <div className="patient-room-card__security">
          <ShieldCheckIcon size={17} weight="duotone" aria-hidden="true" />
          <span>
            Este convite é individual e pode ser utilizado uma única vez.
          </span>
        </div>
      </section>
    </main>
  )
}
