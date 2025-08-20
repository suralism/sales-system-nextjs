import React from 'react'

interface DailySale {
  date: string
  totalAmount: number
}

export default function DailySalesChart({ data }: { data: DailySale[] }) {
  if (!data.length) {
    return <p className="text-gray-500 text-center py-4">ไม่มีข้อมูล</p>
  }

  const maxAmount = Math.max(...data.map(d => d.totalAmount)) || 1
  const gradients = [
    'from-blue-500 to-cyan-400',
    'from-emerald-500 to-lime-400',
    'from-violet-500 to-pink-500',
    'from-orange-500 to-yellow-400',
    'from-red-500 to-rose-500',
    'from-teal-500 to-green-400',
    'from-indigo-500 to-purple-500'
  ]

  return (
    <div className="flex items-end justify-between h-48 mt-4 overflow-visible">
      {data.map((d, idx) => {
        const height = (d.totalAmount / maxAmount) * 100
        const gradient = gradients[idx % gradients.length]
        const dateLabel = new Date(d.date).toLocaleDateString('th-TH', {
          day: 'numeric',
          month: 'short'
        })
        return (
          <div key={idx} className="flex flex-col items-center flex-1 mx-1">
            <div
              className={`relative w-8 bg-gradient-to-t ${gradient} rounded-t`}
              style={{ height: `${height}%` }}
            >
              <span className="absolute -top-6 text-xs font-medium text-gray-700">
                {d.totalAmount.toLocaleString('th-TH')}
              </span>
            </div>
            <span className="mt-2 text-xs text-gray-600">{dateLabel}</span>
          </div>
        )
      })}
    </div>
  )
}

