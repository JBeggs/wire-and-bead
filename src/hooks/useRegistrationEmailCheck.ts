'use client'

import { useCallback, useState } from 'react'

export type RegistrationEmailCheckStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'existing_can_link'
  | 'existing_no_link'
  | 'already_linked'

type CheckResponse = { status: RegistrationEmailCheckStatus }

export function useRegistrationEmailCheck(
  checkRegistrationEmail: (email: string) => Promise<CheckResponse>,
) {
  const [emailCheckStatus, setEmailCheckStatus] = useState<RegistrationEmailCheckStatus>('idle')

  const checkEmail = useCallback(
    async (rawEmail: string): Promise<RegistrationEmailCheckStatus> => {
      const trimmed = rawEmail.trim()
      if (!trimmed || !trimmed.includes('@')) {
        setEmailCheckStatus('idle')
        return 'idle'
      }

      setEmailCheckStatus('checking')
      try {
        const { status } = await checkRegistrationEmail(trimmed)
        setEmailCheckStatus(status)
        return status
      } catch {
        setEmailCheckStatus('idle')
        return 'idle'
      }
    },
    [checkRegistrationEmail],
  )

  const resetEmailCheck = useCallback(() => {
    setEmailCheckStatus('idle')
  }, [])

  return {
    emailCheckStatus,
    checkEmail,
    resetEmailCheck,
    linkMode: emailCheckStatus === 'existing_can_link',
    alreadyLinked: emailCheckStatus === 'already_linked',
    emailTakenNoLink: emailCheckStatus === 'existing_no_link',
  }
}
