export function isSuperAdminUser(user) {
  if (!user) return false
  return user.is_admin === true || user.isSuperAdmin === true || user.role === "super_admin"
}
