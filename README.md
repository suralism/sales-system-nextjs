# ระบบบันทึกข้อมูลขายพนักงาน (Next.js + MongoDB)

ระบบบันทึกข้อมูลขายพนักงานที่พัฒนาด้วย Next.js และ MongoDB พร้อมระบบกำหนดสิทธิ์การเข้าถึงข้อมูล

## ฟีเจอร์หลัก

### 🔐 ระบบกำหนดสิทธิ์
- **ผู้จัดการ (Admin)**: เข้าถึงได้ทุกฟีเจอร์
- **พนักงาน (Employee)**: เข้าถึงเฉพาะข้อมูลของตัวเองและบันทึกการเบิก

### 📊 ฟีเจอร์การจัดการ
- **จัดการสินค้า**: เพิ่ม ลบ แก้ไข อัปเดตข้อมูลสินค้า (Admin เท่านั้น)
- **จัดการพนักงาน**: เพิ่ม ลบ แก้ไข ข้อมูลพนักงาน (Admin เท่านั้น)
- **บันทึกการเบิก**: บันทึกการเบิก/คืนสินค้ารายวัน
- **แดชบอร์ด**: แสดงสถิติและข้อมูลสรุป
- **ข้อมูลส่วนตัว**: แก้ไขข้อมูลส่วนตัวและรหัสผ่าน

### 💰 ระบบการขาย
- บันทึกการเบิกสินค้า
- บันทึกการคืนสินค้า
- คำนวณยอดเงินอัตโนมัติ
- ดึงข้อมูลสินค้าพร้อมราคา
- ประวัติการขายรายวัน

### 📱 การออกแบบ
- Responsive Design รองรับทั้ง Desktop และ Mobile
- UI สวยงามด้วย Tailwind CSS
- UX ที่ใช้งานง่าย

## เทคโนโลยีที่ใช้

- **Frontend**: Next.js 15, React, TypeScript
- **Backend**: Next.js API Routes
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## การติดตั้งและใช้งาน

### ความต้องการของระบบ
- Node.js 18+ 
- MongoDB 4.4+
- npm หรือ yarn

### ขั้นตอนการติดตั้ง

1. **แตกไฟล์โปรเจกต์**
   ```bash
   tar -xzf sales-system-nextjs.tar.gz
   cd sales-system-nextjs
   ```

2. **ติดตั้ง Dependencies**
   ```bash
   npm install
   ```

3. **ตั้งค่า Environment Variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   แก้ไขไฟล์ `.env.local`:
   ```
   MONGODB_URI=mongodb://localhost:27017/sales_system
   JWT_SECRET=your-super-secret-jwt-key-here
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **เริ่มต้น MongoDB**
   ```bash
   # Ubuntu/Debian
   sudo systemctl start mongod
   
   # macOS (ถ้าใช้ Homebrew)
   brew services start mongodb-community
   
   # Windows
   net start MongoDB
   ```

5. **เริ่มต้นข้อมูลตัวอย่าง**
   ```bash
   npm run seed
   ```

6. **รันระบบ**
   ```bash
   npm run dev
   ```

7. **เข้าใช้งานระบบ**
   เปิดเบราว์เซอร์ไปที่: `http://localhost:3000`

## ข้อมูลการเข้าสู่ระบบเริ่มต้น

### ผู้จัดการ (Admin)
- **ชื่อผู้ใช้**: admin
- **รหัสผ่าน**: admin123

### พนักงาน (Employee)
- **ชื่อผู้ใช้**: employee1
- **รหัสผ่าน**: emp123

## โครงสร้างโปรเจกต์

```
sales-system-nextjs/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   │   ├── auth/          # Authentication APIs
│   │   │   ├── users/         # User management APIs
│   │   │   ├── products/      # Product management APIs
│   │   │   ├── sales/         # Sales recording APIs
│   │   │   └── dashboard/     # Dashboard APIs
│   │   ├── dashboard/         # Dashboard page
│   │   ├── products/          # Products management page
│   │   ├── employees/         # Employees management page
│   │   ├── sales/             # Sales recording page
│   │   ├── profile/           # Profile page
│   │   └── login/             # Login page
│   ├── components/            # Reusable components
│   │   ├── Layout.tsx         # Main layout component
│   │   └── ProtectedRoute.tsx # Route protection component
│   ├── contexts/              # React contexts
│   │   └── AuthContext.tsx    # Authentication context
│   └── lib/                   # Utilities and configurations
│       ├── mongodb.ts         # MongoDB connection
│       ├── auth.ts           # Authentication utilities
│       └── models/           # Mongoose models
├── .env.local                 # Environment variables
├── package.json              # Dependencies and scripts
└── README.md                 # Documentation
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - เข้าสู่ระบบ
- `POST /api/auth/logout` - ออกจากระบบ
- `GET /api/auth/me` - ข้อมูลผู้ใช้ปัจจุบัน

### Users Management
- `GET /api/users` - รายการผู้ใช้
- `POST /api/users` - เพิ่มผู้ใช้ใหม่
- `PUT /api/users/[id]` - แก้ไขข้อมูลผู้ใช้
- `DELETE /api/users/[id]` - ลบผู้ใช้

### Products Management
- `GET /api/products` - รายการสินค้า
- `POST /api/products` - เพิ่มสินค้าใหม่
- `PUT /api/products/[id]` - แก้ไขสินค้า
- `DELETE /api/products/[id]` - ลบสินค้า

### Sales Recording
- `GET /api/sales` - ประวัติการขาย
- `POST /api/sales` - บันทึกการเบิกใหม่

### Dashboard
- `GET /api/dashboard` - ข้อมูลสถิติและสรุป

## ระบบกำหนดสิทธิ์

### Admin (ผู้จัดการ)
- ดูข้อมูลการขายของพนักงานทุกคน
- จัดการข้อมูลสินค้า (เพิ่ม/ลบ/แก้ไข)
- จัดการข้อมูลพนักงาน (เพิ่ม/ลบ/แก้ไข)
- สร้างบัญชีผู้ใช้ใหม่
- กำหนดสิทธิ์ให้ผู้ใช้

### Employee (พนักงาน)
- ดูข้อมูลการขายของตัวเองเท่านั้น
- บันทึกการเบิกของตัวเอง
- แก้ไขข้อมูลส่วนตัวของตัวเอง
- ไม่สามารถจัดการข้อมูลสินค้าหรือพนักงานคนอื่น

## การ Deploy

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Environment Variables สำหรับ Production
```
MONGODB_URI=mongodb://your-production-mongodb-uri
JWT_SECRET=your-production-jwt-secret
NEXTAUTH_URL=https://your-domain.com
NODE_ENV=production
```

## การแก้ไขปัญหาที่พบบ่อย

### 1. MongoDB Connection Error
- ตรวจสอบว่า MongoDB service ทำงานอยู่
- ตรวจสอบ MONGODB_URI ใน .env.local
- ตรวจสอบ firewall และ network connectivity

### 2. JWT Authentication Error
- ตรวจสอบ JWT_SECRET ใน .env.local
- ลบ cookies และ localStorage ในเบราว์เซอร์
- ตรวจสอบ NEXTAUTH_URL

### 3. Permission Denied Error
- ตรวจสอบสิทธิ์ผู้ใช้ในฐานข้อมูล
- ล็อกอินใหม่
- ตรวจสอบ role ของผู้ใช้

## การพัฒนาต่อ

### เพิ่มฟีเจอร์ใหม่
1. สร้าง API endpoint ใน `src/app/api/`
2. สร้าง page component ใน `src/app/`
3. เพิ่ม navigation ใน `src/components/Layout.tsx`
4. อัปเดต permission ใน `src/components/ProtectedRoute.tsx`

### เพิ่ม Database Model
1. สร้างไฟล์ model ใน `src/lib/models/`
2. Import และใช้งานใน API routes
3. อัปเดต TypeScript interfaces

## การสนับสนุน

หากพบปัญหาหรือต้องการความช่วยเหลือ:
1. ตรวจสอบ console logs ในเบราว์เซอร์
2. ตรวจสอบ server logs ใน terminal
3. ตรวจสอบ MongoDB logs
4. ตรวจสอบ network requests ใน Developer Tools

## License

MIT License - ใช้งานได้อย่างอิสระสำหรับโปรเจกต์ส่วนตัวและเชิงพาณิชย์
