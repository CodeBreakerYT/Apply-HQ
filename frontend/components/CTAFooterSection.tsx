'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Mail, Share2, Heart, Link2 } from 'lucide-react'
import { slideInUp, staggerContainer, staggerItem } from '@/lib/animations'

export function CTAFooterSection() {
  return (
    <>
      {/* CTA Section */}
      <motion.section
        className="relative z-5 max-w-4xl mx-auto px-6 py-20"
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
      >
        <motion.div
          className="relative rounded-lg overflow-hidden p-12 text-center"
          variants={staggerItem}
        >
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 blur-3xl" />
          <div className="absolute inset-0 border border-primary/30" />

          <div className="relative z-10 space-y-6">
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground">
              Ready to Land Your Dream Job?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start for free today. No credit card needed. Forever free.
            </p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              variants={staggerItem}
            >
              <Link href="/signup">
                <motion.button
                  className="px-8 py-4 rounded-lg bg-gradient-to-r from-primary to-purple-600 text-background font-semibold hover:shadow-lg hover:shadow-primary/50 transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Get Started Free
                </motion.button>
              </Link>
              <Link href="/login">
                <motion.button
                  className="px-8 py-4 rounded-lg border border-primary/30 text-foreground font-semibold hover:bg-primary/10 transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Already have an account?
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </motion.section>

      {/* Footer */}
      <motion.footer
        className="relative z-5 border-t border-primary/20 bg-background/50 backdrop-blur-md mt-20"
        {...slideInUp}
      >
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <motion.div variants={staggerItem} className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">ApplyHQ</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  AI-powered job application dashboard
                </p>
              </div>
              <div className="flex gap-4">
                <motion.a
                  href="#"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  whileHover={{ scale: 1.2 }}
                >
                  <Share2 className="w-5 h-5" />
                </motion.a>
                <motion.a
                  href="#"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  whileHover={{ scale: 1.2 }}
                >
                  <Heart className="w-5 h-5" />
                </motion.a>
                <motion.a
                  href="#"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  whileHover={{ scale: 1.2 }}
                >
                  <Link2 className="w-5 h-5" />
                </motion.a>
              </div>
            </motion.div>

            {/* Product */}
            <motion.div variants={staggerItem} className="space-y-3">
              <h4 className="font-semibold text-foreground">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Security
                  </a>
                </li>
              </ul>
            </motion.div>

            {/* Resources */}
            <motion.div variants={staggerItem} className="space-y-3">
              <h4 className="font-semibold text-foreground">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Guides
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    API Docs
                  </a>
                </li>
              </ul>
            </motion.div>

            {/* Legal */}
            <motion.div variants={staggerItem} className="space-y-3">
              <h4 className="font-semibold text-foreground">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Terms
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </motion.div>
          </div>

          {/* Bottom */}
          <motion.div
            className="border-t border-primary/20 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground"
            variants={staggerItem}
          >
            <p>&copy; 2026 ApplyHQ. All rights reserved.</p>
            <motion.div className="flex items-center gap-2" whileHover={{ scale: 1.05 }}>
              <Mail className="w-4 h-4" />
              <a href="mailto:support@applyhq.com" className="hover:text-primary transition-colors">
                support@applyhq.com
              </a>
            </motion.div>
          </motion.div>
        </div>
      </motion.footer>
    </>
  )
}
