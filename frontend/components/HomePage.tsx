'use client'

import { GamificationProvider } from '@/lib/gamification-context'
import { ParticleBackground } from '@/components/ParticleBackground'
import { Header } from '@/components/Header'
import { HeroSection } from '@/components/HeroSection'
import { AIFeaturesSection } from '@/components/AIFeaturesSection'
import { DashboardSection } from '@/components/DashboardSection'
import { TestimonialsSection } from '@/components/TestimonialsSection'
import { CTAFooterSection } from '@/components/CTAFooterSection'

export function HomePage() {
  return (
    <GamificationProvider>
      <ParticleBackground />
      <div className="relative z-10">
        <Header />
        <HeroSection />
        <AIFeaturesSection />
        <DashboardSection />
        <TestimonialsSection />
        <CTAFooterSection />
      </div>
    </GamificationProvider>
  )
}
