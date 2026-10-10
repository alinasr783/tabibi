/**
 * حساب سعر الباقة بعد خصم السوبر أدمن (plan_pricing.discount_*)
 * الخصم معرّف على السعر الشهري، والسعر السنوي = الشهري الفعّال × 10
 */

export function isPlanDiscountActive(plan) {
  if (!plan) return false
  const type = plan.discount_type || "none"
  const value = Number(plan.discount_value) || 0
  if (type === "none" || value <= 0) return false
  if (type === "percent" && value >= 100) return true
  if (plan.discount_ends_at && new Date(plan.discount_ends_at) <= new Date()) return false
  return true
}

/** السعر الشهري الفعّال بعد الخصم */
export function getEffectiveMonthlyPrice(plan) {
  const base = Number(plan?.price) || 0
  if (!isPlanDiscountActive(plan)) return base
  const type = plan.discount_type
  const value = Number(plan.discount_value) || 0
  if (type === "percent") return Math.max(0, base * (1 - value / 100))
  if (type === "fixed") return Math.max(0, base - value)
  return base
}

/**
 * عرض سعر موحد للباقة (شهري أو سنوي)
 * @param {object} plan - صف من plan_pricing
 * @param {'monthly'|'annual'} billingPeriod
 */
export function getPlanPriceView(plan, billingPeriod = "monthly") {
  const baseMonthly = Number(plan?.price) || 0
  const effectiveMonthly = getEffectiveMonthlyPrice(plan)
  const hasDiscount = effectiveMonthly < baseMonthly
  const factor = billingPeriod === "annual" ? 10 : 1
  const base = baseMonthly * factor
  const final = effectiveMonthly * factor
  const saved = Math.max(0, base - final)
  const percentOff = base > 0 ? Math.round((saved / base) * 100) : 0
  return { base, final, saved, percentOff, hasDiscount }
}

export function describeDiscount(plan) {
  if (!isPlanDiscountActive(plan)) return null
  if (plan.discount_type === "percent") return `خصم ${Number(plan.discount_value)}%`
  return `خصم ${Number(plan.discount_value)} ج`
}
