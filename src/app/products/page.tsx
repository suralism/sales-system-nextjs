'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import toast from 'react-hot-toast';
import {
  Table, 
  TableHeader, 
  TableColumn, 
  TableBody, 
  TableRow, 
  TableCell, 
  Button, 
  Tooltip, 
  Chip, 
  Spinner, 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter, 
  useDisclosure, 
  Input, 
  Textarea, 
  Link
} from '@nextui-org/react';
import { Edit, Trash, Plus, Upload, Download } from 'lucide-react';

interface Price {
  level: string;
  value: number;
}

interface Product {
  _id: string
  name: string
  prices: Price[];
  stock: number
  description?: string
  category?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const priceLevels = ['ราคาปกติ', 'ราคาตัวแทน', 'ราคาพนักงาน', 'ราคาพิเศษ'];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const {isOpen, onOpen, onOpenChange} = useDisclosure();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    prices: priceLevels.map(level => ({ level, value: '' as string | number})),
    stock: '',
    description: '',
    category: ''
  })

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products)
      } else {
        toast.error('Failed to fetch products.');
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
      toast.error('Failed to fetch products.');
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const uploadFormData = new FormData()
    uploadFormData.append('file', file)
    try {
      const response = await fetch('/api/products/import', {
        method: 'POST',
        body: uploadFormData,
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        toast.success(`นำเข้าสำเร็จ ${data.imported} รายการ, ข้าม ${data.skipped} รายการ`)
        await fetchProducts()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Import failed')
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Import failed')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async () => {
    try {
      const url = editingProduct ? `/api/products/${editingProduct._id}` : '/api/products'
      const method = editingProduct ? 'PUT' : 'POST'
      
      const processedPrices = formData.prices.map(p => {
          if (p.value === '' || isNaN(Number(p.value))) {
              throw new Error(`Price for level ${p.level} is invalid.`);
          }
          return {...p, value: Number(p.value) };
      });

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, prices: processedPrices, stock: Number(formData.stock) }),
        credentials: 'include'
      })

      if (response.ok) {
        toast.success(`Product ${editingProduct ? 'updated' : 'created'} successfully!`)
        await fetchProducts()
        onOpenChange(); // Close modal
      } else {
        const error = await response.json()
        toast.error(error.error || 'An error occurred.')
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error((error as Error).message || 'An error occurred while saving the product.')
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    const newPrices = priceLevels.map(level => {
        const price = product.prices.find(p => p.level === level);
        return { level, value: price ? price.value : '' };
    });

    setFormData({
      name: product.name,
      prices: newPrices,
      stock: product.stock.toString(),
      description: product.description || '',
      category: product.category || ''
    })
    onOpen();
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      const response = await fetch(`/api/products/${productId}`, { method: 'DELETE', credentials: 'include' })
      if (response.ok) {
        toast.success('Product deleted successfully');
        await fetchProducts()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete product.')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('An error occurred while deleting the product.')
    }
  }

  const resetForm = () => {
    setEditingProduct(null)
    setFormData({
      name: '',
      prices: priceLevels.map(level => ({ level, value: ''})),
      stock: '',
      description: '',
      category: ''
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount)
  }

  const getNormalPrice = (product: Product) => {
      const price = product.prices.find(p => p.level === 'ราคาปกติ');
      return price ? price.value : 0;
  }

  const renderCell = useCallback((product: Product, columnKey: React.Key) => {
    const cellValue = product[columnKey as keyof Product];

    switch (columnKey) {
      case "name":
        return (
          <div>
            <p className="font-semibold">{product.name}</p>
            <p className="text-sm text-default-500">{product.category}</p>
          </div>
        );
      case "price":
        return formatCurrency(getNormalPrice(product));
      case "stock":
        return (
          <Chip color={product.stock <= 10 ? "danger" : "success"} variant="flat">
            {product.stock} ชิ้น
          </Chip>
        );
      case "status":
        return product.prices && product.prices.length > 0 ? (
          <Chip color="success" variant="flat">ปกติ</Chip>
        ) : (
          <Chip color="warning" variant="flat">รออัปเดตราคา</Chip>
        );
      case "actions":
        return (
          <div className="relative flex items-center gap-2">
            <Tooltip content="แก้ไขสินค้า">
              <Button isIconOnly size="sm" variant="light" onPress={() => handleEdit(product)}>
                <Edit className="text-default-500" size={18} />
              </Button>
            </Tooltip>
            <Tooltip color="danger" content="ลบสินค้า">
              <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(product._id)}>
                <Trash className="text-danger" size={18} />
              </Button>
            </Tooltip>
          </div>
        );
      default:
        return <>{cellValue}</>;
    }
  }, []);

  if (loading) {
    return (
      <ProtectedRoute requiredRole="admin">
        <Layout>
          <div className="flex items-center justify-center h-64">
            <Spinner size="lg" />
          </div>
        </Layout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="admin">
      <Layout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">จัดการสินค้า</h1>
              <p className="text-default-600">เพิ่ม แก้ไข และจัดการสินค้าในระบบ</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <Button color="success" variant="flat" startContent={<Upload size={16} />} onPress={handleImportClick}>
                นำเข้า CSV
              </Button>
              <Button color="primary" startContent={<Plus size={16} />} onPress={() => { resetForm(); onOpen(); }}>
                เพิ่มสินค้าใหม่
              </Button>
              <Link href="/sample-products.csv" download>
                <Button color="default" variant="bordered" startContent={<Download size={16} />}>
                  ไฟล์ตัวอย่าง
                </Button>
              </Link>
            </div>
          </div>

          <Table aria-label="Products table">
            <TableHeader>
              <TableColumn key="name">สินค้า</TableColumn>
              <TableColumn key="price">ราคาปกติ</TableColumn>
              <TableColumn key="stock">สต็อก</TableColumn>
              <TableColumn key="status">สถานะ</TableColumn>
              <TableColumn key="actions" align="end">การจัดการ</TableColumn>
            </TableHeader>
            <TableBody items={products} isLoading={loading} loadingContent={<Spinner label="Loading..." />}>
              {(item) => (
                <TableRow key={item._id}>
                  {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
                </TableRow>
              )}
            </TableBody>
          </Table>

          <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="top-center" size="2xl">
            <ModalContent>
              {(onClose) => (
                <>
                  <ModalHeader className="flex flex-col gap-1">
                    {editingProduct ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
                  </ModalHeader>
                  <ModalBody>
                    <Input
                      autoFocus
                      label="ชื่อสินค้า"
                      placeholder="กรอกชื่อสินค้า"
                      variant="bordered"
                      value={formData.name}
                      onValueChange={(value) => setFormData({...formData, name: value})}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      {formData.prices.map((price, index) => (
                        <Input
                          key={index}
                          type="number"
                          label={price.level}
                          placeholder="0.00"
                          variant="bordered"
                          value={price.value.toString()}
                          onValueChange={(value) => {
                            const newPrices = [...formData.prices];
                            newPrices[index].value = value;
                            setFormData({...formData, prices: newPrices});
                          }}
                        />
                      ))}
                    </div>
                    <Input
                      type="number"
                      label="จำนวนสต็อก"
                      placeholder="0"
                      variant="bordered"
                      value={formData.stock.toString()}
                      onValueChange={(value) => setFormData({...formData, stock: value})}
                    />
                    <Input
                      label="หมวดหมู่"
                      placeholder="เช่น เครื่องดื่ม, ขนม"
                      variant="bordered"
                      value={formData.category}
                      onValueChange={(value) => setFormData({...formData, category: value})}
                    />
                    <Textarea
                      label="รายละเอียด"
                      placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับสินค้า"
                      variant="bordered"
                      value={formData.description}
                      onValueChange={(value) => setFormData({...formData, description: value})}
                    />
                  </ModalBody>
                  <ModalFooter>
                    <Button color="danger" variant="flat" onPress={onClose}>
                      ยกเลิก
                    </Button>
                    <Button color="primary" onPress={() => { handleSubmit(); onClose(); }}>
                      {editingProduct ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}
                    </Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}
