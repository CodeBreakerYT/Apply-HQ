'use client'

import { motion } from 'framer-motion'
import {
  Brain,
  FileText,
  MessageCircle,
  Lightbulb,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { useGamification } from '@/lib/gamification-context'

const features = [
  {
    icon: Brain,
    title: 'Resume Analyzer',
    description: 'AI-powered analysis of your resume. Get actionable feedback to improve your chances.',
    stats: '94% accuracy',
    color: 'from-primary to-purple-600',
    onClick: 'analyzer',
  },
  {
    icon: FileText,
    title: 'Job Parser',
    description: 'Automatically extract key requirements and responsibilities from job postings.',
    stats: '500+ sources',
    color: 'from-secondary to-cyan-500',
    onClick: 'parser',
  },
  {
    icon: MessageCircle,
    title: 'Message Generator',
    description: 'Generate personalized cover letters and follow-up messages instantly.',
    stats: 'Customizable',
    color: 'from-accent to-blue-500',
    onClick: 'generator',
  },
  {
    icon: Lightbulb,
    title: 'Interview Prep',
    description: 'Practice common interview questions with AI-powered feedback.',
    stats: '1000+ Q&A',
    color: 'from-purple-500 to-pink-500',
    onClick: 'interview',
  },
]

export function AIFeaturesSection() {
  const { addXP, unlockAchievement } = useGamification()

  const handleFeatureClick = (featureName: string) => {
    addXP(100)
    if (featureName === 'analyzer') {
      unlockAchievement('ai-resume')
    }
  }

  return (
    <motion.section
      className="relative z-5 max-w-7xl mx-auto px-6 py-20 space-y-12"
      variants={staggerContainer}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true }}
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-primary">AI-Powered Features</span>
        </div>
        <h2 className="text-4xl lg:text-5xl font-bold text-foreground">
          Let AI Do The Heavy Lifting
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Our advanced AI engine analyzes your resume, crafts perfect messages, and prepares you for interviews.
        </p>
      </motion.div>

      {/* Feature Grid */}
      <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature, i) => {
          const Icon = feature.icon
          return (
            <motion.div
              key={i}
              variants={staggerItem}
              className="group relative"
              whileHover={{ scale: 1.02 }}
            >
              {/* Card with gradient border effect */}
              <div
                className={`relative p-8 rounded-lg bg-gradient-to-br ${feature.color} opacity-5 border border-white/10 cursor-pointer transition-all h-full hover:opacity-10`}
              />

              <div className="absolute inset-0 p-8 space-y-4">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${feature.color} w-fit`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                    {feature.stats}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>

                <motion.button
                  className="mt-4 inline-flex items-center gap-2 text-primary hover:text-secondary transition-colors"
                  whileHover={{ x: 5 }}
                  onClick={() => handleFeatureClick(feature.onClick)}
                >
                  <span className="text-sm font-semibold">Try Now</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Feature Comparison */}
      <motion.div
        variants={staggerItem}
        className="p-8 rounded-lg bg-card/40 border border-primary/20 backdrop-blur-md"
      >
        <h3 className="text-2xl font-bold text-foreground mb-6">Why ApplyHQ?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: '5x Faster',
              description: 'Automate repetitive tasks and focus on landing interviews.',
            },
            {
              title: 'AI-Optimized',
              description: 'Machine learning trained on 10,000+ successful applications.',
            },
            {
              title: 'Real-Time Sync',
              description: 'Track applications across platforms with smart sync.',
            },
          ].map((item, i) => (
            <motion.div key={i} whileHover={{ scale: 1.05 }}>
              <h4 className="text-lg font-semibold text-primary mb-2">{item.title}</h4>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.section>
  )
}
