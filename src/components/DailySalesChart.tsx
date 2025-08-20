'use client'

import { useEffect, useRef } from 'react'
import Script from 'next/script'

interface DailySale {
  date: string
  totalAmount: number
}

interface ChartJS {
  new (ctx: HTMLCanvasElement, config: unknown): { destroy: () => void }
}

export default function DailySalesChart({ data }: { data: DailySale[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const Chart = (window as unknown as { Chart: ChartJS }).Chart
    if (!Chart || !canvasRef.current) return

    const labels = data.map(d =>
      new Date(d.date).toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short'
      })
    )

    const chart = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'ยอดขาย (บาท)',
            data: data.map(d => d.totalAmount),
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true }
        }
      }
    })

    return () => chart.destroy()
  }, [data])

  if (!data.length) {
    return <p className="text-gray-500 text-center py-4">ไม่มีข้อมูล</p>
  }

  return (
    <>
      <Script src="https://cdn.jsdelivr.net/npm/chart.js" strategy="lazyOnload" />
      <div className="h-64">
        <canvas ref={canvasRef} />
      </div>
    </>
  )
}

