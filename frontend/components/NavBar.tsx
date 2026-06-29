'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Zap, LogOut, LayoutDashboard } from 'lucide-react'
import { getUsername, getRole, isLoggedIn, signOut, type Role } from '@/lib/auth'

export function NavBar() {
  const router = useRouter()
  const [user, setUser] = useState<string | null>(null)
  const [role, setRole] = useState<Role | null>(null)

  useEffect(() => {
    if (isLoggedIn()) {
      setUser(getUsername())
      setRole(getRole())
    }
  }, [])

  function handleSignOut() {
    signOut()
    setUser(null)
    router.push('/')
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center group-hover:scale-105 transition-transform">
            <Zap className="w-5 h-5 text-background" />
          </div>
          <div>
            <h1 className="font-bold leading-tight">ApplyHQ</h1>
            <p className="text-[11px] text-muted-foreground leading-tight">AI Job Application Command Centre</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                @{user}
                <span className="ml-2 text-[10px] uppercase px-1.5 py-0.5 rounded bg-primary/15 text-primary">{role}</span>
              </span>
              <Link href="/dashboard" className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md bg-primary text-background font-medium hover:opacity-90">
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Link>
              <button onClick={handleSignOut} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
              <Link href="/signup" className="text-sm px-3 py-1.5 rounded-md bg-primary text-background font-medium hover:opacity-90">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
