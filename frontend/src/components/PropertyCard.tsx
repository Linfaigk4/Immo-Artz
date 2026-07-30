import { Link } from 'react-router-dom'
import { MapPin, Bed, Bath, Square, Heart } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { Property } from '@/types'

interface PropertyCardProps {
  property: Property
  isFavorite?: boolean
  onToggleFavorite?: (id: number) => void
  showAgent?: boolean
}

export function PropertyCard({ 
  property, 
  isFavorite, 
  onToggleFavorite,
  showAgent = true 
}: PropertyCardProps) {
  const standingColors = {
    standard: 'bg-gray-500',
    moyen: 'bg-blue-500',
    haut_de_gamme: 'bg-gold-500',
  }

  const standingLabels = {
    standard: 'Standard',
    moyen: 'Moyen',
    haut_de_gamme: 'Haut de gamme',
  }

  return (
    <Card isHoverable className="overflow-hidden group">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={property.main_image || '/placeholder-property.jpg'}
          alt={property.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <Badge 
            variant="secondary"
            className={`${standingColors[property.standing]} text-white border-0`}
          >
            {standingLabels[property.standing]}
          </Badge>
          {property.is_featured && (
            <Badge variant="primary">En vedette</Badge>
          )}
          {property.is_premium && (
            <Badge className="bg-gold-500 text-white border-0">Premium</Badge>
          )}
        </div>

        {/* Favorite Button */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.preventDefault()
              onToggleFavorite(property.id)
            }}
            className={`absolute top-3 right-3 p-2 rounded-full transition-colors ${
              isFavorite
                ? 'bg-red-500 text-white'
                : 'bg-white/90 text-gray-600 hover:bg-white hover:text-red-500'
            }`}
          >
            <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        )}

        {/* Price Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <p className="text-xl font-bold text-white">
            {property.formatted_price}
          </p>
          <p className="text-sm text-white/80">
            {property.transaction_type_label}
          </p>
        </div>
      </div>

      {/* Content */}
      <CardContent className="p-4">
        <Link to={`/properties/${property.id}`}>
          <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1 hover:text-immo-600 dark:hover:text-immo-400 transition-colors">
            {property.title}
          </h3>
        </Link>

        <div className="mt-2 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <span className="line-clamp-1">{property.quartier}, {property.city}</span>
        </div>

        {/* Features */}
        <div className="mt-3 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          {property.area && (
            <div className="flex items-center gap-1">
              <Square className="h-4 w-4" />
              <span>{property.area} m²</span>
            </div>
          )}
          {property.bedrooms !== undefined && property.bedrooms > 0 && (
            <div className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              <span>{property.bedrooms}</span>
            </div>
          )}
          {property.bathrooms !== undefined && property.bathrooms > 0 && (
            <div className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              <span>{property.bathrooms}</span>
            </div>
          )}
        </div>

        {/* Agent */}
        {showAgent && property.agent && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {property.agent.name}
                </p>
                {property.agent.agency && (
                  <p className="text-xs text-gray-500">{property.agent.agency}</p>
                )}
              </div>
              {property.agent.rating && (
                <div className="flex items-center gap-1">
                  <span className="text-yellow-400">★</span>
                  <span className="text-sm font-medium">{property.agent.rating}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
