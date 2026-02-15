import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import supabase from "@/services/supabase"

export default function useAffiliateRealtime() {
  const queryClient = useQueryClient()

  useEffect(() => {
    let channel
    let cancelled = false

    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (cancelled || !uid) return

      channel = supabase
        .channel(`affiliate-realtime-${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "affiliate_referrals", filter: `affiliate_user_id=eq.${uid}` },
          () => {
            queryClient.invalidateQueries({ queryKey: ["affiliate-dashboard"] })
            queryClient.invalidateQueries({ queryKey: ["affiliate-referrals"] })
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "affiliate_commissions", filter: `affiliate_user_id=eq.${uid}` },
          () => {
            queryClient.invalidateQueries({ queryKey: ["affiliate-dashboard"] })
            queryClient.invalidateQueries({ queryKey: ["affiliate-commissions"] })
          }
        )
        .subscribe()
    })()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [queryClient])
}
