'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { NavBar } from '@/components/NavBar'
import { isLoggedIn, signOut, type Role } from '@/lib/auth'
import { getMe } from '@/lib/api'
import { ApplicantDashboard } from '@/components/ApplicantDashboard'
import { RecruiterDashboard } from '@/components/RecruiterDashboard'

export default function DashboardPage() {
  const router = useRouter()
  const [role, setRole] = useState<Role | null | undefined>(undefined)

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login')
      return
    }
    // Ask the backend for the authoritative role (avoids stale localStorage /
    // old tokens issued before roles existed).
    getMe()
      .then((me) => {
        localStorage.setItem('applyhq_role', me.role)
        setRole(me.role)
      })
      .catch(() => {
        // Token invalid or pre-roles — force a clean re-login.
        signOut()
        router.push('/login')
      })
  }, [router])

  if (role === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <Suspense>
        {role === 'admin' ? <RecruiterDashboard /> : <ApplicantDashboard />}
      </Suspense>
    </div>
  )
}
