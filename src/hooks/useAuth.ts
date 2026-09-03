import { useQuery, useMutation, useQueryClient } from 'react-query'
import { authApi } from '@/api/auth'

export const useAuth = () => {
  const queryClient = useQueryClient()

  // Only fetch user if token exists
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  
  const { data: user, isLoading } = useQuery(
    'currentUser',
    () => authApi.getCurrentUser().catch(() => null),
    {
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      enabled: !!token, // Only run query if token exists
      onError: () => {
        // Clear token on error
        localStorage.removeItem('token')
        queryClient.setQueryData('currentUser', null)
      },
    }
  )

  const loginMutation = useMutation(authApi.login, {
    onSuccess: (data) => {
      localStorage.setItem('token', data.token)
      queryClient.setQueryData('currentUser', data.user)
    },
    onError: () => {
      localStorage.removeItem('token')
      queryClient.setQueryData('currentUser', null)
    },
  })

  const registerMutation = useMutation(authApi.register, {
    onSuccess: (data) => {
      localStorage.setItem('token', data.token)
      queryClient.setQueryData('currentUser', data.user)
    },
    onError: () => {
      localStorage.removeItem('token')
      queryClient.setQueryData('currentUser', null)
    },
  })

  const logoutMutation = useMutation(authApi.logout, {
    onSuccess: () => {
      localStorage.removeItem('token')
      queryClient.clear()
    },
  })

  const updateProfileMutation = useMutation(authApi.updateProfile, {
    onSuccess: (data) => {
      queryClient.setQueryData('currentUser', data.user)
    },
  })

  const changePasswordMutation = useMutation(authApi.changePassword)

  return {
    user,
    isLoading,
    login: (credentials: any, options?: any) => {
      loginMutation.mutate(credentials, options)
    },
    register: (data: any, options?: any) => {
      registerMutation.mutate(data, options)
    },
    logout: logoutMutation.mutate,
    updateProfile: updateProfileMutation.mutate,
    changePassword: changePasswordMutation.mutate,
    isLoggingIn: loginMutation.isLoading,
    isRegistering: registerMutation.isLoading,
    isUpdatingProfile: updateProfileMutation.isLoading,
    isChangingPassword: changePasswordMutation.isLoading,
  }
}

