# MVP Web - Livestock Production Intelligence Platform

**MetaCaprine Scientific Intelligence System**

A comprehensive web platform for livestock (goat/dairy) production management, simulation, and decision-making with scientific breed comparison capabilities.

---

## ðŸ“‹ Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Module Documentation](#module-documentation)
- [Email Verification Setup](#email-verification-setup)
- [Deployment](#deployment)
- [Project Transfer Information](#project-transfer-information)
- [Troubleshooting](#troubleshooting)

---

## ðŸŽ¯ Overview

MVP Web is a full-stack web application that helps livestock producers make data-driven decisions through:

- **Multi-scenario simulation** - Create and compare different production scenarios
- **Scientific breed intelligence** - Compare breeds using Energy Corrected Milk (ECM) calculations
- **Transformation analysis** - Analyze profitability of direct sales vs. dairy transformation
- **Cost calculators** - 5 integrated calculators for production planning
- **Reproductive management** - Gestation simulator and calendar
- **Multi-language support** - English and Spanish
- **User authentication** - Email verification and secure login

---

## âœ¨ Features

### Module 1: Production & Direct Sales
- Daily production tracking
- Cost analysis (feed, labor, health, infrastructure)
- Revenue and margin calculations
- Per-liter profitability metrics

### Module 2: Dairy Transformation
- Product mix support (multiple products per scenario)
- 3 sales channels: Direct, Distributors, Third/Mixed
- Processing and packaging cost tracking
- Profitability comparison: Direct sales vs. Transformation
- Per-product margin analysis

### Module 3: Scientific Breed Intelligence â­
**INDEPENDENT MODULE** - Does not depend on Modules 1 or 2

- **27 goat breeds** with scientific data
- **ECM (Energy Corrected Milk) calculations** - Lifetime production comparison
- **Automatic ranking** by breed performance
- **A vs B comparison** - Side-by-side breed analysis
- **Herd scenarios** - Compare different herd sizes and breeds
- **Parameter overrides** - Customize breed characteristics
- **Visual comparisons** - Charts showing:
  - Lactation curves (cumulative ECM over lifetime)
  - Fat and protein production
  - Productive life comparisons
  - Ranking visualizations

**Key Insight**: Module 3 demonstrates why lifetime production (ECM) matters more than single percentages. For example: Saanen produces more total protein kg than Nubian despite lower protein %, due to higher volume and longevity.

### Module 4: Cost Calculators
5 integrated calculators:
1. Feed cost calculator
2. Labor cost calculator
3. Health cost calculator
4. Infrastructure cost calculator
5. Total cost summary

### Module 5: Reproductive Management
- Gestation simulator
- Reproductive calendar
- Birth predictions
- Breeding schedule optimization

### Additional Features
- ðŸ” **User authentication** with email verification
- ðŸŒ **Bilingual interface** (English/Spanish)
- ðŸŒ“ **Dark/Light mode** with color system
- ðŸ“Š **Interactive charts** with Recharts
- ðŸ’¾ **Scenario management** - Save, load, and compare scenarios
- ðŸ“± **Responsive design** - Works on desktop, tablet, and mobile

---

## ðŸ›  Technology Stack

### Frontend
- **React 18** - UI framework
- **React Router** - Navigation
- **Recharts** - Data visualization
- **Vite** - Build tool and dev server
- **CSS3** - Styling with CSS variables for theming

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **Resend** - Email service (for verification)

### Deployment
- **Vercel** - Frontend and serverless API hosting
- **PostgreSQL** - Database (Vercel Postgres, Supabase, or self-hosted)

---

## ðŸ“ Project Structure

```
MVP Web/
â”œâ”€â”€ client/                    # Frontend React application
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ components/       # React components
â”‚   â”‚   â”‚   â”œâ”€â”€ modules/     # Module components (Module1-5)
â”‚   â”‚   â”‚   â”œâ”€â”€ Dashboard.jsx
â”‚   â”‚   â”‚   â”œâ”€â”€ Login.jsx
â”‚   â”‚   â”‚   â”œâ”€â”€ Profile.jsx
â”‚   â”‚   â”‚   â””â”€â”€ ...
â”‚   â”‚   â”œâ”€â”€ hooks/           # Custom React hooks
â”‚   â”‚   â”œâ”€â”€ i18n/            # Internationalization
â”‚   â”‚   â”œâ”€â”€ styles/          # CSS files
â”‚   â”‚   â”œâ”€â”€ utils/           # Utility functions
â”‚   â”‚   â”œâ”€â”€ App.jsx          # Main app component
â”‚   â”‚   â””â”€â”€ main.jsx         # Entry point
â”‚   â”œâ”€â”€ public/              # Static assets
â”‚   â”‚   â””â”€â”€ breeds/          # Breed images
â”‚   â”œâ”€â”€ package.json
â”‚   â””â”€â”€ vite.config.js
â”‚
â”œâ”€â”€ server/                   # Backend Node.js application
â”‚   â”œâ”€â”€ core/                # Business logic engines
â”‚   â”‚   â”œâ”€â”€ module3Engine.js # ECM calculation engine
â”‚   â”‚   â”œâ”€â”€ lactationEngine.js
â”‚   â”‚   â””â”€â”€ simulationEngine.js
â”‚   â”œâ”€â”€ db/                  # Database files
â”‚   â”‚   â”œâ”€â”€ complete_migration.sql  # Single consolidated migration
â”‚   â”‚   â”œâ”€â”€ schema.sql       # Original schema (reference)
â”‚   â”‚   â””â”€â”€ pool.js          # Database connection pool
â”‚   â”œâ”€â”€ middleware/          # Express middleware
â”‚   â”‚   â”œâ”€â”€ auth.js          # JWT authentication
â”‚   â”‚   â””â”€â”€ requireEmailVerification.js
â”‚   â”œâ”€â”€ routes/              # API routes
â”‚   â”‚   â”œâ”€â”€ auth.js          # Authentication endpoints
â”‚   â”‚   â”œâ”€â”€ module3.js       # Module 3 API
â”‚   â”‚   â”œâ”€â”€ breeds.js        # Breed data endpoints
â”‚   â”‚   â”œâ”€â”€ modules.js       # General module endpoints
â”‚   â”‚   â””â”€â”€ scenarios.js     # Scenario management
â”‚   â”œâ”€â”€ services/            # External services
â”‚   â”‚   â””â”€â”€ emailService.js  # Resend email service
â”‚   â”œâ”€â”€ index.js             # Server entry point
â”‚   â”œâ”€â”€ package.json
â”‚   â””â”€â”€ metacaprine_module3_breed_reference_ranked_ecm.json
â”‚
â”œâ”€â”€ api/                     # Vercel serverless functions
â”‚   â””â”€â”€ index.js             # Serverless API handler
â”‚
â”œâ”€â”€ setup.js                 # Automated setup script
â”œâ”€â”€ package.json             # Root package.json
â”œâ”€â”€ vercel.json              # Vercel deployment config
â””â”€â”€ README.md                # This file
```

---

## ðŸš€ Installation & Setup

### Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** 14+ database
- **Git** (for cloning the repository)

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd "MVP Web"
```

### Step 2: Install Dependencies

Install both server and client dependencies:

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install

cd ..
```

### Step 3: Environment Configuration

Create a `.env` file in the `server` directory:

```bash
cd server
cp .env.example .env
# Edit .env with your configuration
```

**Note**: A comprehensive `.env.example` file is provided with all required variables and detailed comments. Copy it to `.env` and fill in your actual values.

See [Environment Variables](#environment-variables) section for details.

### Step 4: Database Setup

Run the automated setup script from the root directory:

```bash
node setup.js
```

This script will:
1. Check database connection
2. Run the complete migration
3. Seed breed reference data (27 breeds)
4. Verify the setup

**Manual setup** (if you prefer):

```bash
# Run migration
psql $DATABASE_URL -f server/db/complete_migration.sql

# The setup script handles breed seeding automatically
# Or seed breeds manually using the setup.js logic
```

### Step 5: Run the Application

Open **two terminal windows**:

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
# Server runs on http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
# Client runs on http://localhost:3000
```

Open http://localhost:3000 in your browser.

---

## ðŸ”‘ Environment Variables

### Server Environment Variables

Create `server/.env` by copying `server/.env.example`:

```bash
cd server
cp .env.example .env
# Edit .env with your actual values
```

**Required variables**:

```env
# Database Configuration (REQUIRED)
DATABASE_URL=postgresql://user:password@host:port/database

# JWT Secret (REQUIRED - generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=your-secure-jwt-secret-here

# Application URL (REQUIRED - for email verification links)
APP_URL=http://localhost:3000

# Email Service (OPTIONAL - Required for email verification)
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Server Configuration
PORT=3001
NODE_ENV=development
```

**See `server/.env.example` for detailed documentation of all variables.**

### Frontend Environment Variables (Optional)

The frontend can optionally use `VITE_API_URL` to specify a custom API endpoint. If not set, it defaults to `/api` which works with the Vercel rewrite configuration.

For local development, the Vite proxy handles `/api` requests automatically.

For production on Vercel, the `vercel.json` configuration routes `/api/*` to the serverless function, so no `VITE_API_URL` is needed unless you're using a separate API domain.

### Production Environment Variables

For production deployment (Vercel, etc.):

```env
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
JWT_SECRET=your-production-jwt-secret
APP_URL=https://your-domain.vercel.app
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
NODE_ENV=production
```

---

## ðŸ—„ Database Setup

### Database Schema

The application uses a PostgreSQL database with the following main tables:

- `users` - User accounts with email verification
- `scenarios` - User scenarios (simulations)
- `production_data` - Module 1 data
- `transformation_data` - Module 2 single product data
- `transformation_products` - Module 2 product mix data
- `breed_reference` - Module 3 scientific breed data (MASTER TABLE)
- `breed_scenarios` - Module 3 user simulations
- `lactation_data` - Legacy lactation data
- `results` - Calculated results

### Migration Files

All migrations have been consolidated into a single file:
- `server/db/complete_migration.sql` - Complete database schema

### Seeding Data

Breed reference data is automatically seeded by `setup.js` from:
- `server/metacaprine_module3_breed_reference_ranked_ecm.json` (27 breeds)

If you need Supabase-compatible import files instead of a direct DB seed, run:

```powershell
npm run export:breed-reference-seed
```

This generates normalized `breed_reference` seed artifacts in `server/db/`.
---

## ðŸƒ Running the Application

### Development Mode

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

### Production Build

```bash
# Build client
cd client
npm run build

# The dist/ folder contains the production build

# Start production server
cd ../server
npm start
```

---

## ðŸ“š Module Documentation

### Module 1: Production & Direct Sales

**Purpose**: Calculate profitability of direct milk sales

**Inputs**:
- Daily production (liters)
- Production days
- Number of animals
- Costs per liter (feed, labor, health, infrastructure, other)
- Milk price per liter

**Outputs**:
- Total production
- Total revenue
- Total costs
- Gross margin
- Margin percentage
- Revenue and cost per liter

### Module 2: Dairy Transformation

**Purpose**: Analyze profitability of transforming milk into dairy products

**Key Features**:
- Product mix support (multiple products per scenario)
- 3 sales channels per product
- Processing and packaging costs
- Comparison with direct milk sales

**Inputs**:
- Product type (cheese, yogurt, etc.)
- Conversion rate (liters per kg)
- Processing cost per liter
- Packaging cost per kg
- Distribution percentages across channels
- Prices per sales channel

**Outputs**:
- Total product weight
- Revenue by channel
- Weighted average price
- Total costs (production + processing + packaging)
- Gross margin
- Comparison: Transformation vs. Direct sales

### Module 3: Scientific Breed Intelligence

**Purpose**: Compare goat breeds using scientific ECM (Energy Corrected Milk) calculations

**IMPORTANT**: Module 3 is **INDEPENDENT** - it does not depend on Modules 1 or 2. It uses the `breed_reference` master table.

**Key Concepts**:
- **ECM (Energy Corrected Milk)**: A standardized measure accounting for fat and protein content
- **Formula**: ECM(kg) = Milk(kg) Ã— (0.327 + 0.122Ã—Fat% + 0.077Ã—Protein%)
- **Lifetime production**: ECM Ã— Lactations per lifetime
- **Why it matters**: A breed with lower percentages but higher volume and longevity can produce more total nutrients

**Features**:
1. **Ranking View**: All 27 breeds ranked by lifetime ECM
2. **Single Breed View**: Detailed analysis of one breed
3. **A vs B Comparison**: Side-by-side breed comparison with delta analysis

**Data Source**:
- 27 goat breeds with scientific data
- Sources: ADGA, DHI, USDA, ICAR, FAO, university research
- All calculations in kg (liters shown as approximation: kg/1.03)

**User Capabilities**:
- Override any breed parameter
- Simulate different herd sizes
- Compare scenarios (e.g., 2000 MalagueÃ±a vs. 700 LaMancha)
- Save and load simulations

**Example Use Case**:
```
Compare: Nubian vs. Saanen

Nubian:
  - Protein: 3.52%
  - Lactations: 4.5
  - Lifetime ECM: ~3,456 kg
  - Lifetime protein: ~143 kg

Saanen:
  - Protein: 3.06% (LOWER %)
  - Lactations: 5.0 (MORE lactations)
  - Lifetime ECM: ~5,459 kg
  - Lifetime protein: ~181 kg (MORE total kg)

Winner: Saanen produces 27% more total protein despite lower percentage!
```

### Module 4: Cost Calculators

5 integrated calculators for cost estimation:

1. **Feed Cost Calculator**
2. **Labor Cost Calculator**
3. **Health Cost Calculator**
4. **Infrastructure Cost Calculator**
5. **Total Cost Summary**

### Module 5: Reproductive Management

- Gestation simulator
- Reproductive calendar
- Birth date predictions
- Breeding schedule optimization

---

## ðŸ“§ Email Verification Setup

The application includes email verification for user registration.

### Resend Setup (Recommended for Production)

1. **Create Resend Account**
   - Go to https://resend.com
   - Sign up for a free account (100 emails/day)

2. **Create API Key**
   - Navigate to Settings â†’ API Keys
   - Click "Create API Key"
   - Choose "Restricted Access"
   - Grant "Mail Send" permissions
   - Copy the API key (you won't see it again!)

3. **Verify Sender Email**
   - Navigate to Settings â†’ Sender Authentication
   - Click "Verify a Single Sender"
   - Enter your email (e.g., noreply@yourdomain.com)
   - Check your email and verify

4. **Configure Environment Variables**
   ```env
   RESEND_API_KEY=re_your_resend_api_key
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   APP_URL=http://localhost:3000  # or your production URL
   ```

### Email Verification Flow

1. User registers with email/password
2. System generates verification token (expires in 24 hours)
3. Verification email sent via Resend
4. User clicks link â†’ email verified
5. User can now login and access all features

### Development Without Email

For local development, you can:
- Skip email verification by manually setting `email_verified = true` in database
- Or use a console log to get the verification token from server logs

---

## ðŸš€ Deployment

### Deploying to Vercel

This application is configured for Vercel deployment with serverless API.

#### Prerequisites
- Vercel account
- PostgreSQL database (Vercel Postgres, Supabase, or other)
- Resend account (for email verification)

#### Steps

1. **Prepare Database**
   - Create PostgreSQL database
   - Run `setup.js` to initialize schema and data
   - Get connection string

2. **Install Vercel CLI** (optional)
   ```bash
   npm install -g vercel
   ```

3. **Configure Environment Variables in Vercel**
   - Go to Vercel Dashboard â†’ Project Settings â†’ Environment Variables
   - Add all **server** environment variables from the [Environment Variables](#environment-variables) section:
     - `DATABASE_URL` (required)
     - `JWT_SECRET` (required)
     - `APP_URL` (required - your Vercel deployment URL)
     - `RESEND_API_KEY` (optional but recommended)
     - `RESEND_FROM_EMAIL` (optional but recommended)
     - `NODE_ENV=production`
   - **Note**: The `vercel.json` file is already configured with proper API routing, so API requests will work automatically.

4. **Deploy**
   ```bash
   # Option 1: Using Vercel CLI
   vercel

   # Option 2: Push to GitHub and connect to Vercel
   # Vercel will automatically deploy on push
   ```

5. **Verify Deployment**
   - Check Vercel deployment logs
   - Test API endpoints
   - Register a test user
   - Verify email verification works

### Database Hosting Options

1. **Vercel Postgres** - Integrated with Vercel
2. **Supabase** - Free PostgreSQL hosting
3. **Railway** - Easy PostgreSQL hosting
4. **AWS RDS** - Production-grade PostgreSQL
5. **Self-hosted** - Your own PostgreSQL server

---

## ðŸ”„ Project Transfer Information

### Source Code Delivery

This project is delivered with complete source code and all necessary files for independent development.

**Included**:
- âœ… Complete frontend source code (client/)
- âœ… Complete backend source code (server/)
- âœ… Database schema and migration files
- âœ… Breed reference data (27 breeds)
- âœ… Deployment configuration
- âœ… Comprehensive documentation

### Database Export

**Structure**: All database schema is in `server/db/complete_migration.sql`

**Data**: 
- Breed reference data: `server/metacaprine_module3_breed_reference_ranked_ecm.json`
- User data and scenarios: Can be exported with standard PostgreSQL tools

**Export User Data** (if needed):
```bash
pg_dump $DATABASE_URL > database_backup.sql
```

### Transferring from Developer Accounts

#### Vercel Transfer
1. Go to Vercel Dashboard â†’ Project Settings â†’ General
2. Click "Transfer Project"
3. Enter the new owner's Vercel account email
4. New owner accepts the transfer

#### Database Transfer
- Export data: `pg_dump $DATABASE_URL > backup.sql`
- Import to new database: `psql $NEW_DATABASE_URL < backup.sql`
- Update `DATABASE_URL` in Vercel environment variables

#### Resend Transfer
- Create new Resend account
- Create new API key
- Verify new sender email
- Update `RESEND_API_KEY` in Vercel environment variables

### Running Independently

After transfer, the client can:
1. Run the application locally (see [Installation](#installation--setup))
2. Deploy to their own Vercel account
3. Use their own database
4. Continue development with other developers
5. Modify and extend any feature

**No dependencies on developer accounts** after transfer.

---

## ðŸ› Troubleshooting

### Database Connection Issues

**Problem**: "Database connection failed"

**Solutions**:
- Check `DATABASE_URL` in `.env`
- Verify PostgreSQL is running
- Test connection: `psql $DATABASE_URL`
- For SSL issues, add `?sslmode=require` to connection string

### Email Verification Not Working

**Problem**: Verification emails not sent

**Solutions**:
- Check `RESEND_API_KEY` is set correctly
- Verify sender email in Resend dashboard
- Check Resend Activity for delivery status
- Check server logs for error messages

### Module 3 Data Missing

**Problem**: No breeds showing in Module 3

**Solutions**:
- Run `node setup.js` to seed breed data
- Check that `breed_reference` table exists
- Verify breed data file exists: `server/metacaprine_module3_breed_reference_ranked_ecm.json`

### Port Already in Use

**Problem**: "Port 3000/3001 already in use"

**Solutions**:
```bash
# Find process using port
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Kill process or use different port
# Change port in vite.config.js (client) or server/index.js
```

### Build Errors

**Problem**: Build fails with dependency errors

**Solutions**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache (client)
cd client
rm -rf node_modules .vite dist
npm install
```

### API Errors in Production

**Problem**: API routes return 404 in production

**Solutions**:
- Verify `vercel.json` has the correct rewrite configuration (should route `/api/*` to `/api`)
- Check that `api/index.js` exists and exports the Express app correctly
- Verify all environment variables are set in Vercel (especially `DATABASE_URL` and `JWT_SECRET`)
- Check Vercel function logs in the Vercel dashboard
- Ensure serverless function size is within limits
- Test the `/api/health` endpoint to verify the API is accessible

---

## ðŸ“ Additional Notes

### Data Validation

- All user inputs are validated on frontend and backend
- Database constraints prevent invalid data
- ECM calculations use scientific formulas from European dairy standards

### Security

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens for authentication
- Email verification required
- SQL injection prevention with parameterized queries
- CORS configured for frontend domain

### Performance

- Database indexes on frequently queried columns
- React components optimized with proper state management
- Lazy loading for routes
- Chart rendering optimized with Recharts

### Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

---

## ðŸ“ž Support

For technical issues or questions after project transfer:

1. **Check this README** first
2. **Review code comments** in source files
3. **Check browser console** for frontend errors
4. **Check server logs** for backend errors
5. **Database issues**: Review `complete_migration.sql`

---

## ðŸ“„ License

This project is delivered as proprietary software to the client with full source code ownership and rights to modify, extend, and redistribute as they see fit.

---

## ðŸŽ‰ Project Status

**Status**: âœ… **COMPLETE AND READY FOR DELIVERY**

**Delivered**:
- âœ… Module 3 visualization working correctly
- âœ… Module 3 confirmed independent from Modules 1 & 2
- âœ… Email verification functional
- âœ… All migrations consolidated
- âœ… Development files cleaned up
- âœ… Comprehensive documentation
- âœ… Setup script for easy installation
- âœ… Ready for project transfer

**Date**: February 4, 2026

---

**Thank you for using MVP Web!** ðŸš€




