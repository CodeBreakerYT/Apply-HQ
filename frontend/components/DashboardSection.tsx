'use client'

import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import {
  TrendingUp,
  Briefcase,
  CheckCircle,
  Clock,
  MessageSquare,
  Target,
} from 'lucide-react'
import { staggerContainer, staggerItem, slideInUp } from '@/lib/animations'
import { useGamification } from '@/lib/gamification-context'

const applicationsData = [
  { month: 'Jan', submitted: 12, interviewed: 3, accepted: 1 },
  { month: 'Feb', submitted: 19, interviewed: 5, accepted: 2 },
  { month: 'Mar', submitted: 15, interviewed: 4, accepted: 1 },
  { month: 'Apr', submitted: 22, interviewed: 7, accepted: 3 },
  { month: 'May', submitted: 18, interviewed: 6, accepted: 2 },
  { month: 'Jun', submitted: 25, interviewed: 8, accepted: 4 },
]

const statusData = [
  { name: 'Submitted', value: 45, color: '#a78bfa' },
  { name: 'Interviewing', value: 12, color: '#06b6d4' },
  { name: 'Offer', value: 8, color: '#0ea5e9' },
  { name: 'Rejected', value: 35, color: '#ef4444' },
]

const COLORS = ['#a78bfa', '#06b6d4', '#0ea5e9', '#ef4444']

export function DashboardSection() {
  const { addXP } = useGamification()

  const statCards = [
    {
      icon: Briefcase,
      label: 'Total Applications',
      value: '42',
      subtext: '+8 this month',
      color: 'from-primary to-purple-600',
      onClick: () => addXP(50),
    },
    {
      icon: Target,
      label: 'Interview Rate',
      value: '28.6%',
      subtext: '+5.2% vs last month',
      color: 'from-secondary to-cyan-500',
      onClick: () => addXP(100),
    },
    {
      icon: CheckCircle,
      label: 'Offers Received',
      value: '8',
      subtext: '19% acceptance rate',
      color: 'from-accent to-blue-500',
      onClick: () => addXP(200),
    },
    {
      icon: Clock,
      label: 'Avg Response Time',
      value: '3.2d',
      subtext: 'Industry avg: 5d',
      color: 'from-purple-500 to-pink-500',
      onClick: () => addXP(50),
    },
  ]

  return (
    <motion.section
      className="relative z-5 max-w-7xl mx-auto px-6 py-20 space-y-12"
      variants={staggerContainer}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true }}
    >
      {/* Stat Cards */}
      <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={i}
              variants={staggerItem}
              className={`group p-6 rounded-lg bg-gradient-to-br ${stat.color} opacity-10 hover:opacity-20 border border-white/10 cursor-pointer transition-all relative overflow-hidden`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={stat.onClick}
            >
              {/* Gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity`} />

              <div className="relative z-10 space-y-4">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${stat.color} w-fit`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                  <p className="text-xs text-secondary mt-1">{stat.subtext}</p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Charts */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <motion.div
          className="lg:col-span-2 p-6 rounded-lg bg-card/40 border border-primary/20 backdrop-blur-md hover:border-primary/40 transition-colors"
          whileHover={{ scale: 1.02 }}
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">Application Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={applicationsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(167, 139, 250, 0.1)" />
              <XAxis stroke="rgba(167, 139, 250, 0.5)" />
              <YAxis stroke="rgba(167, 139, 250, 0.5)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f0f1e',
                  border: '1px solid rgba(167, 139, 250, 0.3)',
                  borderRadius: '8px',
                }}
              />
              <Line type="monotone" dataKey="submitted" stroke="#a78bfa" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="interviewed" stroke="#06b6d4" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="accepted" stroke="#0ea5e9" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Pie Chart */}
        <motion.div
          className="p-6 rounded-lg bg-card/40 border border-secondary/20 backdrop-blur-md hover:border-secondary/40 transition-colors"
          whileHover={{ scale: 1.02 }}
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">Application Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f0f1e',
                  border: '1px solid rgba(167, 139, 250, 0.3)',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </motion.div>

      {/* Activity Feed */}
      <motion.div
        variants={staggerItem}
        className="p-6 rounded-lg bg-card/40 border border-accent/20 backdrop-blur-md"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {[
            { action: 'Applied to', company: 'Google', role: 'Senior Engineer', time: '2 hours ago' },
            { action: 'Interview scheduled', company: 'Meta', role: 'Product Manager', time: '5 hours ago' },
            { action: 'Offer received', company: 'Apple', role: 'Design Lead', time: 'Yesterday' },
            { action: 'Resume analyzed', company: 'LinkedIn Profile', role: '3 improvements', time: '2 days ago' },
          ].map((item, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-4 p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
              whileHover={{ x: 5 }}
            >
              <MessageSquare className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-foreground">
                  <span className="font-semibold">{item.action}</span>
                  {' '}
                  <span className="text-muted-foreground">
                    {item.company} • {item.role}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">{item.time}</p>
              </div>
              <TrendingUp className="w-4 h-4 text-secondary flex-shrink-0" />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.section>
  )
}
