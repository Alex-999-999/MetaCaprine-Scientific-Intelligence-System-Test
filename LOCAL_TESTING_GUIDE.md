# Local Testing Guide - MVP Web Platform

## 📋 Prerequisites Checklist

Before starting, ensure you have:
- [ ] **Node.js 18+** installed (check with: `node --version`)
- [ ] **npm** installed (check with: `npm --version`)
- [ ] **PostgreSQL database** (local or remote)
  - Option A: Local PostgreSQL installed
  - Option B: Supabase account (free tier works)
  - Option C: Any PostgreSQL hosting service

---

## 🔧 Step-by-Step Local Setup

### Step 1: Install All Dependencies

```powershell
# From project root directory
npm run install:all
```

This will install:
- Root dependencies (pg, dotenv, concurrently)
- Server dependencies (express, cors, pg, bcryptjs, jsonwebtoken, etc.)
- Client dependencies (react, vite, recharts, etc.)

**Expected output**: All packages installed without errors

---

### Step 2: Create Environment File

Create `server/.env` file (copy from `.env.example` or create manually):

```powershell
# Copy the example file
Copy-Item "server\.env.example" "server\.env"
```

**Minimum required variables for local testing:**

```env
# REQUIRED - Database connection
DATABASE_URL=postgresql://user:password@host:port/database

# REQUIRED - JWT secret (generate one)
JWT_SECRET=your-secure-jwt-secret-here

# REQUIRED - Application URL
APP_URL=http://localhost:3000

# OPTIONAL - Email service (can skip for local testing)
# SENDGRID_API_KEY=
# SENDGRID_FROM_EMAIL=

# Server configuration
PORT=3001
NODE_ENV=development
```

**Generate JWT_SECRET:**
```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

### Step 3: Set Up Database

#### Option A: Using Local PostgreSQL

1. Create a database:
```sql
CREATE DATABASE mvp_ganaderia;
```

2. Update `server/.env`:
```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/mvp_ganaderia
```

#### Option B: Using Supabase (Recommended for Testing)

1. Go to https://supabase.com
2. Create a new project
3. Go to Settings → Database
4. Copy the connection string (URI format)
5. Update `server/.env` with the connection string

**Note**: Supabase connection string format:
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

---

### Step 4: Initialize Database

Run the setup script to create tables and seed data:

```powershell
node setup.js
```

**Expected output:**
```
============================================================================
MVP Web - Complete Setup Script
============================================================================

📡 Checking database connection...
✅ Database connection successful
   Server time: [timestamp]

📦 Running database migration...
✅ Database migration completed successfully

🌱 Seeding breed reference data...
   Found 27 breeds to import
✅ Breed data seeded successfully
   Imported: 27 breeds

🔍 Verifying setup...
   ✅ 7 core tables verified
   ✅ 27 breeds in database
   ℹ️  0 users in database

✅ Setup verification complete!

🎉 Setup completed successfully!
```

**If you see errors:**
- Check `DATABASE_URL` in `server/.env` is correct
- Verify database is accessible
- Check PostgreSQL is running (if local)

---

### Step 5: Test Compilation

#### Test Backend Compilation

```powershell
cd server
npm run build
# Or just check if it starts
npm run dev
# Press Ctrl+C to stop
```

**Expected**: Server starts on `http://localhost:3001` without errors

#### Test Frontend Compilation

```powershell
cd client
npm run build
```

**Expected**: Build completes successfully, creates `client/dist/` folder

---

### Step 6: Run Application Locally

Open **two terminal windows**:

**Terminal 1 - Backend:**
```powershell
cd server
npm run dev
```

**Expected output:**
```
Server running on http://localhost:3001
```

**Terminal 2 - Frontend:**
```powershell
cd client
npm run dev
```

**Expected output:**
```
  VITE v5.0.8  ready in [time] ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

---

### Step 7: Test Application

1. **Open browser**: http://localhost:3000

2. **Test Authentication:**
   - Register a new user
   - Check email verification (or manually verify in database)
   - Login

3. **Test Modules:**
   - Module 1: Create a production scenario
   - Module 2: Create a transformation scenario
   - Module 3: View breed rankings and comparisons
   - Module 4: Use cost calculators
   - Module 5: Test gestation simulator

4. **Check Browser Console:**
   - Open DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for failed API calls

---

## 📊 Environment Variables Summary

### Required Variables (Minimum for Local Testing)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret for JWT token signing | `[64-char hex string]` |
| `APP_URL` | Base URL for email links | `http://localhost:3000` |

### Optional Variables (For Full Functionality)

| Variable | Description | Required For |
|----------|-------------|--------------|
| `SENDGRID_API_KEY` | SendGrid API key | Email verification |
| `SENDGRID_FROM_EMAIL` | Verified sender email | Email verification |
| `PORT` | Server port | Backend (default: 3001) |
| `NODE_ENV` | Environment | `development` or `production` |

### Frontend Variables (Optional)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Custom API endpoint | `/api` (uses proxy) |

---

## 🏗️ Architecture Verification

### Current Architecture

```
┌─────────────────┐
│   Frontend      │
│   React + Vite  │
│   Port: 3000    │
└────────┬────────┘
         │ HTTP/API
         │ (proxy /api → :3001)
         ▼
┌─────────────────┐
│   Backend       │
│   Node.js/Express│
│   Port: 3001    │
└────────┬────────┘
         │ PostgreSQL
         │ Connection
         ▼
┌─────────────────┐
│   Database      │
│   PostgreSQL    │
│   (Local/Supabase)│
└─────────────────┘
```

### Verification Checklist

- [ ] Frontend compiles without errors
- [ ] Backend starts without errors
- [ ] Database connection successful
- [ ] API endpoints respond (test `/api/health`)
- [ ] Frontend can communicate with backend
- [ ] Authentication flow works
- [ ] All 5 modules load correctly

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'pg'"
**Solution**: Run `npm run install:all` from root directory

### Issue: "Database connection failed"
**Solution**: 
- Check `DATABASE_URL` format
- Verify database is accessible
- Test connection: `psql $DATABASE_URL`

### Issue: "Port 3000/3001 already in use"
**Solution**: 
- Find process: `netstat -ano | findstr :3000`
- Kill process or change port in config

### Issue: "Module not rendering"
**Solution**:
- Check browser console for errors
- Verify API endpoints are responding
- Check Network tab for failed requests
- Verify database has required data (breeds for Module 3)

---

## ✅ Success Criteria

Your local setup is successful when:

1. ✅ All dependencies install without errors
2. ✅ Database setup completes successfully (27 breeds seeded)
3. ✅ Backend starts on port 3001
4. ✅ Frontend starts on port 3000
5. ✅ Application loads in browser
6. ✅ Can register and login
7. ✅ All 5 modules are accessible
8. ✅ No console errors in browser
9. ✅ API endpoints respond correctly

---

## 📝 Next Steps After Local Testing

Once local testing is successful:

1. **Document any issues found**
2. **Prepare for GitHub upload**
3. **Create Vercel project**
4. **Create Supabase project**
5. **Configure production environment variables**
6. **Deploy to Vercel**

---

## 📞 Support

If you encounter issues during local testing:

1. Check this guide first
2. Review README.md for detailed documentation
3. Check browser console and server logs
4. Verify all environment variables are set correctly
