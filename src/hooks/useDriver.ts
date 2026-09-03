import { useQuery, useMutation, useQueryClient } from 'react-query'
import { driverApi, VehicleInfo } from '@/api/driver'

// Stats
export const useDriverStats = () => {
  return useQuery('driverStats', driverApi.getStats, {
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  })
}

// Jobs
export const useDriverJobs = (params?: {
  status?: string
  page?: number
  limit?: number
}) => {
  return useQuery(
    ['driverJobs', params],
    () => driverApi.getJobs(params),
    {
      staleTime: 10 * 1000,
    }
  )
}

export const useDriverJob = (id: string) => {
  return useQuery(
    ['driverJob', id],
    () => driverApi.getJob(id),
    {
      enabled: !!id,
    }
  )
}

export const useUpdateJobStatus = () => {
  const queryClient = useQueryClient()
  return useMutation(
    ({ id, status }: { id: string; status: string }) => driverApi.updateJobStatus(id, status),
    {
      onSuccess: (data, variables) => {
        queryClient.setQueryData(['driverJob', variables.id], data.booking)
        queryClient.invalidateQueries(['driverJob', variables.id])
        queryClient.invalidateQueries('driverJobs')
        queryClient.invalidateQueries('driverStats')
      },
    }
  )
}

export const useAddCompletionDetails = () => {
  const queryClient = useQueryClient()
  return useMutation(
    ({ id, data }: { id: string; data: { pictures?: string[]; notes?: string } }) =>
      driverApi.addCompletionDetails(id, data),
    {
      onSuccess: (data, variables) => {
        queryClient.setQueryData(['driverJob', variables.id], data.booking)
        queryClient.invalidateQueries(['driverJob', variables.id])
        queryClient.invalidateQueries('driverJobs')
        queryClient.invalidateQueries('driverStats')
      },
    }
  )
}

export const useDisputeJob = () => {
  const queryClient = useQueryClient()
  return useMutation(
    ({ id, reason }: { id: string; reason: string }) => driverApi.disputeJob(id, reason),
    {
      onSuccess: (data, variables) => {
        queryClient.setQueryData(['driverJob', variables.id], data.booking)
        queryClient.invalidateQueries(['driverJob', variables.id])
        queryClient.invalidateQueries('driverJobs')
        queryClient.invalidateQueries('driverStats')
      },
    }
  )
}

export const useAcceptJobOffer = () => {
  const queryClient = useQueryClient()
  return useMutation((id: string) => driverApi.acceptJobOffer(id), {
    onSuccess: (_, id) => {
      queryClient.invalidateQueries('availableJobs')
      queryClient.invalidateQueries('availableJobsDashboard')
      queryClient.invalidateQueries('availableJobsInJobSheet')
      queryClient.invalidateQueries('driverJobs')
      queryClient.invalidateQueries('driverStats')
      queryClient.invalidateQueries(['driverJob', id])
    },
  })
}

export const useRejectJobOffer = () => {
  const queryClient = useQueryClient()
  return useMutation((id: string) => driverApi.rejectJobOffer(id), {
    onSuccess: (_, id) => {
      queryClient.invalidateQueries('availableJobs')
      queryClient.invalidateQueries('availableJobsDashboard')
      queryClient.invalidateQueries('availableJobsInJobSheet')
      queryClient.invalidateQueries(['driverJob', id])
    },
  })
}

// Vehicle (legacy - single vehicle)
export const useDriverVehicle = () => {
  return useQuery('driverVehicle', driverApi.getVehicle, {
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useUpdateVehicle = () => {
  const queryClient = useQueryClient()
  return useMutation(
    (data: VehicleInfo) => driverApi.updateVehicle(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('driverVehicle')
      },
    }
  )
}

// Vehicles (multiple vehicles)
export const useDriverVehicles = () => {
  return useQuery('driverVehicles', driverApi.getVehicles, {
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useDriverVehicleById = (id: string, options?: { enabled?: boolean }) => {
  return useQuery(
    ['driverVehicle', id],
    () => driverApi.getVehicleById(id),
    {
      enabled: options?.enabled !== false && !!id,
      staleTime: 5 * 60 * 1000,
    }
  )
}

export const useCreateVehicle = () => {
  const queryClient = useQueryClient()
  return useMutation(
    (data: VehicleInfo) => driverApi.createVehicle(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('driverVehicles')
      },
    }
  )
}

export const useUpdateVehicleById = () => {
  const queryClient = useQueryClient()
  return useMutation(
    ({ id, data }: { id: string; data: Partial<VehicleInfo> }) =>
      driverApi.updateVehicleById(id, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries('driverVehicles')
        queryClient.invalidateQueries(['driverVehicle', variables.id])
      },
    }
  )
}

export const useDeleteVehicle = () => {
  const queryClient = useQueryClient()
  return useMutation(
    (id: string) => driverApi.deleteVehicle(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('driverVehicles')
      },
    }
  )
}

