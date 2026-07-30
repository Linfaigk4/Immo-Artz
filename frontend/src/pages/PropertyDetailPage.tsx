import { useParams, useNavigate } from 'react-router-dom'
import { 
  MapPin, 
  Bed, 
  Bath, 
  Square, 
  Car, 
  Share2, 
  Heart,
  Phone,
  Mail,
  ArrowLeft,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Map } from '@/components/Map'
import { useProperty } from '@/hooks/useProperties'
import { formatDate } from '@/utils/format'
import { useState } from 'react'

export function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { property, isLoading, error } = useProperty(id)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-immo-600" />
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Bien non trouvé
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {error || "Ce bien n'existe pas ou a été retiré."}
          </p>
          <Button
            className="mt-4"
            onClick={() => navigate('/properties')}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Retour aux biens
          </Button>
        </div>
      </div>
    )
  }

  const standingColors = {
    standard: 'bg-gray-500',
    moyen: 'bg-blue-500',
    haut_de_gamme: 'bg-gold-500',
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Back Button */}
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>
      </div>

      {/* Image Gallery */}
      <div className="relative h-[400px] md:h-[500px] bg-gray-200 dark:bg-gray-800">
        {property.images && property.images.length > 0 ? (
          <>
            <img
              src={property.images[currentImageIndex]}
              alt={property.title}
              className="w-full h-full object-cover"
            />
            {property.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {property.images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentImageIndex
                        ? 'bg-white'
                        : 'bg-white/50 hover:bg-white/75'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-gray-400">Pas d'image disponible</span>
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-4 left-4 flex gap-2">
          <Badge className={`${standingColors[property.standing]} text-white border-0`}>
            {property.standing_label}
          </Badge>
          <Badge variant="primary">{property.transaction_type_label}</Badge>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {property.title}
              </h1>
              <div className="mt-2 flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <MapPin className="h-5 w-5" />
                <span>{property.address}, {property.quartier}, {property.city}</span>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <span className="text-3xl font-bold text-immo-600">
                  {property.formatted_price}
                </span>
                {property.price_per_sqm && (
                  <span className="text-gray-500">
                    ({property.price_per_sqm.toLocaleString()} FCFA/m²)
                  </span>
                )}
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {property.area && (
                <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <Square className="h-6 w-6 text-immo-600" />
                  <div>
                    <p className="text-sm text-gray-500">Surface</p>
                    <p className="font-semibold">{property.area} m²</p>
                  </div>
                </div>
              )}
              {property.bedrooms !== undefined && property.bedrooms > 0 && (
                <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <Bed className="h-6 w-6 text-immo-600" />
                  <div>
                    <p className="text-sm text-gray-500">Chambres</p>
                    <p className="font-semibold">{property.bedrooms}</p>
                  </div>
                </div>
              )}
              {property.bathrooms !== undefined && property.bathrooms > 0 && (
                <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <Bath className="h-6 w-6 text-immo-600" />
                  <div>
                    <p className="text-sm text-gray-500">Salles de bain</p>
                    <p className="font-semibold">{property.bathrooms}</p>
                  </div>
                </div>
              )}
              {property.parking_spaces !== undefined && property.parking_spaces > 0 && (
                <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <Car className="h-6 w-6 text-immo-600" />
                  <div>
                    <p className="text-sm text-gray-500">Parking</p>
                    <p className="font-semibold">{property.parking_spaces}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Description
              </h2>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">
                {property.description}
              </p>
            </div>

            {/* Features */}
            {property.features && property.features.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Équipements
                </h2>
                <div className="flex flex-wrap gap-2">
                  {property.features.map((feature, index) => (
                    <Badge key={index} variant="outline">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Location */}
            {property.latitude && property.longitude && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Localisation
                </h2>
                <Map 
                  latitude={property.latitude} 
                  longitude={property.longitude}
                  height="300px"
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Agent Card */}
            {property.agent && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Contacter l'agent
                </h3>
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-16 w-16 rounded-full bg-immo-100 flex items-center justify-center">
                    <span className="text-xl font-bold text-immo-600">
                      {property.agent.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {property.agent.name}
                    </p>
                    {property.agent.agency && (
                      <p className="text-sm text-gray-500">{property.agent.agency}</p>
                    )}
                    {property.agent.rating && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-yellow-400">★</span>
                        <span className="text-sm">{property.agent.rating}</span>
                        <span className="text-sm text-gray-500">
                          ({property.agent.rating_count} avis)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3">
                  {property.agent.phone && (
                    <a
                      href={`tel:${property.agent.phone}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-immo-50 dark:bg-immo-900/20 text-immo-700 dark:text-immo-300 hover:bg-immo-100 transition-colors"
                    >
                      <Phone className="h-5 w-5" />
                      <span>{property.agent.phone}</span>
                    </a>
                  )}
                  {property.agent.email && (
                    <a
                      href={`mailto:${property.agent.email}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition-colors"
                    >
                      <Mail className="h-5 w-5" />
                      <span>{property.agent.email}</span>
                    </a>
                  )}
                </div>

                <Button
                  className="w-full mt-4"
                  disabled={!property.agent.email}
                  onClick={() => {
                    if (property.agent?.email) {
                      window.location.href = `mailto:${property.agent.email}`
                    }
                  }}
                >
                  Envoyer un message
                </Button>
              </div>
            )}

            {/* Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Informations
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <span className="font-medium">{property.type_label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Standing</span>
                  <span className="font-medium">{property.standing_label}</span>
                </div>
                {property.construction_year && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Année de construction</span>
                    <span className="font-medium">{property.construction_year}</span>
                  </div>
                )}
                {property.floor !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Étage</span>
                    <span className="font-medium">{property.floor}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Publié le</span>
                  <span className="font-medium">{formatDate(property.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Vues</span>
                  <span className="font-medium">{property.view_count}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                leftIcon={<Heart className="h-4 w-4" />}
              >
                Favori
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                leftIcon={<Share2 className="h-4 w-4" />}
              >
                Partager
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}