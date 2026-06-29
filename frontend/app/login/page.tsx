'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Zap, User, Lock, ArrowLeft } from 'lucide-react'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { ParticleBackground } from '@/components/ParticleBackground'
import { useState } from 'react'
import { signIn } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      await signIn(username, password)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <ParticleBackground />
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-20">
        <motion.div className="w-full max-w-md" variants={staggerContainer} initial="initial" animate="animate">
          <Link href="/">
            <motion.button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8" variants={staggerItem} whileHover={{ gap: '0.75rem' }}>
              <ArrowLeft className="w-4 h-4" /> Back to home
            </motion.button>
          </Link>

          <motion.div variants={staggerItem} className="space-y-2 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Zap className="w-6 h-6 text-background" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">ApplyHQ</h1>
            </div>
            <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="text-muted-foreground">
              New here?{' '}
              <Link href="/signup" className="text-primary hover:text-primary/80 font-semibold transition-colors">Create an account</Link>
            </p>
          </motion.div>

          <motion.form
            onSubmit={(e) => { e.preventDefault(); handleSubmit() }}
            className="relative rounded-lg overflow-hidden p-8 space-y-6"
            variants={staggerItem}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
            <div className="absolute inset-0 border border-primary/20" />

            <div className="relative space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <input type="text" placeholder="yourusername" value={username} onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted/30 border border-primary/20 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted/30 border border-primary/20 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all" />
                </div>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <motion.button type="submit" disabled={loading}
                className="w-full py-2 rounded-lg bg-gradient-to-r from-primary to-purple-600 text-background font-semibold hover:shadow-lg hover:shadow-primary/50 transition-all disabled:opacity-60"
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                {loading ? 'Signing in…' : 'Sign In'}
              </motion.button>
            </div>
          </motion.form>
        </motion.div>
      </div>
    </>
  )
}
