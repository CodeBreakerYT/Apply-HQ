'use client'

import { motion } from 'framer-motion'
import { Badge, Star, Zap, Flame } from 'lucide-react'
import { useGamification } from '@/lib/gamification-context'
import { fadeIn, slideInDown } from '@/lib/animations'

export function Header() {
  const { streak, achievements } = useGamification()
  const unlockedCount = achievements.filter((a) => a.unlocked).length

  return (
    <motion.header
      className="relative z-10 border-b border-primary/20 bg-background/80 backdrop-blur-md"
      {...slideInDown}
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          {/* Logo Section */}
          <motion.div className="flex items-center gap-3" whileHover={{ scale: 1.05 }}>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Zap className="w-6 h-6 text-background" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">ApplyHQ</h1>
              <p className="text-xs text-muted-foreground">Free Edition</p>
            </div>
          </motion.div>

          {/* Stats Section */}
          <div className="flex items-center gap-4 ml-auto">
            {/* Achievements */}
            <motion.div
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-primary/20 hover:border-primary/40 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Badge className="w-4 h-4 text-primary" />
              <div className="text-sm">
                <span className="font-semibold text-foreground">{unlockedCount}</span>
                <span className="text-xs text-muted-foreground ml-1">Unlocked</span>
              </div>
            </motion.div>

            {/* Streak */}
            <motion.div
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-secondary/20 hover:border-secondary/40 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Flame className="w-4 h-4 text-secondary" />
              <div className="text-sm">
                <span className="font-semibold text-foreground">{streak}</span>
                <span className="text-xs text-muted-foreground ml-1">Day Streak</span>
              </div>
            </motion.div>

            {/* Leaderboard */}
            <motion.div
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-accent/20 hover:border-accent/40 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Star className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-foreground">#42</span>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.header>
  )
}
