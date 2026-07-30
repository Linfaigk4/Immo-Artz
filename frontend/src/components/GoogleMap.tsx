import { useEffect, useRef, useCallback, useState } from 'react'

// Types pour Google Maps
interface GoogleMapProps {
  apiKey: string
  latitude: number
  longitude: number
  zoom?: number
  height?: string
  markers?: Array<{
    lat: number
    lng: number
    title?: string
    price?: string
    image?: string
    id?: number
  }>
  onMarkerClick?: (id: number) => void
  mapId?: string
}

declare global {
  interface Window {
    google?: any
    initGoogleMap?: () => void
  }
}

export function GoogleMap({
  apiKey,
  latitude,
  longitude,
  zoom = 15,
  height = '400px',
  markers = [],
  onMarkerClick,
  mapId = 'DEMO_MAP_ID',
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  // Charger le script Google Maps
  useEffect(() => {
    if (window.google?.maps) {
      initMap()
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMap&libraries=marker`
    script.async = true
    script.defer = true

    window.initGoogleMap = initMap

    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
      delete window.initGoogleMap
    }
  }, [apiKey])

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return

    // Créer la carte
    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: latitude, lng: longitude },
      zoom,
      mapId,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      zoomControl: true,
    })

    // Ajouter les marqueurs avancés
    markers.forEach((markerData) => {
      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        map: mapInstance.current,
        position: { lat: markerData.lat, lng: markerData.lng },
        title: markerData.title,
      })

      // Créer le contenu du popup
      if (markerData.price || markerData.image) {
        const content = document.createElement('div')
        content.className = 'bg-white rounded-lg shadow-lg p-2 min-w-[150px]'
        content.innerHTML = `
          ${markerData.image ? `<img src="${markerData.image}" class="w-full h-20 object-cover rounded mb-2" />` : ''}
          ${markerData.title ? `<p class="font-semibold text-sm">${markerData.title}</p>` : ''}
          ${markerData.price ? `<p class="text-immo-600 font-bold">${markerData.price}</p>` : ''}
        `

        const infoWindow = new window.google.maps.InfoWindow({
          content,
        })

        marker.addListener('click', () => {
          infoWindow.open(mapInstance.current, marker)
          if (markerData.id && onMarkerClick) {
            onMarkerClick(markerData.id)
          }
        })
      }

      markersRef.current.push(marker)
    })
  }, [latitude, longitude, zoom, markers, mapId, onMarkerClick])

  return (
    <div
      ref={mapRef}
      style={{ height, width: '100%' }}
      className="rounded-lg"
    />
  )
}

// Composant pour afficher plusieurs biens sur une carte Google
interface PropertiesGoogleMapProps {
  apiKey: string
  properties: Array<{
    id: number
    title: string
    latitude?: number
    longitude?: number
    price: string
    main_image?: string
  }>
  height?: string
  center?: { lat: number; lng: number }
  onPropertyClick?: (id: number) => void
}

export function PropertiesGoogleMap({
  apiKey,
  properties,
  height = '400px',
  center,
  onPropertyClick,
}: PropertiesGoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)

  // Filtrer les propriétés avec coordonnées
  const validProperties = properties.filter((p) => p.latitude && p.longitude)

  // Calculer le centre si non fourni
  const mapCenter = center ||
    (validProperties.length > 0
      ? {
          lat: validProperties.reduce((sum, p) => sum + (p.latitude || 0), 0) / validProperties.length,
          lng: validProperties.reduce((sum, p) => sum + (p.longitude || 0), 0) / validProperties.length,
        }
      : { lat: 3.848, lng: 11.502 }) // Yaoundé par défaut

  useEffect(() => {
    if (window.google?.maps) {
      initMap()
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMap&libraries=marker`
    script.async = true
    script.defer = true

    window.initGoogleMap = initMap
    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
      delete window.initGoogleMap
    }
  }, [apiKey])

  const initMap = () => {
    if (!mapRef.current || !window.google?.maps) return

    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center: mapCenter,
      zoom: 12,
      mapId: 'PROPERTIES_MAP',
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    })

    // Ajouter les marqueurs
    validProperties.forEach((property) => {
      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        map: mapInstance.current,
        position: { lat: property.latitude!, lng: property.longitude! },
        title: property.title,
      })

      // Popup avec info du bien
      const content = document.createElement('div')
      content.className = 'bg-white rounded-lg shadow-lg overflow-hidden min-w-[200px] cursor-pointer'
      content.innerHTML = `
        <div class="property-popup" data-id="${property.id}">
          ${property.main_image ? `<img src="${property.main_image}" class="w-full h-24 object-cover" />` : ''}
          <div class="p-3">
            <p class="font-semibold text-sm line-clamp-1">${property.title}</p>
            <p class="text-immo-600 font-bold mt-1">${property.price}</p>
          </div>
        </div>
      `

      content.addEventListener('click', (e) => {
        const target = (e.target as HTMLElement).closest('.property-popup')
        if (target && onPropertyClick) {
          onPropertyClick(property.id)
        }
      })

      const infoWindow = new window.google.maps.InfoWindow({ content })

      marker.addListener('click', () => {
        infoWindow.open(mapInstance.current, marker)
      })
    })
  }

  if (validProperties.length === 0) {
    return (
      <div
        style={{ height }}
        className="rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
      >
        <p className="text-gray-500">Aucune localisation disponible</p>
      </div>
    )
  }

  return <div ref={mapRef} style={{ height, width: '100%' }} className="rounded-lg" />
}

// Hook pour charger l'API Google Maps
export function useGoogleMaps(apiKey: string) {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (window.google?.maps) {
      setIsLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker`
    script.async = true
    script.defer = true
    script.onload = () => setIsLoaded(true)

    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [apiKey])

  return isLoaded
}
