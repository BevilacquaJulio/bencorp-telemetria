import {
  ArrowLeftIcon,
  LockKeyIcon,
  ShieldCheckIcon,
  VideoCameraIcon,
} from '@phosphor-icons/react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
} from '@livekit/components-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { ErrorState, TableSkeleton } from '../../../components/ui/DataState'
import { RiskBadge } from '../../../components/ui/StatusBadge'
import { getApiErrorMessage } from '../../../lib/api'
import { formatCpf } from '../../../lib/format'
import { getAttendance } from '../../atendimentos/atendimentos.api'
import { createProfessionalRoomAccess } from '../sala.api'

export function ProfessionalRoomPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const attendance = useQuery({
    queryKey: ['attendance', id],
    queryFn: () => getAttendance(id),
    enabled: Boolean(id),
  })
  const access = useMutation({
    mutationFn: () => createProfessionalRoomAccess(id),
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
          onDisconnected={() => navigate('/fila')}
        >
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    )
  }

  return (
    <div className="room-lobby">
      <Button
        className="back-button"
        type="button"
        variant="ghost"
        size="sm"
        icon={<ArrowLeftIcon size={17} />}
        onClick={() => navigate('/fila')}
      >
        Voltar para a fila
      </Button>

      {attendance.isLoading ? <TableSkeleton rows={4} /> : null}
      {attendance.isError ? (
        <ErrorState
          message={getApiErrorMessage(attendance.error)}
          onRetry={() => void attendance.refetch()}
        />
      ) : null}

      {attendance.data ? (
        <section className="room-lobby__card page-enter">
          <div className="room-lobby__visual" aria-hidden="true">
            <div className="brand-rings" />
            <span>
              <VideoCameraIcon size={31} weight="duotone" />
            </span>
          </div>
          <div className="room-lobby__content">
            <p>Sala de teleatendimento</p>
            <h1>{attendance.data.paciente.nome}</h1>
            <div className="room-patient-meta">
              <span>{formatCpf(attendance.data.paciente.cpf)}</span>
              <RiskBadge risk={attendance.data.risco} />
            </div>
            <div className="room-safety-note">
              <ShieldCheckIcon size={20} weight="duotone" />
              <p>
                O acesso é individual, temporário e vinculado a este
                atendimento.
              </p>
            </div>
            {access.isError ? (
              <div className="inline-alert" role="alert">
                <LockKeyIcon size={19} />
                {getApiErrorMessage(access.error)}
              </div>
            ) : null}
            <Button
              type="button"
              loading={access.isPending}
              icon={<VideoCameraIcon size={19} weight="fill" />}
              onClick={() => access.mutate()}
            >
              Entrar na sala segura
            </Button>
            <small>
              Ao entrar, o navegador solicitará acesso à câmera e ao microfone.
            </small>
          </div>
        </section>
      ) : null}
    </div>
  )
}
