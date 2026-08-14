import {
  ArrowLeftIcon,
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
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { ErrorState, TableSkeleton } from '../../../components/ui/DataState'
import { RiskBadge } from '../../../components/ui/StatusBadge'
import { getApiErrorMessage } from '../../../lib/api'
import { formatCpf } from '../../../lib/format'
import { getAttendance } from '../../atendimentos/atendimentos.api'
import type { AttendanceDetail } from '../../atendimentos/atendimentos.types'
import { useAuth } from '../../auth/auth-context'
import { MedicalActions } from '../components/MedicalActions'
import { NursingActions } from '../components/NursingActions'
import { PatientInviteCard } from '../components/PatientInviteCard'
import { createProfessionalRoomAccess } from '../sala.api'
import type { RoomAccess } from '../sala.types'

type ProfessionalWorkspaceProps = {
  access: RoomAccess
  attendance: AttendanceDetail
  role: 'ENFERMEIRO' | 'MEDICO'
  onExit: () => void
  onReconnect: () => void
  reconnecting: boolean
  reconnectError: unknown
}

function ProfessionalWorkspace({
  access,
  attendance,
  role,
  onExit,
  onReconnect,
  reconnecting,
  reconnectError,
}: ProfessionalWorkspaceProps) {
  const [disconnected, setDisconnected] = useState(false)

  return (
    <div className="conference-screen professional-conference-screen">
      <div className="professional-room-workspace">
        <section className="conference-stage" aria-label="Videoconsulta">
          <LiveKitRoom
            key={access.token}
            token={access.token}
            serverUrl={access.url}
            connect
            audio
            video
            data-lk-theme="default"
            className="conference-room"
            onConnected={() => setDisconnected(false)}
            onDisconnected={() => setDisconnected(true)}
          >
            <VideoConference />
            <RoomAudioRenderer />
          </LiveKitRoom>

          {disconnected ? (
            <div className="conference-disconnected" role="alert">
              <WarningCircleIcon size={23} weight="duotone" />
              <div>
                <strong>A conexão com a sala foi interrompida</strong>
                <p>Seu atendimento continua aberto. Tente entrar novamente.</p>
                {reconnectError ? (
                  <small>{getApiErrorMessage(reconnectError)}</small>
                ) : null}
              </div>
              <Button
                type="button"
                size="sm"
                loading={reconnecting}
                onClick={onReconnect}
              >
                Reconectar
              </Button>
            </div>
          ) : null}
        </section>

        <aside className="care-workspace" aria-label="Área assistencial">
          <header className="care-workspace__patient">
            <div>
              <p>Atendimento em andamento</p>
              <h1>{attendance.paciente.nome}</h1>
              <span>{formatCpf(attendance.paciente.cpf)}</span>
            </div>
            <RiskBadge risk={attendance.risco} />
          </header>

          <PatientInviteCard attendanceId={attendance.id} />

          {role === 'ENFERMEIRO' ? (
            <NursingActions attendance={attendance} onComplete={onExit} />
          ) : (
            <MedicalActions attendance={attendance} onComplete={onExit} />
          )}

          <Button type="button" variant="ghost" size="sm" onClick={onExit}>
            Sair da sala sem finalizar
          </Button>
        </aside>
      </div>
    </div>
  )
}

export function ProfessionalRoomPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const attendance = useQuery({
    queryKey: ['attendance', id],
    queryFn: () => getAttendance(id),
    enabled: Boolean(id),
  })
  const access = useMutation({
    mutationFn: () => createProfessionalRoomAccess(id),
  })

  if (
    access.data &&
    attendance.data &&
    (user?.papel === 'ENFERMEIRO' || user?.papel === 'MEDICO')
  ) {
    return (
      <ProfessionalWorkspace
        key={access.data.token}
        access={access.data}
        attendance={attendance.data}
        role={user.papel}
        onExit={() => navigate('/fila')}
        onReconnect={() => access.mutate()}
        reconnecting={access.isPending}
        reconnectError={access.error}
      />
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
            <PatientInviteCard attendanceId={attendance.data.id} />
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
