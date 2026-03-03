# Quick Start Checklist - Local Testing

## ✅ Step-by-Step Checklist

Follow these steps in order to test the project locally:

### 1. Prerequisites
- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] PostgreSQL database available (local or Supabase)

### 2. Install Dependencies
```powershell
npm run install:all
```
- [ ] Root dependencies installed
- [ ] Server dependencies installed
- [ ] Client dependencies installed
- [ ] No errors during installation

### 3. Environment Setup
- [ ] Created `server/.env` file
- [ ] Set `DATABASE_URL` (your PostgreSQL connection string)
- [ ] Generated and set `JWT_SECRET` (run: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
- [ ] Set `APP_URL=http://localhost:3000`
- [ ] Set `PORT=3001` (optional, defaults to 3001)
- [ ] Set `NODE_ENV=development`

### 4. Database Setup
```powershell
node setup.js
```
- [ ] Database connection successful
- [ ] Migration completed
- [ ] 27 breeds seeded successfully
- [ ] Setup verification passed

### 5. Test Compilation
**Backend:**
```powershell
cd server
npm run dev
# Should start on http://localhost:3001
# Press Ctrl+C to stop
```
- [ ] Backend compiles without errors
- [ ] Server starts successfully

**Frontend:**
```powershell
cd client
npm run build
```
- [ ] Frontend compiles without errors
- [ ] Build completes successfully

### 6. Run Application
**Terminal 1 - Backend:**
```powershell
cd server
npm run dev
```
- [ ] Server running on port 3001
- [ ] No errors in terminal

**Terminal 2 - Frontend:**
```powershell
cd client
npm run dev
```
- [ ] Vite dev server running
- [ ] Accessible at http://localhost:3000

### 7. Test Application
Open browser: http://localhost:3000

- [ ] Application loads
- [ ] No console errors (F12 → Console)
- [ ] Can register a new user
- [ ] Can login (after email verification or manual DB update)
- [ ] Dashboard loads
- [ ] Module 1 accessible
- [ ] Module 2 accessible
- [ ] Module 3 accessible (breeds load)
- [ ] Module 4 accessible
- [ ] Module 5 accessible

### 8. Verify Architecture
- [ ] Frontend (React/Vite) on port 3000
- [ ] Backend (Node.js/Express) on port 3001
- [ ] Database connection working
- [ ] API endpoints responding (test: http://localhost:3001/api/health)
- [ ] Frontend can communicate with backend

---

## 📋 Required Environment Variables Summary

**Minimum for local testing:**
```env
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=[64-char-hex-string]
APP_URL=http://localhost:3000
```

**Optional (for full functionality):**
```env
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@domain.com
PORT=3001
NODE_ENV=development
```

---

## 🎯 Success Criteria

Your local testing is successful when:
- ✅ All steps above are completed
- ✅ Application runs without errors
- ✅ All 5 modules are accessible
- ✅ Database is properly initialized
- ✅ No console errors in browser

---

## 📚 Documentation

- **Detailed Guide**: See `LOCAL_TESTING_GUIDE.md`
- **Environment Variables**: See `ENVIRONMENT_VARIABLES.md`
- **Full Documentation**: See `README.md`

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| "Cannot find module 'pg'" | Run `npm run install:all` |
| "Database connection failed" | Check `DATABASE_URL` in `server/.env` |
| "Port already in use" | Change port or kill process |
| "Module not rendering" | Check browser console for errors |

---

## ✅ Ready for Next Steps

Once all checklist items are complete:
1. Document any issues found
2. Prepare code for GitHub upload
3. Create Vercel project
4. Create Supabase project
5. Configure production environment
