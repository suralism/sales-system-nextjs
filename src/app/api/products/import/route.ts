import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../../../lib/database'
import Product from '../../../../../lib/models/Product'
import { CATEGORY_TYPES } from '../../../../../lib/constants'
import { getUserFromRequest } from '../../../../../lib/auth'

const priceLevels = ['ราคาปกติ', 'ราคาตัวแทน', 'ราคาพนักงาน', 'ราคาพิเศษ']

interface CSVRecord {
  [key: string]: string
}

function parseCSV(text: string): CSVRecord[] {
  const lines = text.trim().split(/\r?\n/)
  const headersLine = lines.shift()
  if (!headersLine) return []
  const headers = headersLine.split(',').map(h => h.trim())
  return lines
    .filter(line => line.trim() !== '')
    .map(line => {
      const values = line.split(',').map(v => v.trim())
      const record: CSVRecord = {}
      headers.forEach((h, i) => {
        record[h] = values[i] || ''
      })
      return record
    })
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request)

    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    const text = await file.text()
    const records = parseCSV(text)

    if (records.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty' },
        { status: 400 }
      )
    }

    await connectDB()

    let imported = 0
    let skipped = 0

    for (const record of records) {
      const name = record['name']?.trim()

      if (!name) {
        skipped++
        continue
      }

      const existingProduct = await Product.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        isActive: true
      })

      if (existingProduct) {
        skipped++
        continue
      }

      const prices = priceLevels
        .map(level => {
          const valueStr = record[level]?.trim()
          if (!valueStr) return null
          const value = parseFloat(valueStr)
          if (isNaN(value)) return null
          return { level, value }
        })
        .filter((p): p is { level: string; value: number } => p !== null)

      if (prices.length === 0) {
        skipped++
        continue
      }

      const category = record['category']?.trim()
      if (!category || !CATEGORY_TYPES.includes(category)) {
        skipped++
        continue
      }

      await Product.create({
        name,
        prices,
        category
      })

      imported++
    }

    return NextResponse.json({
      message: 'Import completed',
      imported,
      skipped
    })
  } catch (error) {
    console.error('Import products error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

