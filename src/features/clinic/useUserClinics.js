import { useQuery } from "@tanstack/react-query"
import { getUserClinics } from "../../services/apiClinic"
import { useAuth } from "../auth/AuthContext"

export default function useUserClinics() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ["user-clinics", user?.id],
    queryFn: getUserClinics,
    enabled: !!user,
    staleTime: 60 * 1000,
  })
}

