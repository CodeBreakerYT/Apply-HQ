'use client'

import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { staggerContainer, staggerItem } from '@/lib/animations'

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Senior Product Manager',
    company: 'Tech Company',
    quote:
      'ApplyHQ helped me land 3 offers in 2 months. The resume analyzer alone saved me hours of revisions.',
    rating: 5,
    avatar: '👩‍💼',
  },
  {
    name: 'Marcus Johnson',
    role: 'Software Engineer',
    company: 'Startup',
    quote:
      'The AI message generator made my cover letters 10x better. I went from 5% to 30% interview rate!',
    rating: 5,
    avatar: '👨‍💻',
  },
  {
    name: 'Alex Rivera',
    role: 'UX Designer',
    company: 'Design Studio',
    quote:
      'Tracking 50+ applications manually was a nightmare. Now I can focus on interview prep instead.',
    rating: 5,
    avatar: '👨‍🎨',
  },
  {
    name: 'Emma Taylor',
    role: 'Data Analyst',
    company: 'Finance',
    quote:
      'The interview prep section gave me confidence before my final rounds. Highly recommend!',
    rating: 5,
    avatar: '👩‍🔬',
  },
]

export function TestimonialsSection() {
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
          Loved by Job Seekers
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Join thousands of people who have landed their dream jobs using ApplyHQ.
        </p>
      </motion.div>

      {/* Testimonials Grid */}
      <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {testimonials.map((testimonial, i) => (
          <motion.div
            key={i}
            variants={staggerItem}
            className="relative group p-8 rounded-lg bg-card/40 border border-white/10 backdrop-blur-md hover:border-primary/40 transition-all"
            whileHover={{ scale: 1.02 }}
          >
            {/* Glow effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />

            <div className="relative z-10 space-y-4">
              {/* Rating */}
              <div className="flex gap-1">
                {Array.from({ length: testimonial.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-secondary text-secondary" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-base text-foreground italic">
                &quot;{testimonial.quote}&quot;
              </p>

              {/* Author */}
              <div className="flex items-center gap-4 border-t border-white/10 pt-4">
                <div className="text-3xl">{testimonial.avatar}</div>
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.role} @ {testimonial.company}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Stats */}
      <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
        {[
          { number: '10,000+', label: 'Happy Users' },
          { number: '250,000+', label: 'Applications Tracked' },
          { number: '42,000+', label: 'Jobs Landed' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            variants={staggerItem}
            className="text-center space-y-2"
            whileHover={{ scale: 1.05 }}
          >
            <p className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {stat.number}
            </p>
            <p className="text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  )
}
