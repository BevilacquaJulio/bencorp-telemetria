import {
  LockKeyIcon,
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
import { Button } from '../../../components/ui/Button'
import { getApiErrorMessage } from '../../../lib/api'
import { exchangePatientLink } from '../sala.api'

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
      <div className="brand-rings brand-rings--patient" aria-hidden="true" />
      <section className="patient-room-card page-enter">
        <img src={fullLogo} alt="BenCorp Benefícios e Saúde Ocupacional" />
        <span className="patient-room-card__icon" aria-hidden="true">
          {invalidLink ? (
            <WarningCircleIcon size={30} />
          ) : (
            <VideoCameraIcon size={30} weight="duotone" />
          )}
        </span>
        <p>Pronto Atendimento Digital</p>
        <h1>{invalidLink ? 'Link de acesso incompleto' : 'Sua sala está pronta'}</h1>
        <span className="patient-room-card__lead">
          {invalidLink
            ? 'Solicite um novo convite ao profissional responsável.'
            : 'Entre em um local reservado antes de iniciar o atendimento.'}
        </span>

        {access.isError ? (
          <div className="form-alert" role="alert">
            <LockKeyIcon size={18} />
            {getApiErrorMessage(access.error)}
          </div>
        ) : null}

        <Button
          type="button"
          disabled={invalidLink}
          loading={access.isPending}
          icon={<VideoCameraIcon size={19} weight="fill" />}
          onClick={() => access.mutate()}
        >
          Entrar no atendimento
        </Button>
        <div className="patient-room-card__security">
          <ShieldCheckIcon size={18} weight="duotone" />
          <span>Este convite é individual e pode ser utilizado uma única vez.</span>
        </div>
      </section>
    </main>
  )
}
