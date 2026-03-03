# Environment Variables - Complete Reference

## 📋 Summary

This document lists **ALL** environment variables used in the MVP Web platform, categorized by:
- **Required** vs **Optional**
- **Development** vs **Production**
- **Frontend** vs **Backend**

---

## 🔴 Required Variables (Must Have)

### Backend (server/.env)

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `DATABASE_URL` | String | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | String | Secret for JWT token signing (64+ chars) | `[generated hex string]` |
| `APP_URL` | String | Base URL for email verification links | `http://localhost:3000` |

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 🟡 Optional Variables (Recommended)

### Backend (server/.env)

| Variable | Type | Description | Default | Required For |
|----------|------|-------------|---------|--------------|
| `SENDGRID_API_KEY` | String | SendGrid API key for emails | - | Email verification |
| `SENDGRID_FROM_EMAIL` | String | Verified sender email | - | Email verification |
| `PORT` | Number | Server port | `3001` | Backend server |
| `NODE_ENV` | String | Environment mode | `development` | Runtime behavior |
| `DB_HOST` | String | Database host (if not using DATABASE_URL) | - | Database connection |
| `DB_PORT` | Number | Database port (if not using DATABASE_URL) | `5432` | Database connection |
| `DB_NAME` | String | Database name (if not using DATABASE_URL) | - | Database connection |
| `DB_USER` | String | Database user (if not using DATABASE_URL) | - | Database connection |
| `DB_PASSWORD` | String | Database password (if not using DATABASE_URL) | - | Database connection |

### Frontend (client/.env - Optional)

| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `VITE_API_URL` | String | Custom API endpoint URL | `/api` |

**Note**: Frontend uses `/api` by default, which works with:
- Local development: Vite proxy routes to `http://localhost:3001`
- Production: Vercel rewrite routes to serverless function

---

## 📝 Complete .env Template

### Development (server/.env)

```env
# ============================================================================
# DATABASE CONFIGURATION (REQUIRED)
# ============================================================================
# Option 1: Connection string (recommended)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mvp_ganaderia

# Option 2: Individual parameters (alternative)
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=mvp_ganaderia
# DB_USER=postgres
# DB_PASSWORD=postgres

# ============================================================================
# JWT AUTHENTICATION (REQUIRED)
# ============================================================================
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your-generated-64-character-hex-string-here

# ============================================================================
# APPLICATION URL (REQUIRED)
# ============================================================================
APP_URL=http://localhost:3000

# ============================================================================
# EMAIL SERVICE (OPTIONAL - Required for email verification)
# ============================================================================
# Get from: https://app.sendgrid.com/settings/api_keys
SENDGRID_API_KEY=SG.your-sendgrid-api-key-here

# Verified sender email from SendGrid dashboard
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# ============================================================================
# SERVER CONFIGURATION
# ============================================================================
PORT=3001
NODE_ENV=development
```

### Production (Vercel Environment Variables)

```env
# ============================================================================
# DATABASE CONFIGURATION (REQUIRED)
# ============================================================================
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require

# ============================================================================
# JWT AUTHENTICATION (REQUIRED)
# ============================================================================
JWT_SECRET=your-production-jwt-secret-64-chars-minimum

# ============================================================================
# APPLICATION URL (REQUIRED)
# ============================================================================
APP_URL=https://your-project.vercel.app

# ============================================================================
# EMAIL SERVICE (OPTIONAL but recommended)
# ============================================================================
SENDGRID_API_KEY=SG.your-production-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# ============================================================================
# SERVER CONFIGURATION
# ============================================================================
NODE_ENV=production
```

---

## 🔍 Where Variables Are Used

### Backend Usage

| Variable | Used In | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `server/db/pool.js` | Database connection |
| `JWT_SECRET` | `server/middleware/auth.js` | Token signing/verification |
| `APP_URL` | `server/services/emailService.js` | Email verification links |
| `SENDGRID_API_KEY` | `server/services/emailService.js` | SendGrid authentication |
| `SENDGRID_FROM_EMAIL` | `server/services/emailService.js` | Email sender address |
| `PORT` | `server/index.js` | Server port |
| `NODE_ENV` | Multiple files | Environment detection |

### Frontend Usage

| Variable | Used In | Purpose |
|----------|---------|---------|
| `VITE_API_URL` | `client/src/utils/api.js` | API base URL |

---

## 🎯 Quick Setup Guide

### For Local Development

1. **Minimum setup** (without email):
   ```env
   DATABASE_URL=postgresql://user:pass@host:5432/db
   JWT_SECRET=[generated-secret]
   APP_URL=http://localhost:3000
   PORT=3001
   NODE_ENV=development
   ```

2. **Full setup** (with email):
   ```env
   DATABASE_URL=postgresql://user:pass@host:5432/db
   JWT_SECRET=[generated-secret]
   APP_URL=http://localhost:3000
   SENDGRID_API_KEY=SG.xxx
   SENDGRID_FROM_EMAIL=noreply@domain.com
   PORT=3001
   NODE_ENV=development
   ```

### For Production (Vercel)

Set these in Vercel Dashboard → Project Settings → Environment Variables:

1. **Required:**
   - `DATABASE_URL` (from Supabase)
   - `JWT_SECRET` (generate new one)
   - `APP_URL` (your Vercel URL)
   - `NODE_ENV=production`

2. **Optional:**
   - `SENDGRID_API_KEY`
   - `SENDGRID_FROM_EMAIL`

---

## 🔐 Security Notes

1. **Never commit `.env` files** to Git
2. **Use different JWT_SECRET** for development and production
3. **Keep DATABASE_URL secure** - contains credentials
4. **Rotate secrets** periodically in production
5. **Use strong JWT_SECRET** (64+ characters recommended)

---

## ✅ Verification Checklist

Before deployment, verify:

- [ ] All required variables are set
- [ ] `DATABASE_URL` is correct and accessible
- [ ] `JWT_SECRET` is strong and unique
- [ ] `APP_URL` matches your deployment URL
- [ ] Email service configured (if using email verification)
- [ ] Production variables are different from development
- [ ] No sensitive data in code or logs

---

## 📞 Need Help?

- Check `server/.env.example` for detailed comments
- Review `LOCAL_TESTING_GUIDE.md` for setup instructions
- See `README.md` for full documentation
