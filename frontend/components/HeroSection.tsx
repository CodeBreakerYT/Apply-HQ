'use client'

import { motion, useMotionValue, useTransform } from 'framer-motion'
import Link from 'next/link'
import { useMousePosition } from '@/hooks/useMousePosition'
import { slideInUp, staggerContainer, staggerItem } from '@/lib/animations'

const orbitingCards = [
  { label: 'Resume AI', icon: '🤖', color: 'from-primary to-purple-600' },
  { label: 'Job Parser', icon: '📝', color: 'from-secondary to-cyan-500' },
  { label: 'Interview Prep', icon: '🎯', color: 'from-accent to-blue-500' },
  { label: 'Message Gen', icon: '✉️', color: 'from-purple-500 to-pink-500' },
]

export function HeroSection() {
  const { x, y } = useMousePosition()
  const rotateX = useTransform(() => ((y?.get() || 0) - 300) * 0.1)
  const rotateY = useTransform(() => ((x?.get() || 0) - 400) * -0.1)

  return (
    <motion.section
      className="relative min-h-screen flex items-center justify-center px-6 py-20 overflow-hidden z-5"
      {...slideInUp}
    >
      {/* Gradient orbs */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-secondary/20 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            className="text-center lg:text-left space-y-8"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <motion.div variants={staggerItem} className="space-y-4">
              <motion.div
                className="inline-block"
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <span className="px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-semibold">
                  ✨ AI-Powered Job Dashboard
                </span>
              </motion.div>

              <h1 className="text-5xl lg:text-6xl font-bold">
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Land Your Dream Job
                </span>
                <br />
                <span className="text-foreground">Faster Than Ever</span>
              </h1>

              <p className="text-lg text-muted-foreground max-w-lg">
                AI-powered application tracking, smart resume analysis, and intelligent interview preparation. Completely free, forever.
              </p>
            </motion.div>

            <motion.div
              variants={staggerItem}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Link href="/signup">
                <motion.button
                  className="px-8 py-3 rounded-lg bg-gradient-to-r from-primary to-purple-600 text-background font-semibold hover:shadow-lg hover:shadow-primary/50 transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Get Started Free
                </motion.button>
              </Link>
              <Link href="/login">
                <motion.button
                  className="px-8 py-3 rounded-lg border border-primary/30 text-foreground font-semibold hover:bg-primary/10 transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Sign In
                </motion.button>
              </Link>
            </motion.div>

            <motion.div variants={staggerItem} className="flex gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-secondary" />
                Forever free
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                No credit card
              </div>
            </motion.div>
          </motion.div>

          {/* Right - Orbiting Cards */}
          <motion.div
            className="relative w-full h-96 hidden lg:block"
            style={{
              rotateX: rotateX as any,
              rotateY: rotateY as any,
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Center circle */}
              <motion.div
                className="absolute w-24 h-24 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 backdrop-blur-md flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              >
                <div className="text-3xl">🎯</div>
              </motion.div>

              {/* Orbiting cards */}
              {orbitingCards.map((card, i) => (
                <motion.div
                  key={i}
                  className="absolute w-20 h-20"
                  animate={{
                    rotate: 360,
                    x: Math.cos((i * Math.PI * 2) / 4) * 120,
                    y: Math.sin((i * Math.PI * 2) / 4) * 120,
                  }}
                  transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: 'linear',
                    delay: i * 0.1,
                  }}
                >
                  <motion.div
                    className={`w-full h-full rounded-lg bg-gradient-to-br ${card.color} border border-white/10 backdrop-blur-md flex flex-col items-center justify-center cursor-pointer shadow-lg`}
                    whileHover={{ scale: 1.1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    <div className="text-2xl mb-1">{card.icon}</div>
                    <span className="text-[10px] font-semibold text-white text-center px-1">
                      {card.label}
                    </span>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  )
}
