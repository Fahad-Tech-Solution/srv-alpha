const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const getSocketUrl = (): string => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL
  }
  return API_BASE_URL.replace(/\/api\/?$/, '')
}
