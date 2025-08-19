'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { 
  Navbar, 
  NavbarBrand, 
  NavbarContent, 
  NavbarItem, 
  NavbarMenuToggle, 
  NavbarMenu, 
  NavbarMenuItem, 
  Link, 
  Dropdown, 
  DropdownTrigger, 
  DropdownMenu, 
  DropdownItem, 
  Avatar, 
  Card, 
  CardBody 
} from "@nextui-org/react";

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const navigation = [
    { name: 'แดชบอร์ด', href: '/dashboard', icon: '📊' },
    { name: 'บันทึกการขาย', href: '/sales', icon: '💰' },
    { name: 'เคลียบิล', href: '/settlement', icon: '🧾' },
    { name: 'จัดการสินค้า', href: '/products', icon: '📦', adminOnly: true },
    { name: 'จัดการพนักงาน', href: '/employees', icon: '👥', adminOnly: true },
    { name: 'ข้อมูลส่วนตัว', href: '/profile', icon: '👤' },
  ]

  const filteredNavigation = navigation.filter(item => 
    !item.adminOnly || user?.role === 'admin'
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuOpenChange={setIsMenuOpen} isBordered>
        <NavbarContent>
          <NavbarMenuToggle
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            className="sm:hidden"
          />
          <NavbarBrand>
            <p className="font-bold text-inherit">ระบบขายสินค้า</p>
          </NavbarBrand>
        </NavbarContent>

        <NavbarContent className="hidden sm:flex gap-4" justify="center">
          {filteredNavigation.map((item, index) => (
            <NavbarItem key={`${item.name}-${index}`} isActive={pathname.startsWith(item.href)}>
              <Link color={pathname.startsWith(item.href) ? "primary" : "foreground"} href={item.href}>
                {item.name}
              </Link>
            </NavbarItem>
          ))}
        </NavbarContent>

        <NavbarContent as="div" justify="end">
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Avatar
                isBordered
                as="button"
                className="transition-transform"
                color="primary"
                size="sm"
                name={user?.name || 'U'}
              />
            </DropdownTrigger>
            <DropdownMenu aria-label="Profile Actions" variant="flat">
              <DropdownItem key="profile" className="h-14 gap-2">
                <p className="font-semibold">Signed in as</p>
                <p className="font-semibold">{user?.email}</p>
              </DropdownItem>
              <DropdownItem key="settings" href="/profile">ข้อมูลส่วนตัว</DropdownItem>
              <DropdownItem key="logout" color="danger" onClick={handleLogout}>
                ออกจากระบบ
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </NavbarContent>

        <NavbarMenu>
          {filteredNavigation.map((item, index) => (
            <NavbarMenuItem key={`${item.name}-${index}`}>
              <Link
                color={pathname.startsWith(item.href) ? "primary" : "foreground"}
                className="w-full"
                href={item.href}
                size="lg"
              >
                {item.name}
              </Link>
            </NavbarMenuItem>
          ))}
        </NavbarMenu>
      </Navbar>

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardBody>
              {children}
            </CardBody>
          </Card>
        </div>
      </main>
    </div>
  );
}

