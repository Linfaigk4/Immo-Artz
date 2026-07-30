import { useState, useEffect, useRef } from 'react'
import { api } from '@/services/api'

interface GoogleSignInButtonProps {
  onSuccess: (data: { token: string; user: any }) => void
  onError?: (error: string) => void
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
}

// Charger le script Google Identity Services
const loadGoogleScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.getElementById('google-identity-script')) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.id = 'google-identity-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google script'))
    document.body.appendChild(script)
  })
}

export function GoogleSignInButton({
  onSuccess,
  onError,
  text = 'signin_with',
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!clientId) {
      console.error('VITE_GOOGLE_CLIENT_ID not configured')
      setIsLoading(false)
      return
    }

    const initializeGoogle = async () => {
      try {
        await loadGoogleScript()

        if (window.google?.accounts?.id && buttonRef.current) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          })

          window.google.accounts.id.renderButton(buttonRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text,
            shape: 'rectangular',
            logo_alignment: 'left',
            width: buttonRef.current.offsetWidth,
          })

          setIsLoading(false)
        }
      } catch (err) {
        console.error('Google Sign-In initialization error:', err)
        onError?.('Erreur lors de l\'initialisation de Google Sign-In')
        setIsLoading(false)
      }
    }

    initializeGoogle()
  }, [clientId, text])

  const handleCredentialResponse = async (response: any) => {
    try {
      setIsLoading(true)

      // Envoyer le token Google au backend
      const result = await api.post('/auth/google/token', {
        access_token: response.credential,
      })

      if (result.data.success) {
        onSuccess({
          token: result.data.data.access_token,
          user: result.data.data.user,
        })
      } else {
        onError?.(result.data.message || 'Erreur de connexion')
      }
    } catch (err: any) {
      console.error('Google auth error:', err)
      onError?.(err.response?.data?.message || 'Erreur lors de la connexion avec Google')
    } finally {
      setIsLoading(false)
    }
  }

  if (!clientId) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
        Configuration Google OAuth manquante. Veuillez configurer VITE_GOOGLE_CLIENT_ID.
      </div>
    )
  }

  return (
    <div className="w-full">
      {isLoading && (
        <div className="flex items-center justify-center py-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
        </div>
      )}
      <div
        ref={buttonRef}
        className={`w-full ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
      />
    </div>
  )
}

// Bouton Google personnalisé (fallback si le bouton officiel ne fonctionne pas)
interface CustomGoogleButtonProps {
  onClick: () => void
  text?: string
  isLoading?: boolean
}

export function CustomGoogleButton({
  onClick,
  text = 'Continuer avec Google',
  isLoading = false,
}: CustomGoogleButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700"></div>
      ) : (
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      )}
      <span>{isLoading ? 'Connexion...' : text}</span>
    </button>
  )
}

// Hook pour gérer l'authentification Google
export function useGoogleAuth() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loginWithGoogle = async (credential: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await api.post('/auth/google/token', {
        access_token: credential,
      })

      if (response.data.success) {
        return {
          success: true,
          token: response.data.data.access_token,
          user: response.data.data.user,
        }
      } else {
        setError(response.data.message || 'Erreur de connexion')
        return { success: false, error: response.data.message }
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Erreur lors de la connexion'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }

  const linkGoogleAccount = async (credential: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await api.post('/auth/google/link', {
        access_token: credential,
      })

      if (response.data.success) {
        return { success: true, user: response.data.data.user }
      } else {
        setError(response.data.message)
        return { success: false, error: response.data.message }
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Erreur lors de la liaison'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    loginWithGoogle,
    linkGoogleAccount,
    isLoading,
    error,
    clearError: () => setError(null),
  }
}
