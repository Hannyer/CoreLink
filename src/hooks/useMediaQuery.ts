import { useState, useEffect } from 'react';

/**
 * Hook para detectar breakpoints de forma reactiva
 * @param query - Media query string (ej: '(max-width: 768px)')
 * @returns boolean - true si la query coincide
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    
    // Actualizar estado inicial
    setMatches(mediaQuery.matches);

    // Handler para cambios
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Escuchar cambios (moderno)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      // Fallback para navegadores antiguos
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, [query]);

  return matches;
}

/**
 * Breakpoints predefinidos
 */
export const breakpoints = {
  xs: '(max-width: 575.98px)',
  sm: '(min-width: 576px) and (max-width: 767.98px)',
  md: '(min-width: 768px) and (max-width: 991.98px)',
  lg: '(min-width: 992px) and (max-width: 1199.98px)',
  xl: '(min-width: 1200px)',
  mobile: '(max-width: 767.98px)',
  tablet: '(min-width: 768px) and (max-width: 991.98px)',
  desktop: '(min-width: 992px)',
};

