import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User, Phone, Building2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'
import type { RegisterData } from '@/types'

export function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { register } = useAuth()
  
  const isAgent = (location.state as any)?.role === 'agent'
  
  const [formData, setFormData] = useState<RegisterData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
    role: isAgent ? 'agent' : 'visitor',
    agency_name: '',
    license_number: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setErrors({})
    setIsLoading(true)

    if (formData.password !== formData.password_confirmation) {
      setError('Les mots de passe ne correspondent pas')
      setIsLoading(false)
      return
    }

    const result = await register(formData)
    
    if (result.success) {
      navigate('/')
    } else {
      setError(result.message || 'Erreur d\'inscription')
      if (result.errors) {
        setErrors(result.errors)
      }
    }
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg">
        {/* Back Link */}
        <button
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {isAgent ? 'Devenir agent' : 'Inscription'}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {isAgent 
                ? 'Rejoignez notre réseau d\'agents professionnels' 
                : 'Créez votre compte pour accéder à toutes les fonctionnalités'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Prénom"
                required
                leftIcon={<User className="h-5 w-5" />}
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                error={errors.first_name?.[0]}
              />
              <Input
                label="Nom"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                error={errors.last_name?.[0]}
              />
            </div>

            <Input
              label="Email"
              type="email"
              required
              leftIcon={<Mail className="h-5 w-5" />}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="votre@email.com"
              error={errors.email?.[0]}
            />

            <Input
              label="Téléphone"
              type="tel"
              leftIcon={<Phone className="h-5 w-5" />}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+237 6XX XXX XXX"
              error={errors.phone?.[0]}
            />

            {isAgent && (
              <>
                <Input
                  label="Nom de l'agence"
                  required
                  leftIcon={<Building2 className="h-5 w-5" />}
                  value={formData.agency_name}
                  onChange={(e) => setFormData({ ...formData, agency_name: e.target.value })}
                  error={errors.agency_name?.[0]}
                />
                <Input
                  label="Numéro de licence"
                  required
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  error={errors.license_number?.[0]}
                />
              </>
            )}

            <div className="relative">
              <Input
                label="Mot de passe"
                type={showPassword ? 'text' : 'password'}
                required
                leftIcon={<Lock className="h-5 w-5" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                }
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                error={errors.password?.[0]}
              />
            </div>

            <Input
              label="Confirmer le mot de passe"
              type={showPassword ? 'text' : 'password'}
              required
              leftIcon={<Lock className="h-5 w-5" />}
              value={formData.password_confirmation}
              onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
            />

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                required
                className="mt-1 rounded border-gray-300 text-immo-600 focus:ring-immo-500"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                J'accepte les{' '}
                <Link to="/terms" className="text-immo-600 hover:text-immo-500">
                  conditions d'utilisation
                </Link>{' '}
                et la{' '}
                <Link to="/privacy" className="text-immo-600 hover:text-immo-500">
                  politique de confidentialité
                </Link>
              </span>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
            >
              {isAgent ? 'Soumettre ma candidature' : 'S\'inscrire'}
            </Button>
          </form>

          {/* Login Link */}
          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            Déjà un compte ?{' '}
            <Link
              to="/login"
              className="font-medium text-immo-600 hover:text-immo-500"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
