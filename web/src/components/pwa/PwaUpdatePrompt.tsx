import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { Button } from '../ui/Button'

type PwaNotice = 'offline-ready' | 'update-available' | null

export function PwaUpdatePrompt() {
  const [notice, setNotice] = useState<PwaNotice>(null)
  const updateServiceWorker = useRef<ReturnType<typeof registerSW>>(
    async () => undefined,
  )

  useEffect(() => {
    updateServiceWorker.current = registerSW({
      immediate: true,
      onOfflineReady: () => setNotice('offline-ready'),
      onNeedRefresh: () => setNotice('update-available'),
    })
  }, [])

  if (!notice) return null

  const updateAvailable = notice === 'update-available'

  return (
    <aside className="pwa-notice" role="status" aria-live="polite">
      <span className="pwa-notice__icon" aria-hidden="true">
        {updateAvailable ? (
          <ArrowClockwiseIcon size={22} weight="duotone" />
        ) : (
          <CheckCircleIcon size={22} weight="duotone" />
        )}
      </span>

      <div className="pwa-notice__content">
        <strong>
          {updateAvailable
            ? 'Nova versão disponível'
            : 'Aplicativo pronto para uso offline'}
        </strong>
        <p>
          {updateAvailable
            ? 'Atualize para receber as melhorias mais recentes do PAD.'
            : 'A interface abre sem conexão. Dados assistenciais continuam disponíveis somente online.'}
        </p>
        {updateAvailable ? (
          <Button
            type="button"
            size="sm"
            onClick={() => void updateServiceWorker.current(true)}
          >
            Atualizar agora
          </Button>
        ) : null}
      </div>

      <button
        type="button"
        className="pwa-notice__dismiss"
        aria-label="Fechar aviso"
        onClick={() => setNotice(null)}
      >
        <XIcon size={18} aria-hidden="true" />
      </button>
    </aside>
  )
}
