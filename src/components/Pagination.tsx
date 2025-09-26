'use client'

import { Pagination as AntPagination, PaginationProps as AntPaginationProps } from 'antd'

interface PaginationProps extends Omit<AntPaginationProps, 'onChange' | 'current' | 'total' | 'pageSize'> {
  page: number
  total: number
  limit: number
  onPageChange: (page: number) => void
}

export default function Pagination({ page, total, limit, onPageChange, ...props }: PaginationProps) {
  const totalPages = Math.ceil(total / limit)
  if (totalPages <= 1) return null

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
      <AntPagination
        current={page}
        total={total}
        pageSize={limit}
        onChange={onPageChange}
        showSizeChanger={false}
        showQuickJumper={false}
        showTotal={(total, range) => 
          `${range[0]}-${range[1]} ของ ${total} รายการ`
        }
        itemRender={(current, type, originalElement) => {
          if (type === 'prev') {
            return <span>ก่อนหน้า</span>
          }
          if (type === 'next') {
            return <span>ถัดไป</span>
          }
          return originalElement
        }}
        {...props}
      />
    </div>
  )
}

