import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { searchUsers, updateUserAdmin } from "../../services/apiAdmin"

const ROLES = ["all", "doctor", "secretary", "affiliate", "super_admin"]

export default function AdminUsers() {
  const [query, setQuery] = useState("")
  const [role, setRole] = useState("all")
  const [page, setPage] = useState(0)
  const qc = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users", query, role, page],
    queryFn: () => searchUsers({ query, role, page }),
  })

  const mutation = useMutation({
    mutationFn: updateUserAdmin,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
        <p className="text-sm text-muted-foreground">بحث وتعديل الدور وصلاحية الأدمن</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(0) }}
          placeholder="بحث بالإيميل أو الاسم أو الهاتف..."
          className="flex-1 min-w-52 rounded-lg border border-border bg-card px-3 py-2 text-sm"
        />
        <select value={role} onChange={(e) => { setRole(e.target.value); setPage(0) }} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
          {ROLES.map((r) => <option key={r} value={r}>{r === "all" ? "كل الأدوار" : r}</option>)}
        </select>
      </div>

      {isLoading && <p className="text-muted-foreground">جاري التحميل...</p>}
      {error && <p className="text-destructive">خطأ: {error.message}</p>}

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-right text-muted-foreground">
              <th className="p-3">الاسم</th>
              <th className="p-3">الإيميل</th>
              <th className="p-3">الدور</th>
              <th className="p-3">أدمن؟</th>
              <th className="p-3">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {(data?.rows || []).map((u) => (
              <tr key={u.user_id} className="border-b border-border last:border-0">
                <td className="p-3 font-medium">{u.name || "—"}</td>
                <td className="p-3 text-muted-foreground" dir="ltr">{u.email}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3">{u.is_admin ? "نعم" : "لا"}</td>
                <td className="p-3">
                  <button
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ userId: u.user_id, is_admin: !u.is_admin, role: !u.is_admin ? "super_admin" : "doctor" })}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {u.is_admin ? "إلغاء الأدمن" : "ترقية لأدمن"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>الإجمالي: {data?.total || 0}</span>
        <div className="flex gap-2">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-50">السابق</button>
          <button onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-border px-3 py-1.5">التالي</button>
        </div>
      </div>
    </div>
  )
}
