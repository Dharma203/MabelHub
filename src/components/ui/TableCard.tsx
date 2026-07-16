import type { LucideIcon } from 'lucide-react'

const THEMES = {
  blue: {
    iconBg: 'bg-blue-100',
    icon: 'text-blue-600',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    dot: 'bg-blue-500',
    bar: 'bg-blue-500',
    value: 'text-blue-600',
  },
  green: {
    iconBg: 'bg-green-100',
    icon: 'text-green-600',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-700',
    dot: 'bg-green-500',
    bar: 'bg-green-500',
    value: 'text-green-600',
  },
  red: {
    iconBg: 'bg-red-100',
    icon: 'text-red-500',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-600',
    dot: 'bg-red-500',
    bar: 'bg-red-500',
    value: 'text-red-600',
  },
  orange: {
    iconBg: 'bg-orange-100',
    icon: 'text-orange-600',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-700',
    dot: 'bg-orange-500',
    bar: 'bg-orange-500',
    value: 'text-orange-600',
  },
} as const

type ThemeColor = keyof typeof THEMES

interface StatItem {
  label: string
  value: number
  color?: ThemeColor // overrides the card's default color for this row only
}

interface StatCardProps {
  icon: LucideIcon
  title: string
  items: StatItem[]
  color?: ThemeColor // default color for header + all rows
}

export default function TableCard({
  icon: Icon,
  title,
  items,
  color = 'blue',
}: StatCardProps) {
  const theme = THEMES[color]
  const maxValue = Math.max(...items.map((item) => item.value))

  return (
    <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-5'>
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-3'>
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${theme.iconBg}`}
          >
            <Icon className={`w-4 h-4 ${theme.icon}`} strokeWidth={2} />
          </div>
          <h3 className='text-xs font-semibold tracking-wider text-gray-500 uppercase'>
            {title}
          </h3>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${theme.badgeBg} ${theme.badgeText}`}
        >
          {items.length} Item
        </span>
      </div>

      <hr className='border-gray-100 mb-3.5' />

      <div className='space-y-3.5'>
        {items.map((item) => {
          const rowTheme = item.color ? THEMES[item.color] : theme
          const width = maxValue > 0 ? (item.value / maxValue) * 100 : 0
          return (
            <div key={item.label}>
              <div className='flex items-center justify-between text-sm mb-1.5'>
                <div className='flex items-center gap-2 min-w-0'>
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${rowTheme.dot}`}
                  />
                  <span className='text-gray-700 truncate'>{item.label}</span>
                </div>
                <span
                  className={`font-semibold shrink-0 ml-2 ${rowTheme.value}`}
                >
                  {item.value}
                </span>
              </div>
              <div className='h-1.5 bg-gray-100 rounded-full overflow-hidden'>
                <div
                  className={`h-full rounded-full ${rowTheme.bar}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}