import { useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api'
import type { Property, PropertyFilters, ApiResponse } from '@/types'

export function useProperties(initialFilters?: PropertyFilters) {
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    perPage: 12,
    total: 0,
  })
  const [filters, setFilters] = useState<PropertyFilters>(initialFilters || {})

  const fetchProperties = useCallback(async (page: number = 1, newFilters?: PropertyFilters) => {
    setIsLoading(true)
    setError(null)

    const currentFilters = newFilters || filters
    
    try {
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('per_page', pagination.perPage.toString())
      
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(`${key}[]`, v))
          } else {
            params.append(key, value.toString())
          }
        }
      })

      const response = await api.get<ApiResponse<{ properties: Property[]; pagination: typeof pagination }>>(
        `/properties?${params.toString()}`
      )

      if (response.data.success) {
        setProperties(response.data.data?.properties || [])
        setPagination(response.data.data?.pagination || pagination)
      } else {
        setError(response.data.message || 'Erreur lors du chargement')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur de connexion')
    } finally {
      setIsLoading(false)
    }
  }, [filters, pagination.perPage])

  const updateFilters = useCallback((newFilters: Partial<PropertyFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({})
  }, [])

  useEffect(() => {
    fetchProperties(1)
  }, [filters])

  return {
    properties,
    isLoading,
    error,
    pagination,
    filters,
    fetchProperties,
    updateFilters,
    resetFilters,
    setPage: (page: number) => fetchProperties(page),
  }
}

export function useProperty(id: number | string | undefined) {
  const [property, setProperty] = useState<Property | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    const fetchProperty = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await api.get<ApiResponse<{ property: Property }>>(`/properties/${id}`)
        
        if (response.data.success) {
          setProperty(response.data.data?.property || null)
        } else {
          setError(response.data.message || 'Propriété non trouvée')
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Erreur de connexion')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProperty()
  }, [id])

  return { property, isLoading, error }
}

export function useFeaturedProperties(limit: number = 6) {
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchFeatured = async () => {
      setIsLoading(true)
      try {
        const response = await api.get<ApiResponse<{ properties: Property[] }>>(
          `/properties/featured?limit=${limit}`
        )
        if (response.data.success) {
          setProperties(response.data.data?.properties || [])
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchFeatured()
  }, [limit])

  return { properties, isLoading }
}
