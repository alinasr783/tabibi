import supabase from "./supabase"

function randomReferralCode(length = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  let out = ""
  for (let i = 0; i < length; i += 1) out += alphabet[bytes[i] % alphabet.length]
  return out
}

export async function ensureAffiliateProfile() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) throw new Error("لا يوجد مستخدم مسجل")

  try {
    const { data: rpcProfile, error: rpcError } = await supabase.rpc("ensure_affiliate_profile")
    if (!rpcError && rpcProfile?.referral_code) {
      return {
        user_id: rpcProfile.user_id,
        referral_code: rpcProfile.referral_code,
        created_at: rpcProfile.created_at,
      }
    }

    const { data: existing, error: selectError } = await supabase
      .from("affiliate_users")
      .select("user_id, referral_code, created_at")
      .eq("user_id", session.user.id)
      .maybeSingle()

    if (selectError && selectError.code !== "PGRST116") throw selectError
    if (existing?.referral_code) return existing

    const referralCode = randomReferralCode()
    const { data: created, error: insertError } = await supabase
      .from("affiliate_users")
      .insert({ user_id: session.user.id, referral_code: referralCode })
      .select("user_id, referral_code, created_at")
      .single()

    if (insertError) throw insertError
    return created
  } catch (e) {
    throw new Error("تعذر إنشاء بروفايل الشريك. تأكد من تشغيل سكربت الـ SQL الخاص بالـ Affiliate على Supabase.")
  }
}

export async function recordAffiliateLinkOpen(referralCode) {
  const code = (referralCode || "").trim()
  if (!code) return

  try {
    await supabase.from("affiliate_link_events").insert({
      referral_code: code,
      event_type: "open",
      path: window.location.pathname + window.location.search,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent || null,
    })
  } catch {
    // ignore
  }
}

function startOfMonthIso(date = new Date()) {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export async function getAffiliateDashboard() {
  let profile
  try {
    profile = await ensureAffiliateProfile()
  } catch {
    return {
      profile: null,
      referralLink: "",
      stats: {
        doctorsRegistered: 0,
        doctorsActive: 0,
        totalEarnings: 0,
        thisMonthEarnings: 0,
        expectedNextMonthEarnings: 0,
        pendingEarnings: 0,
        paidEarnings: 0,
      },
    }
  }

  const referralLink = `${window.location.origin}/signup?ref=${encodeURIComponent(profile.referral_code)}`

  try {
    const { data: statsRpc, error: statsRpcError } = await supabase.rpc("get_affiliate_dashboard_stats")
    if (!statsRpcError && statsRpc) {
      return {
        profile,
        referralLink,
        stats: {
          doctorsRegistered: statsRpc.doctors_registered ?? 0,
          doctorsActive: statsRpc.doctors_active ?? 0,
          totalEarnings: Number(statsRpc.total_earnings ?? 0),
          thisMonthEarnings: Number(statsRpc.this_month_earnings ?? 0),
          expectedNextMonthEarnings: Number(statsRpc.expected_next_month_earnings ?? 0),
          pendingEarnings: Number(statsRpc.pending_earnings ?? 0),
          paidEarnings: Number(statsRpc.paid_earnings ?? 0),
        },
      }
    }

    const { count: referralsCount = 0, error: referralsCountError } = await supabase
      .from("affiliate_referrals")
      .select("id", { count: "exact", head: true })
      .eq("affiliate_user_id", profile.user_id)

    if (referralsCountError) throw referralsCountError

    const { data: referrals, error: referralsError } = await supabase
      .from("affiliate_referrals")
      .select("clinic_id, created_at")
      .eq("affiliate_user_id", profile.user_id)
      .limit(500)

    if (referralsError) throw referralsError

    const clinicIds = (referrals || []).map((r) => r.clinic_id).filter(Boolean)

    let activeDoctors = 0
    if (clinicIds.length > 0) {
      const { count: activeCount = 0, error: activeError } = await supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .in("clinic_id", clinicIds)
        .eq("status", "active")

      if (activeError) throw activeError
      activeDoctors = activeCount
    }

    const monthStart = startOfMonthIso()

    const { data: commissionsAll, error: commissionsAllError } = await supabase
      .from("affiliate_commissions")
      .select("commission_amount, status")
      .eq("affiliate_user_id", profile.user_id)
      .limit(5000)

    if (commissionsAllError) throw commissionsAllError

    const totals = (commissionsAll || []).reduce(
      (acc, row) => {
        const amt = Number(row.commission_amount || 0)
        acc.total += amt
        if (row.status === "pending") acc.pending += amt
        if (row.status === "paid") acc.paid += amt
        return acc
      },
      { total: 0, pending: 0, paid: 0 }
    )

    const { data: commissionsThisMonth, error: thisMonthError } = await supabase
      .from("affiliate_commissions")
      .select("commission_amount")
      .eq("affiliate_user_id", profile.user_id)
      .gte("created_at", monthStart)
      .limit(5000)

    if (thisMonthError) throw thisMonthError

    const thisMonth = (commissionsThisMonth || []).reduce((sum, r) => sum + Number(r.commission_amount || 0), 0)

    const expectedNextMonth = activeDoctors > 0 ? Math.round((thisMonth / Math.max(1, activeDoctors)) * activeDoctors) : 0

    return {
      profile,
      referralLink,
      stats: {
        doctorsRegistered: referralsCount,
        doctorsActive: activeDoctors,
        totalEarnings: totals.total,
        thisMonthEarnings: thisMonth,
        expectedNextMonthEarnings: expectedNextMonth,
        pendingEarnings: totals.pending,
        paidEarnings: totals.paid,
      },
    }
  } catch (e) {
    return {
      profile,
      referralLink,
      stats: {
        doctorsRegistered: 0,
        doctorsActive: 0,
        totalEarnings: 0,
        thisMonthEarnings: 0,
        expectedNextMonthEarnings: 0,
        pendingEarnings: 0,
        paidEarnings: 0,
      },
    }
  }
}

export async function getAffiliateReferrals() {
  const profile = await ensureAffiliateProfile()

  try {
    const { data: referrals, error } = await supabase
      .from("affiliate_referrals")
      .select("id, clinic_id, created_at")
      .eq("affiliate_user_id", profile.user_id)
      .order("created_at", { ascending: false })
      .limit(200)

    if (error) throw error

    const clinicIds = (referrals || []).map((r) => r.clinic_id).filter(Boolean)

    let clinicsMap = new Map()
    if (clinicIds.length > 0) {
      const { data: clinics } = await supabase
        .from("clinics")
        .select("clinic_uuid, name, address")
        .in("clinic_uuid", clinicIds)
        .limit(200)

      clinicsMap = new Map((clinics || []).map((c) => [c.clinic_uuid, c]))
    }

    let activeMap = new Map()
    if (clinicIds.length > 0) {
      const { data: activeSubs } = await supabase
        .from("subscriptions")
        .select("clinic_id, amount, plan_id, billing_period, status, current_period_end")
        .in("clinic_id", clinicIds)
        .order("created_at", { ascending: false })
        .limit(1000)

      const latestActive = new Map()
      for (const s of activeSubs || []) {
        if (!latestActive.has(s.clinic_id) && s.status === "active") latestActive.set(s.clinic_id, s)
      }
      activeMap = latestActive
    }

    let plansMap = new Map()
    try {
      const planIds = Array.from(activeMap.values()).map((s) => s.plan_id).filter(Boolean)
      if (planIds.length > 0) {
        const { data: plans } = await supabase
          .from("plans")
          .select("id, name, price")
          .in("id", Array.from(new Set(planIds)))
          .limit(100)
        plansMap = new Map((plans || []).map((p) => [p.id, p]))
      }
    } catch {
      plansMap = new Map()
    }

    return (referrals || []).map((r) => {
      const clinic = clinicsMap.get(r.clinic_id)
      const active = activeMap.get(r.clinic_id)
      const plan = active?.plan_id ? plansMap.get(active.plan_id) : null
      return {
        id: r.id,
        clinicId: r.clinic_id,
        createdAt: r.created_at,
        clinicName: clinic?.name || "عيادة",
        clinicAddress: clinic?.address || "",
        isActive: !!active,
        subscriptionAmount: active?.amount ?? null,
        planId: active?.plan_id ?? null,
        planName: plan?.name ?? null,
        billingPeriod: active?.billing_period ?? null,
        currentPeriodEnd: active?.current_period_end ?? null,
      }
    })
  } catch {
    return []
  }
}

export async function getAffiliateFunnelStats() {
  let profile
  try {
    profile = await ensureAffiliateProfile()
  } catch {
    return {
      opens: 0,
      signups: 0,
      activeSubscriptions: 0,
      plans: [],
    }
  }
  const referralCode = profile?.referral_code

  const out = {
    opens: 0,
    signups: 0,
    activeSubscriptions: 0,
    plans: [],
  }

  try {
    const { count: opensCount = 0 } = await supabase
      .from("affiliate_link_events")
      .select("id", { count: "exact", head: true })
      .eq("referral_code", referralCode)
      .eq("event_type", "open")
    out.opens = opensCount
  } catch {}

  try {
    const { count: signupsCount = 0 } = await supabase
      .from("affiliate_link_events")
      .select("id", { count: "exact", head: true })
      .eq("referral_code", referralCode)
      .eq("event_type", "signup")
    out.signups = signupsCount
  } catch {
    out.signups = 0
  }

  let clinicIds = []
  try {
    const { data: referrals } = await supabase
      .from("affiliate_referrals")
      .select("clinic_id")
      .eq("affiliate_user_id", profile.user_id)
      .limit(5000)
    clinicIds = (referrals || []).map((r) => r.clinic_id).filter(Boolean)
  } catch {
    return out
  }

  if (clinicIds.length === 0) return out

  try {
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("clinic_id, plan_id, billing_period, status")
      .in("clinic_id", clinicIds)
      .eq("status", "active")
      .limit(5000)

    const planKeyCount = new Map()
    for (const s of subs || []) {
      const key = `${s.plan_id || "unknown"}__${s.billing_period || "monthly"}`
      planKeyCount.set(key, (planKeyCount.get(key) || 0) + 1)
    }
    out.activeSubscriptions = (subs || []).length
    out.plans = Array.from(planKeyCount.entries()).map(([key, count]) => {
      const [planId, period] = key.split("__")
      return { planId, billingPeriod: period, count }
    })
  } catch {}

  return out
}

export async function getAffiliateCommissions() {
  const profile = await ensureAffiliateProfile()

  try {
    const { data, error } = await supabase
      .from("affiliate_commissions")
      .select("id, clinic_id, subscription_id, base_amount, commission_rate, commission_amount, status, available_at, created_at, paid_at")
      .eq("affiliate_user_id", profile.user_id)
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) throw error

    return (data || []).map((c) => ({
      id: c.id,
      clinicId: c.clinic_id,
      subscriptionId: c.subscription_id,
      baseAmount: Number(c.base_amount ?? 0),
      commissionRate: Number(c.commission_rate ?? 0),
      commissionAmount: Number(c.commission_amount ?? 0),
      status: c.status,
      availableAt: c.available_at,
      createdAt: c.created_at,
      paidAt: c.paid_at,
    }))
  } catch {
    return []
  }
}

export async function getAffiliatePayoutMethods() {
  const profile = await ensureAffiliateProfile()
  const { data, error } = await supabase
    .from("affiliate_payout_methods")
    .select("id, affiliate_user_id, payout_method, bank_name, account_name, iban, wallet_phone, notes, is_default, updated_at, created_at")
    .eq("affiliate_user_id", profile.user_id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50)
  if (error) throw error
  return (data || []).map((m) => ({
    id: m.id,
    affiliate_user_id: m.affiliate_user_id,
    payout_method: m.payout_method,
    bank_name: m.bank_name,
    account_name: m.account_name,
    iban: m.iban,
    wallet_phone: m.wallet_phone,
    notes: m.notes,
    is_default: !!m.is_default,
    updated_at: m.updated_at,
    created_at: m.created_at,
  }))
}

export async function upsertAffiliatePayoutMethod(values) {
  const payload = {
    payout_method_id: values?.id || null,
    payout_method: values?.payout_method || "bank",
    bank_name: values?.bank_name || null,
    account_name: values?.account_name || null,
    iban: values?.iban || null,
    wallet_phone: values?.wallet_phone || null,
    notes: values?.notes || null,
    make_default: values?.make_default !== false,
  }
  const { data, error } = await supabase.rpc("upsert_affiliate_payout_method", payload)
  if (error) throw error
  return data
}

export async function setDefaultAffiliatePayoutMethod(payoutMethodId) {
  const { data, error } = await supabase.rpc("set_default_affiliate_payout_method", {
    payout_method_id: payoutMethodId,
  })
  if (error) throw error
  return data
}

export async function deleteAffiliatePayoutMethod(payoutMethodId) {
  const { data, error } = await supabase.rpc("delete_affiliate_payout_method", {
    payout_method_id: payoutMethodId,
  })
  if (error) throw error
  return data
}

export async function getAffiliatePaymentSettings() {
  try {
    const list = await getAffiliatePayoutMethods()
    return list.find((m) => m.is_default) || list[0] || null
  } catch {
    return null
  }
}

export async function saveAffiliatePaymentSettings(values) {
  return upsertAffiliatePayoutMethod({ ...values, make_default: true })
}

export async function getAffiliateWithdrawableBalance() {
  const { data, error } = await supabase.rpc("get_affiliate_withdrawable_balance")
  if (error) throw error
  return Number(data || 0)
}

export async function requestAffiliateWithdrawal() {
  const { data, error } = await supabase.rpc("request_affiliate_withdrawal")
  if (error) throw error
  return data
}

export async function getAffiliateWithdrawalRequests() {
  const profile = await ensureAffiliateProfile()
  const { data, error } = await supabase
    .from("affiliate_withdrawal_requests")
    .select("id, amount, status, admin_note, created_at, updated_at")
    .eq("affiliate_user_id", profile.user_id)
    .order("created_at", { ascending: false })
    .limit(50)
  if (error) throw error
  return data || []
}

export async function applyReferralIfPresent({ user }) {
  if (!user?.clinic_id || user?.role !== "doctor") return { applied: false }

  const storageKey = "tabibi_referral_code"
  const referralCode = localStorage.getItem(storageKey)
  if (!referralCode) return { applied: false }

  try {
    const { error: rpcError } = await supabase.rpc("apply_affiliate_referral", {
      referral_code: referralCode,
      clinic_id: user.clinic_id,
    })

    if (rpcError) throw rpcError
    localStorage.removeItem(storageKey)
    return { applied: true }
  } catch (e) {
    try {
      const { data: affiliate, error: affiliateError } = await supabase
        .from("affiliate_users")
        .select("user_id, referral_code")
        .eq("referral_code", referralCode)
        .maybeSingle()

      if (affiliateError) throw affiliateError
      if (!affiliate?.user_id) {
        return { applied: false }
      }
      if (affiliate.user_id === user.user_id) {
        localStorage.removeItem(storageKey)
        return { applied: false }
      }

      const { error: insertError } = await supabase.from("affiliate_referrals").insert({
        affiliate_user_id: affiliate.user_id,
        clinic_id: user.clinic_id,
      })

      if (insertError) throw insertError
      localStorage.removeItem(storageKey)
      return { applied: true }
    } catch {
      return { applied: false }
    }
  }
}
