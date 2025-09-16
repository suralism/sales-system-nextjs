# Credit Limit Validation Implementation

## Features Implemented

### 1. Backend API Credit Checking (`/api/sales`)
- **Credit Validation**: Before processing withdrawal (`เบิก`) transactions, the API now checks if the total amount would exceed the employee's credit limit
- **Real-time Calculation**: Considers existing unsettled sales and the new withdrawal amount
- **Error Response**: Returns detailed error message with credit information when limit is exceeded

### 2. New Credit API Endpoint (`/api/users/[id]/credit`)
- **Purpose**: Provides real-time credit information for specific users
- **Security**: Role-based access (admin can view any, employees can only view their own)
- **Data**: Returns creditLimit, creditUsed, and creditRemaining

### 3. Frontend Credit Display (`/sales` page)
- **Real-time Credit Info**: Shows employee credit status when selected
- **Visual Warning**: Red warning box when withdrawal amount exceeds available credit
- **Form Validation**: Prevents form submission if credit limit would be exceeded
- **Auto-refresh**: Updates credit information after successful transactions

## How It Works

### Credit Limit Checking Flow:
1. **Employee Selection**: When an employee is selected, their credit information is fetched
2. **Real-time Calculation**: As items are added, total amount is calculated
3. **Visual Feedback**: Warning appears if total exceeds available credit
4. **Form Validation**: Submit button is disabled if credit limit would be exceeded
5. **Server Validation**: Backend double-checks credit limit before processing
6. **Error Handling**: Clear error messages inform about credit limit violations

### Credit Calculation:
- **Credit Used**: Sum of all unsettled withdrawal sales (`type: 'เบิก'`, `settled: false`)
- **Credit Remaining**: `creditLimit - creditUsed`
- **New Total Check**: `currentCreditUsed - existingPendingAmount + newWithdrawalAmount`

## User Experience

### For Employees:
- See their credit status in real-time
- Cannot submit withdrawals that exceed their limit
- Clear warning messages when approaching or exceeding limits

### For Admins:
- Can see credit status for any employee
- Same validation applies when recording withdrawals for employees
- Real-time updates after transactions

## Error Messages

### Frontend Validation:
- "เกินวงเงินเครดิต! คงเหลือ: ฿X,XXX.XX, ยอดที่ต้องการเบิก: ฿X,XXX.XX"

### Backend Validation:
- "เกินวงเงินเครดิต" with detailed breakdown of credit usage

## Technical Implementation

### Files Modified:
1. `/src/app/api/sales/route.ts` - Added credit limit validation
2. `/src/app/sales/page.tsx` - Added credit display and validation
3. `/src/app/api/users/[id]/credit/route.ts` - New credit API endpoint

### Key Functions:
- `fetchEmployeeCredit()` - Fetches real-time credit information
- `calculateCreditForUser()` - Calculates current credit usage
- `buildCreditSummary()` - Builds credit summary with limit, used, and remaining

This implementation ensures employees cannot withdraw items beyond their credit limit while providing clear feedback about their credit status.