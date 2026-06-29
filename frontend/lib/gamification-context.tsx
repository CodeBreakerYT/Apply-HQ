'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

interface Achievement {
  id: string
  name: string
  description: string
  unlocked: boolean
  unlockedAt?: Date
}

interface GamificationContextType {
  xp: number
  level: number
  streak: number
  achievements: Achievement[]
  addXP: (amount: number) => void
  unlockAchievement: (id: string) => void
  incrementStreak: () => void
  resetStreak: () => void
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined)

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 'first-app', name: 'First Application', description: 'Track your first job application', unlocked: false },
  { id: 'ten-apps', name: 'Application Master', description: 'Track 10 applications', unlocked: false },
  { id: 'first-interview', name: 'Interview Ready', description: 'Schedule your first interview', unlocked: false },
  { id: 'ai-resume', name: 'AI Boost', description: 'Use the AI resume analyzer', unlocked: false },
  { id: 'week-streak', name: 'Weekly Grind', description: 'Maintain a 7-day streak', unlocked: false },
  { id: 'level-10', name: 'Veteran Job Seeker', description: 'Reach level 10', unlocked: false },
]

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const [xp, setXp] = useState(0)
  const [level, setLevel] = useState(1)
  const [streak, setStreak] = useState(0)
  const [achievements, setAchievements] = useState<Achievement[]>(DEFAULT_ACHIEVEMENTS)

  const addXP = useCallback((amount: number) => {
    setXp((prev) => {
      const newXp = prev + amount
      const newLevel = Math.floor(newXp / 1000) + 1
      setLevel(newLevel)
      return newXp
    })
  }, [])

  const unlockAchievement = useCallback((id: string) => {
    setAchievements((prev) =>
      prev.map((ach) =>
        ach.id === id && !ach.unlocked
          ? { ...ach, unlocked: true, unlockedAt: new Date() }
          : ach
      )
    )
  }, [])

  const incrementStreak = useCallback(() => {
    setStreak((prev) => prev + 1)
  }, [])

  const resetStreak = useCallback(() => {
    setStreak(0)
  }, [])

  return (
    <GamificationContext.Provider
      value={{
        xp,
        level,
        streak,
        achievements,
        addXP,
        unlockAchievement,
        incrementStreak,
        resetStreak,
      }}
    >
      {children}
    </GamificationContext.Provider>
  )
}

export function useGamification() {
  const context = useContext(GamificationContext)
  if (!context) {
    throw new Error('useGamification must be used within GamificationProvider')
  }
  return context
}
