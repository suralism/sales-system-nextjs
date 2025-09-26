import { NextRequest, NextResponse } from 'next/server'
import { SaleModel } from '../../../../lib/models/Sale'
import { ProductModel } from '../../../../lib/models/Product'
import { UserModel } from '../../../../lib/models/User'
import { getUserFromRequest } from '../../../../lib/auth'
import { calculateCreditForUser, buildCreditSummary } from '../../../../lib/credit'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// GET - Get sales (admin sees all, employee sees only their own)
export async function GET(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request)
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // Get all sales
    let allSales = currentUser.role === 'employee' 
      ? await SaleModel.find({ employeeId: currentUser.userId })
      : await SaleModel.find({})
    
    // Apply filters
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const settled = searchParams.get('settled')
    
    if (startDate) {
      const startDateISO = new Date(startDate).toISOString()
      allSales = allSales.filter(sale => sale.saleDate >= startDateISO)
    }
    
    if (endDate) {
      const endDateISO = new Date(endDate).toISOString()
      allSales = allSales.filter(sale => sale.saleDate <= endDateISO)
    }

    if (settled === 'true') {
      allSales = allSales.filter(sale => sale.settled === true)
    }
    if (settled === 'false') {
      allSales = allSales.filter(sale => sale.settled === false)
    }
    
    // Sort by date (newest first)
    allSales.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())
    
    // Apply pagination
    const total = allSales.length
    const sales = allSales.slice(skip, skip + limit)
    
    return NextResponse.json({
      sales,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
    
  } catch (error) {
    console.error('Get sales error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new sale
export async function POST(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request)
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { employeeId, type, items, settled } = await request.json()
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Sale items are required' },
        { status: 400 }
      )
    }
    
    if (!type || type !== 'เบิก') {
      return NextResponse.json(
        { error: 'Only withdrawal type is allowed' },
        { status: 400 }
      )
    }
    
    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      )
    }
    const targetEmployeeId = employeeId
    
    const employee = await UserModel.findById(targetEmployeeId)
    if (!employee || !employee.isActive) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }
    
    const processedItems = []
    let totalAmount = 0

    for (const item of items) {
      const { productId, withdrawal } = item

      if (!productId) {
        throw new Error('Invalid item data: productId is missing')
      }

      const product = await ProductModel.findById(productId)
      if (!product || !product.isActive) {
        throw new Error(`Product not found: ${productId}`)
      }

      const priceInfo = product.prices.find((p: any) => p.level === employee.priceLevel)
      if (!priceInfo) {
        throw new Error(
          `Price for level ${employee.priceLevel} not found for product ${product.name}`
        )
      }
      const price = priceInfo.value

      const netQuantity = withdrawal || 0
      const itemTotalPrice = price * netQuantity

      processedItems.push({
        productId: product.id,
        productName: product.name,
        pricePerUnit: price,
        withdrawal: withdrawal || 0,
        return: 0,
        defective: 0,
        totalPrice: itemTotalPrice
      })

      totalAmount += itemTotalPrice
    }

    // Find existing unsettled sale for this employee
    let existingSale = null
    if (type === 'เบิก') {
      const allSales = await SaleModel.find({ employeeId: targetEmployeeId, type: 'เบิก', settled: false })
      existingSale = allSales.length > 0 ? allSales[0] : null
      
      // Check credit limit for withdrawal type
      const currentCreditUsed = await calculateCreditForUser(targetEmployeeId)
      const existingPendingAmount = existingSale
        ? typeof existingSale.pendingAmount === 'number'
          ? existingSale.pendingAmount
          : Math.max(
              (existingSale.totalAmount || 0) - (existingSale.paidAmount || 0),
              0
            )
        : 0

      const newPendingAmount = Math.max(
        totalAmount - (existingSale?.paidAmount || 0),
        0
      )

      const newCreditUsed =
        currentCreditUsed - existingPendingAmount + newPendingAmount
      const creditSummary = buildCreditSummary(
        employee.creditLimit,
        newCreditUsed
      )

      const creditLimit =
        typeof employee.creditLimit === 'number' ? employee.creditLimit : 0

      if (newCreditUsed > creditLimit) {
        return NextResponse.json({
          error: 'เกินวงเงินเครดิต',
          details: {
            creditLimit: creditSummary.creditLimit,
            currentUsed: currentCreditUsed,
            existingPending: existingPendingAmount,
            requestedAmount: newPendingAmount,
            newTotal: newCreditUsed,
            exceededBy: Math.max(
              newCreditUsed - creditSummary.creditLimit,
              0
            )
          }
        }, { status: 400 })
      }
    }

    if (existingSale) {
      // Update existing sale
      processedItems.forEach((newItem) => {
        const existingItem = existingSale!.items.find(
          (item) => item.productId === newItem.productId
        )

        if (existingItem) {
          existingItem.withdrawal += newItem.withdrawal
          existingItem.totalPrice = existingItem.pricePerUnit * existingItem.withdrawal
        } else {
          existingSale!.items.push(newItem)
        }
      })

      existingSale.totalAmount = existingSale.items.reduce(
        (sum, item) => sum + item.totalPrice,
        0
      )
      existingSale.pendingAmount = Math.max(
        existingSale.totalAmount - (existingSale.paidAmount || 0),
        0
      )

      await SaleModel.updateById(existingSale.id, {
        items: existingSale.items,
        totalAmount: existingSale.totalAmount,
        pendingAmount: existingSale.pendingAmount
      })

      return NextResponse.json({
        message: 'Sale updated successfully',
        sale: existingSale
      })
    }

    // Create new sale
    const newSale = await SaleModel.create({
      employeeId: targetEmployeeId,
      employeeName: employee.name,
      type,
      items: processedItems,
      totalAmount,
      paidAmount: 0,
      paymentMethod: 'cash',
      pendingAmount: totalAmount,
      cashAmount: 0,
      transferAmount: 0,
      customerPending: 0,
      expenseAmount: 0,
      awaitingTransfer: 0,
      settled: settled ?? false,
      saleDate: new Date().toISOString()
    })

    return NextResponse.json(
      {
        message: 'Sale recorded successfully',
        sale: newSale
      },
      { status: 201 }
    )
    
  } catch (error) {
    console.error('Create sale error:', error)
    
    if (error instanceof Error && (error.message.includes('Product not found') ||
        error.message.includes('Invalid item data'))) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

