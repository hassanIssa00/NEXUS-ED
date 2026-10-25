'use client'

import type { ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export type DashboardChartPoint = {
  label: string
  value: number
  color?: string
}

const palette = ['#0f766e', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#65a30d']

function ChartCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="min-w-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function EmptyChart({ label }: { label: string }) {
  return <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">{label}</div>
}

export function DashboardBarChart({
  title,
  description,
  data,
  emptyLabel,
  color = '#234a65',
  suffix,
}: {
  title: string
  description?: string
  data: DashboardChartPoint[]
  emptyLabel: string
  color?: string
  suffix?: string
}) {
  const hasData = data.length > 0 && data.some((item) => Number.isFinite(item.value) && item.value > 0)
  return (
    <ChartCard title={title} description={description}>
      {hasData ? (
        <div className="h-64 w-full" role="img" aria-label={title}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} width={42} />
              <Tooltip formatter={(value) => [`${value ?? 0}${suffix || ''}`, title]} />
              <Bar dataKey="value" name={title} fill={color} radius={[5, 5, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : <EmptyChart label={emptyLabel} />}
    </ChartCard>
  )
}

export function DashboardDonutChart({
  title,
  description,
  data,
  emptyLabel,
}: {
  title: string
  description?: string
  data: DashboardChartPoint[]
  emptyLabel: string
}) {
  const populated = data.filter((item) => Number.isFinite(item.value) && item.value > 0)
  return (
    <ChartCard title={title} description={description}>
      {populated.length ? (
        <div className="h-64 w-full" role="img" aria-label={title}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={populated} dataKey="value" nameKey="label" cx="50%" cy="45%" innerRadius={52} outerRadius={82} paddingAngle={2}>
                {populated.map((entry, index) => <Cell key={`${entry.label}-${index}`} fill={entry.color || palette[index % palette.length]} />)}
              </Pie>
              <Tooltip formatter={(value) => [value ?? 0, title]} />
              <Legend verticalAlign="bottom" height={42} formatter={(value) => <span className="text-xs text-foreground">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : <EmptyChart label={emptyLabel} />}
    </ChartCard>
  )
}

export function DashboardComparisonChart({
  title,
  description,
  data,
  emptyLabel,
  leftLabel,
  rightLabel,
}: {
  title: string
  description?: string
  data: Array<{ label: string; first: number | null; second: number | null }>
  emptyLabel: string
  leftLabel: string
  rightLabel: string
}) {
  const populated = data.filter((item) => item.first !== null || item.second !== null)
  return (
    <ChartCard title={title} description={description}>
      {populated.length ? (
        <div className="h-64 w-full" role="img" aria-label={title}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={populated} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={42} />
              <Tooltip formatter={(value) => [`${value ?? 0}%`]} />
              <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-xs text-foreground">{value}</span>} />
              <Bar dataKey="first" name={leftLabel} fill="#0f766e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="second" name={rightLabel} fill="#d97706" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : <EmptyChart label={emptyLabel} />}
    </ChartCard>
  )
}
