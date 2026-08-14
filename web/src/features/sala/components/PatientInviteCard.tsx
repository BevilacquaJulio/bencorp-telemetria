import {
  CheckIcon,
  CopyIcon,
  LinkSimpleIcon,
  ShareNetworkIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { getApiErrorMessage } from '../../../lib/api'
import { formatDateTime } from '../../../lib/format'
import { buildPublicAppUrl } from '../../../lib/public-url'
import { createPatientInvite } from '../sala.api'
import type { PatientInvite } from '../sala.types'

export function PatientInviteCard({ attendanceId }: { attendanceId: string }) {
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)
  const [currentInvite, setCurrentInvite] = useState(() =>
    queryClient.getQueryData<PatientInvite>(['patient-invite', attendanceId]),
  )
  const invite = useMutation({
    mutationFn: () => createPatientInvite(attendanceId),
    onSuccess: (createdInvite) => {
      queryClient.setQueryData(['patient-invite', attendanceId], createdInvite)
      setCurrentInvite(createdInvite)
      setCopied(false)
    },
  })
  const publicLink = currentInvite
    ? buildPublicAppUrl(currentInvite.link)
    : null

  async function copyLink() {
    if (!publicLink) return
    try {
      await navigator.clipboard.writeText(publicLink)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  async function shareLink() {
    if (!publicLink || typeof navigator.share !== 'function') return
    try {
      await navigator.share({
        title: 'Convite para teleatendimento',
        text: 'Acesse sua sala segura de teleatendimento BenCorp.',
        url: publicLink,
      })
    } catch {
      // Fechar o seletor nativo de compartilhamento não é uma falha do fluxo.
    }
  }

  return (
    <section className="patient-invite-card" aria-labelledby="patient-invite-title">
      <header>
        <span aria-hidden="true">
          <LinkSimpleIcon size={20} weight="duotone" />
        </span>
        <div>
          <h2 id="patient-invite-title">Convite do paciente</h2>
          <p>Link individual, temporário e válido para um único acesso.</p>
        </div>
      </header>

      {currentInvite && publicLink ? (
        <>
          <label className="invite-link-field">
            <span>Link para compartilhar</span>
            <input value={publicLink} readOnly aria-label="Link do paciente" />
          </label>
          <p className="invite-expiration">
            Expira em {formatDateTime(currentInvite.expiraEm)}. Gere outro se o
            paciente já tiver usado este convite.
          </p>
          <div className="patient-invite-card__actions">
            <Button
              type="button"
              size="sm"
              icon={copied ? <CheckIcon size={17} /> : <CopyIcon size={17} />}
              onClick={() => void copyLink()}
            >
              {copied ? 'Link copiado' : 'Copiar link'}
            </Button>
            {typeof navigator.share === 'function' ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<ShareNetworkIcon size={17} />}
                onClick={() => void shareLink()}
              >
                Compartilhar
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={invite.isPending}
              onClick={() => invite.mutate()}
            >
              Gerar novo
            </Button>
          </div>
        </>
      ) : (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={invite.isPending}
          icon={<LinkSimpleIcon size={17} />}
          onClick={() => invite.mutate()}
        >
          Gerar convite do paciente
        </Button>
      )}

      {invite.isError ? (
        <div className="compact-alert" role="alert">
          <WarningCircleIcon size={18} />
          {getApiErrorMessage(invite.error)}
        </div>
      ) : null}
    </section>
  )
}
