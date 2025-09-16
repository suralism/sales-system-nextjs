# Railway Deployment Checklist

## ✅ Fixed Issues
- [x] TypeScript compilation errors resolved
- [x] Added railway.json configuration
- [x] Added Node.js engine specification
- [x] Build completes successfully

## 🚀 Railway Deployment Steps

### 1. Environment Variables (Required)
Set these in your Railway project settings:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sales_system
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
NEXTAUTH_URL=https://your-railway-app-name.railway.app
NODE_ENV=production
```

### 2. MongoDB Database
- Use MongoDB Atlas (recommended) or Railway MongoDB plugin
- Make sure your IP is whitelisted in MongoDB Atlas
- Test connection string locally first

### 3. Railway Configuration
- ✅ `railway.json` file created
- ✅ `package.json` engines specified
- ✅ Build and start commands configured

### 4. Common Railway Deployment Issues

#### Error: "Module not found" during build
- **Solution**: Run `npm install` locally and commit `package-lock.json`

#### Error: "Port already in use"
- **Solution**: Railway automatically sets PORT environment variable, our start script handles this

#### Error: "Cannot connect to MongoDB"
- **Solution**: Check MONGODB_URI environment variable
- Verify MongoDB Atlas network access settings

#### Error: "JWT error" or authentication issues
- **Solution**: Set proper JWT_SECRET environment variable (minimum 32 characters)
- Set correct NEXTAUTH_URL with your Railway domain

#### Error: Build timeout
- **Solution**: Railway has build time limits, your project should build in ~2-3 minutes

### 5. Post-Deployment Steps
1. Test login with default credentials (change after deployment):
   - Admin: admin / admin123
   - Employee: employee1 / emp123

2. Run seed script if needed:
   ```bash
   railway run npm run seed
   ```

3. Check logs:
   ```bash
   railway logs
   ```

### 6. Deployment Commands

#### Using Railway CLI:
```bash
# Login to Railway
railway login

# Link to existing project or create new
railway link

# Deploy
railway up
```

#### Using Git:
1. Connect your GitHub repository to Railway
2. Push changes to trigger automatic deployment

## 🔧 Troubleshooting

### Build Fails
- Check Railway build logs
- Verify all dependencies are in package.json
- Ensure TypeScript compiles locally

### App Crashes on Start
- Check environment variables are set
- Verify MongoDB connection
- Check Railway app logs

### Database Connection Issues
- Test MongoDB URI locally
- Check MongoDB Atlas IP whitelist
- Verify database name and credentials

## 📝 Notes
- The Mongoose warnings are cosmetic and don't affect deployment
- metadataBase warning is also cosmetic for this project
- Your app uses dynamic routes so most pages are server-rendered