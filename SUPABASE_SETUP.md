# Supabase Database Setup Guide

## 🔍 Step 1: Get Database Connection String

The image shows your **API credentials**, but you need the **Database connection string** instead.

### How to Get Database Connection String:

1. In your Supabase dashboard, go to **Settings** → **Database**
2. Scroll down to **Connection string** section
3. Select **URI** tab (not "Session mode" or "Transaction mode")
4. Copy the connection string - it should look like:
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```

**OR** if you see **Connection pooling** section:
- Use the **Transaction** mode connection string
- Format: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`

**Important**: 
- Replace `[YOUR-PASSWORD]` with your actual database password
- The password is the one you set when creating the Supabase project
- If you forgot it, you can reset it in Settings → Database → Database password

---

## 📝 Step 2: Create server/.env File

Create a file `server/.env` with this content:

```env
# Database Configuration (from Supabase)
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# JWT Secret (generate one)
JWT_SECRET=[generate-this-see-below]

# Application URL
APP_URL=http://localhost:3000

# Server Configuration
PORT=3001
NODE_ENV=development

# Email Service (Optional - can skip for now)
# RESEND_API_KEY=
# RESEND_FROM_EMAIL=
```

### Generate JWT_SECRET:

Run this command to generate a secure JWT secret:

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and paste it as your `JWT_SECRET` value.

---

## 🗄️ Step 3: Initialize Database

Once your `.env` file is configured, run the setup script:

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

---

## ✅ Step 4: Verify Connection

After setup completes, verify everything works:

1. **Test backend connection:**
   ```powershell
   cd server
   npm run dev
   ```
   Should see: `Server running on http://localhost:3001`

2. **Test API endpoint:**
   Open browser: http://localhost:3001/api/health
   Should return: `{"status":"ok","message":"MVP Web API is running","database":"connected"}`

---

## 🔐 Security Notes

- **Never commit** `.env` file to Git
- The database password in `DATABASE_URL` is sensitive
- Keep your JWT_SECRET secure
- Use different secrets for development and production

---

## 🐛 Troubleshooting

### "Database connection failed"
- Check that `DATABASE_URL` includes your actual password
- Verify password is correct (can reset in Supabase dashboard)
- Ensure connection string uses correct format
- Try using the **Transaction** mode connection string instead

### "SSL required" error
- Supabase requires SSL connections
- The code should handle this automatically
- If issues persist, add `?sslmode=require` to connection string

### "Connection timeout"
- Check your internet connection
- Verify Supabase project is active
- Try using the direct connection string (not pooler)

---

## 📚 Next Steps

After database setup is complete:
1. Test frontend compilation
2. Run application locally
3. Test all modules
4. Prepare for deployment

See `LOCAL_TESTING_GUIDE.md` for complete testing guide.

