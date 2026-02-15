import { createContext, useContext, useEffect, useMemo, useRef } from "react"
import useUser from "./useUser"
import { logout as apiLogout } from "../../services/apiAuth"
import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { applyReferralIfPresent } from "../../services/apiAffiliate"

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const { data: user, isLoading } = useUser()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const referralRetryRef = useRef({ tries: 0, timer: null })

  useEffect(() => {
    if (!user || isLoading) return
    if (user.role !== "doctor") return
    const storageKey = "tabibi_referral_code"
    const hasReferral = !!localStorage.getItem(storageKey)
    if (!hasReferral) return

    const run = async () => {
      const result = await applyReferralIfPresent({ user })
      if (result?.applied) {
        referralRetryRef.current.tries = 0
        if (referralRetryRef.current.timer) clearTimeout(referralRetryRef.current.timer)
        referralRetryRef.current.timer = null
        return
      }

      const maxTries = 8
      if (referralRetryRef.current.tries >= maxTries) return

      referralRetryRef.current.tries += 1
      referralRetryRef.current.timer = setTimeout(run, 2500)
    }

    run()

    return () => {
      if (referralRetryRef.current.timer) clearTimeout(referralRetryRef.current.timer)
      referralRetryRef.current.timer = null
    }
  }, [user, isLoading])
  
  // Logout function
  const logout = async () => {
    try {
      await apiLogout()
      // Clear all queries to reset app state
      queryClient.clear()
      // Redirect to landing page
      navigate("/")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    isLoading,
    logout
  }), [user, isLoading])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
