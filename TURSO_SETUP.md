# Turso Database Setup Guide

## Current Status
✅ **Local SQLite Database Working**: All tables created and populated successfully  
❌ **Turso Cloud Database**: Experiencing 400 status code errors during migration

## Database Structure
The database contains **13 tables** with complete schema:

### Core Tables
- **users** (2 records) - Admin and employee accounts
- **products** (5 records) - Sample products with Thai names
- **product_prices** (20 records) - 4 price levels per product
- **sales** - Transaction records
- **sale_items** - Individual sale line items
- **inventory** - Stock management
- **stock_movements** - Inventory tracking
- **requisitions** & **requisition_items** - Purchase requests
- **suppliers** - Vendor management
- **purchase_orders** & **purchase_order_items** - Procurement
- **stock_alerts** - Low stock notifications

## Available Scripts

```bash
# Database Management
npm run migrate           # Create all tables
npm run seed             # Add basic users
npm run seed-full        # Add users + sample products
npm run check-db         # Test database connectivity
npm run db-report        # Generate comprehensive report

# Development
npm run dev              # Start development server
npm run build            # Build for production
```

## Login Credentials

### Admin Account
- **Username**: `admin`
- **Password**: `admin123`
- **Permissions**: Full system access

### Employee Account
- **Username**: `employee1`
- **Password**: `emp123`
- **Permissions**: Sales operations only

## Turso Database Issue & Solutions

### Current Problem
The Turso database at `libsql://sales-system-suralism.aws-ap-northeast-1.turso.io` returns:
```
Error: Unexpected status code while fetching migration jobs: 400
```

### Possible Causes
1. **Database not properly initialized** on Turso platform
2. **Authentication token expired** or insufficient permissions
3. **Database in migration state** preventing new operations
4. **Schema conflicts** with existing structure

### Solution Options

#### Option 1: Verify Turso Database Status
1. Log into your Turso dashboard
2. Check if database `sales-system-suralism` exists and is active
3. Verify the database URL and token are correct
4. Check for any pending migrations or errors

#### Option 2: Recreate Turso Database
1. Delete the existing database in Turso dashboard
2. Create a new database with same name
3. Generate new authentication token
4. Update `.env.local` with new credentials
5. Run migration again

#### Option 3: Generate New Token
```bash
# If you have Turso CLI installed
turso auth login
turso db tokens create sales-system-suralism
```

#### Option 4: Use Local Development Setup
The current local SQLite setup is fully functional:
```env
# Use local SQLite (current working setup)
TURSO_DATABASE_URL=file:./database.db
TURSO_AUTH_TOKEN=dummy
```

## Switching Between Databases

### To Use Local SQLite (Current Setup)
```env
TURSO_DATABASE_URL=file:./database.db
TURSO_AUTH_TOKEN=dummy
```

### To Use Turso Cloud (When Fixed)
```env
TURSO_DATABASE_URL=libsql://sales-system-suralism.aws-ap-northeast-1.turso.io
TURSO_AUTH_TOKEN=your_actual_token_here
```

## Development Workflow

1. **Start Development**:
   ```bash
   npm run dev
   ```

2. **Access Application**:
   - Open http://localhost:3000
   - Login with admin credentials

3. **Test Features**:
   - Dashboard navigation
   - Product management
   - Sales recording
   - User management

## Database Schema Export

To export the current working schema for Turso setup:

```sql
-- All table creation statements are available in:
-- scripts/migrate.ts (lines 31-244)

-- Or use SQLite dump:
sqlite3 database.db .dump > schema.sql
```

## Next Steps

1. ✅ **Immediate**: Continue development with local SQLite
2. 🔧 **Short-term**: Investigate and fix Turso connection
3. 🚀 **Long-term**: Migrate to Turso for production deployment

The system is fully functional with local SQLite and ready for development and testing.