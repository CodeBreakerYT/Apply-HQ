'use client'

import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { staggerContainer, staggerItem } from '@/lib/animations'

const plans = [
  {
    name: 'Starter',
    price: '$0',
    period: 'Forever free',
    description: 'Perfect for getting started',
    features: [
      { text: 'Up to 20 applications', included: true },
      { text: 'Basic resume analysis', included: true },
      { text: 'Email support', included: true },
      { text: 'Job parser', included: false },
      { text: 'AI message generator', included: false },
      { text: 'Interview prep', included: false },
    ],
    cta: 'Get Started',
    color: 'from-muted to-muted',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For serious job seekers',
    features: [
      { text: 'Unlimited applications', included: true },
      { text: 'Advanced resume analysis', included: true },
      { text: 'Priority email support', included: true },
      { text: 'Job parser with insights', included: true },
      { text: 'AI message generator', included: true },
      { text: 'Interview prep basics', included: true },
    ],
    cta: 'Start Free Trial',
    color: 'from-primary to-purple-600',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'Contact us',
    description: 'For teams and organizations',
    features: [
      { text: 'Everything in Pro', included: true },
      { text: '24/7 phone support', included: true },
      { text: 'Custom integrations', included: true },
      { text: 'Team collaboration', included: true },
      { text: 'Advanced analytics', included: true },
      { text: 'Dedicated account manager', included: true },
    ],
    cta: 'Schedule Call',
    color: 'from-secondary to-cyan-500',
    highlight: false,
  },
]

export function PricingSection() {
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
        <h2 className="text-4xl lg:text-5xl font-bold text-foreground">
          Simple, Transparent Pricing
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Choose the plan that fits your job search needs. Always cancel anytime.
        </p>
      </motion.div>

      {/* Pricing Cards */}
      <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan, i) => (
          <motion.div
            key={i}
            variants={staggerItem}
            className={`relative rounded-lg border transition-all ${
              plan.highlight
                ? 'border-primary/50 bg-gradient-to-br from-primary/10 to-purple-600/10 scale-105'
                : 'border-white/10 bg-card/40'
            } p-8 backdrop-blur-md hover:border-primary/40`}
            whileHover={{ scale: 1.02 }}
          >
            {plan.highlight && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold">
                Most Popular
              </div>
            )}

            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
              </div>

              <motion.button
                className={`w-full py-3 rounded-lg font-semibold transition-all ${
                  plan.highlight
                    ? 'bg-gradient-to-r from-primary to-purple-600 text-background hover:shadow-lg hover:shadow-primary/50'
                    : 'border border-primary/30 text-foreground hover:bg-primary/10'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {plan.cta}
              </motion.button>

              <div className="space-y-3 border-t border-white/10 pt-6">
                {plan.features.map((feature, j) => (
                  <motion.div
                    key={j}
                    className="flex items-center gap-3"
                    whileHover={{ x: 5 }}
                  >
                    {feature.included ? (
                      <Check className="w-5 h-5 text-secondary flex-shrink-0" />
                    ) : (
                      <X className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <span
                      className={`text-sm ${
                        feature.included ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {feature.text}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  )
}
