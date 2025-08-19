'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import { useAuth } from '@/contexts/AuthContext'
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
  Select, 
  SelectItem,
  Autocomplete,
  AutocompleteItem
} from '@nextui-org/react';
import { Edit, Trash, Plus } from 'lucide-react';

// Interfaces
interface Price {
  level: string;
  value: number;
}

interface Product {
  _id: string
  name: string
  prices: Price[];
  stock: number
}

interface Employee {
  _id: string
  name: string
  priceLevel: string;
}

interface SaleItem {
  productId: string
  productName: string
  pricePerUnit: number
  withdrawal: number
  return: number
  defective: number
}

interface Sale {
  _id: string
  employeeId: string
  employeeName: string
  saleDate: string
  type: 'เบิก' | 'คืน'
  items: SaleItem[]
  totalAmount: number
  notes?: string
  settled: boolean
}

export default function SalesPage() {
  const { user } = useAuth()
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const {isOpen, onOpen, onOpenChange, onClose} = useDisclosure();
  const [editingSale, setEditingSale] = useState<Sale | null>(null)

  const [formData, setFormData] = useState<Omit<Sale, '_id' | 'saleDate' | 'employeeName' | 'totalAmount' | 'settled'> & { employeeId: string }>({
    employeeId: '',
    type: 'เบิก',
    items: [],
    notes: ''
  })

  const selectedEmployee = useMemo(() => {
    return employees.find(e => e._id === formData.employeeId);
  }, [formData.employeeId, employees]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [salesRes, productsRes, employeesRes] = await Promise.all([
        fetch('/api/sales', { credentials: 'include' }),
        fetch('/api/products', { credentials: 'include' }),
        fetch('/api/users', { credentials: 'include' })
      ]);
      if (salesRes.ok) setSales((await salesRes.json()).sales);
      if (productsRes.ok) setProducts((await productsRes.json()).products);
      if (employeesRes.ok) setEmployees((await employeesRes.json()).users);
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false)
    }
  }, []);

  useEffect(() => {
    if(user) fetchData();
  }, [user, fetchData]);

  const handleSubmit = async () => {
    try {
      const url = editingSale ? `/api/sales/${editingSale._id}` : '/api/sales'
      const method = editingSale ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      if (response.ok) {
        await fetchData()
        onClose();
        toast.success(editingSale ? 'อัปเดตการขายสำเร็จ' : 'บันทึกการขายสำเร็จ')
      } else {
        const error = await response.json()
        toast.error(error.error || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    }
  }

  const resetForm = () => {
    setEditingSale(null);
    setFormData({
      employeeId: '',
      type: 'เบิก',
      items: [],
      notes: ''
    });
  }

  const addProductToForm = (productId: string) => {
    const product = products.find(p => p._id === productId);
    if (!product || !selectedEmployee) return;

    if (formData.items.some(item => item.productId === product._id)) {
      toast.error('This product is already in the list.')
      return
    }

    const priceInfo = product.prices.find(p => p.level === selectedEmployee.priceLevel);
    if (!priceInfo) {
        toast.error(`Price for level ${selectedEmployee.priceLevel} not found for this product.`);
        return;
    }

    const newItem: SaleItem = {
      productId: product._id,
      productName: product.name,
      pricePerUnit: priceInfo.value,
      withdrawal: 1,
      return: 0,
      defective: 0
    }
    setFormData({ ...formData, items: [...formData.items, newItem] })
  }

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index)
    setFormData({ ...formData, items: newItems })
  }

  const updateItem = (index: number, field: keyof SaleItem, value: string) => {
    const newItems = [...formData.items]
    const item = newItems[index];
    (item[field] as number) = parseInt(value, 10) || 0;
    setFormData({ ...formData, items: newItems })
  }

  const { totalAmount, totalItems } = useMemo(() => {
    let amount = 0, items = 0;
    formData.items.forEach(item => {
      const netQuantity = item.withdrawal - item.return - item.defective;
      amount += netQuantity * item.pricePerUnit
      items += netQuantity
    })
    return { totalAmount: amount, totalItems: items }
  }, [formData.items])

  const handleDelete = async (saleId: string) => {
    if (window.confirm('Are you sure you want to delete this sale?')) {
      try {
        const response = await fetch(`/api/sales/${saleId}`, { method: 'DELETE', credentials: 'include' });
        if (response.ok) {
          toast.success('Sale deleted successfully');
          fetchData();
        } else {
          const error = await response.json();
          toast.error(error.error || 'Failed to delete sale');
        }
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete sale');
      }
    }
  };

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale);
    setFormData({
      employeeId: sale.employeeId,
      type: sale.type,
      items: sale.items,
      notes: sale.notes || ''
    });
    onOpen();
  }

  const formatCurrency = (amount: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const renderCell = useCallback((sale: Sale, columnKey: React.Key) => {
    switch (columnKey) {
      case "date":
        return formatDate(sale.saleDate);
      case "employee":
        return sale.employeeName;
      case "type":
        return <Chip color={sale.type === 'เบิก' ? "danger" : "success"} variant="flat">{sale.type}</Chip>;
      case "items":
        return `${sale.items.length} รายการ`;
      case "amount":
        return formatCurrency(sale.totalAmount);
      case "status":
        return <Chip color={sale.settled ? "success" : "warning"} variant="flat">{sale.settled ? 'เคลียบิลแล้ว' : 'รอเคลียบิล'}</Chip>;
      case "actions":
        return (
          <div className="relative flex items-center gap-2">
            {(user?.role === 'admin' || user?.id === sale.employeeId) && !sale.settled && (
              <Tooltip content="แก้ไข">
                <Button isIconOnly size="sm" variant="light" onPress={() => handleEdit(sale)}>
                  <Edit className="text-default-500" size={18} />
                </Button>
              </Tooltip>
            )}
            {user?.role === 'admin' && (
              <Tooltip color="danger" content="ลบ">
                <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(sale._id)}>
                  <Trash className="text-danger" size={18} />
                </Button>
              </Tooltip>
            )}
          </div>
        );
      default:
        return null;
    }
  }, [user, handleEdit, handleDelete]);

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center h-64">
            <Spinner size="lg" />
          </div>
        </Layout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">บันทึกการขาย</h1>
              <p className="text-default-600">บันทึกการเบิกและคืนสินค้าของพนักงาน</p>
            </div>
            <Button color="primary" startContent={<Plus size={16} />} onPress={() => { resetForm(); onOpen(); }}>
              บันทึกการขายใหม่
            </Button>
          </div>

          <Table aria-label="Sales table">
            <TableHeader>
              <TableColumn key="date">วันที่</TableColumn>
              <TableColumn key="employee">พนักงาน</TableColumn>
              <TableColumn key="type">ประเภท</TableColumn>
              <TableColumn key="items">รายการ</TableColumn>
              <TableColumn key="amount">ยอดรวม</TableColumn>
              <TableColumn key="status">สถานะ</TableColumn>
              <TableColumn key="actions" align="end"></TableColumn>
            </TableHeader>
            <TableBody items={sales} isLoading={loading} loadingContent={<Spinner label="Loading..." />}>
              {(item) => (
                <TableRow key={item._id}>
                  {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
                </TableRow>
              )}
            </TableBody>
          </Table>

          <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="top-center" size="4xl" scrollBehavior="inside">
            <ModalContent>
              {(onClose) => (
                <>
                  <ModalHeader className="flex flex-col gap-1">
                    {editingSale ? 'แก้ไขการขาย' : 'บันทึกการขายใหม่'}
                  </ModalHeader>
                  <ModalBody>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Select
                        isRequired
                        label="พนักงาน"
                        placeholder="เลือกพนักงาน"
                        selectedKeys={formData.employeeId ? [formData.employeeId] : []}
                        onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                        isDisabled={!!editingSale}
                      >
                        {employees.map((employee) => (
                          <SelectItem key={employee._id} value={employee._id}>
                            {employee.name}
                          </SelectItem>
                        ))}
                      </Select>
                      <Select
                        isRequired
                        label="ประเภท"
                        selectedKeys={[formData.type]}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as 'เบิก' | 'คืน' })}
                      >
                        <SelectItem key="เบิก" value="เบิก">เบิก</SelectItem>
                        <SelectItem key="คืน" value="คืน">คืน</SelectItem>
                      </Select>
                    </div>
                    <Autocomplete
                        label="ค้นหาสินค้า"
                        placeholder="พิมพ์เพื่อค้นหาสินค้า..."
                        onSelectionChange={(key) => key && addProductToForm(key.toString())}
                        isDisabled={!formData.employeeId}
                    >
                        {products.map((product) => (
                            <AutocompleteItem key={product._id} value={product._id}>
                                {product.name}
                            </AutocompleteItem>
                        ))}
                    </Autocomplete>
                    
                    <div className="mt-4">
                      <h3 className="text-lg font-medium mb-2">รายการสินค้า</h3>
                      <Table removeWrapper aria-label="Sale items table">
                        <TableHeader>
                          <TableColumn>สินค้า</TableColumn>
                          <TableColumn>ราคา</TableColumn>
                          <TableColumn>เบิก</TableColumn>
                          <TableColumn>คืน</TableColumn>
                          <TableColumn>ของเสีย</TableColumn>
                          <TableColumn></TableColumn>
                        </TableHeader>
                        <TableBody items={formData.items} emptyContent="ยังไม่มีสินค้าในรายการ">
                          {(item, index) => (
                            <TableRow key={item.productId}>
                              <TableCell>{item.productName}</TableCell>
                              <TableCell>{formatCurrency(item.pricePerUnit)}</TableCell>
                              <TableCell>
                                <Input type="number" min="0" value={item.withdrawal.toString()} onValueChange={(v) => updateItem(index, 'withdrawal', v)} size="sm"/>
                              </TableCell>
                              <TableCell>
                                <Input type="number" min="0" value={item.return.toString()} onValueChange={(v) => updateItem(index, 'return', v)} size="sm"/>
                              </TableCell>
                              <TableCell>
                                <Input type="number" min="0" value={item.defective.toString()} onValueChange={(v) => updateItem(index, 'defective', v)} size="sm"/>
                              </TableCell>
                              <TableCell>
                                <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => removeItem(index)}>
                                  <Trash size={16} />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    <Textarea
                      label="หมายเหตุ"
                      placeholder="รายละเอียดเพิ่มเติม"
                      value={formData.notes}
                      onValueChange={(value) => setFormData({ ...formData, notes: value })}
                    />
                  </ModalBody>
                  <ModalFooter>
                    <div className="flex-grow font-semibold text-lg">
                        ยอดรวม: {formatCurrency(totalAmount)}
                    </div>
                    <Button color="danger" variant="flat" onPress={onClose}>
                      ยกเลิก
                    </Button>
                    <Button color="primary" onPress={handleSubmit}>
                      {editingSale ? 'บันทึกการเปลี่ยนแปลง' : 'บันทึกการขาย'}
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
