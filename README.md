# UNFAZED — SaaS Platform for Therapists in India

**UNFAZED** is an all-in-one SaaS practice management platform designed specifically for mental health professionals and psychotherapists in India. It enables therapists to manage their private practice end-to-end through a single branded public link (e.g. `unfazed.in/dr-ananya-sharma`), covering client acquisition, interactive scheduling, advance payments with GST-ready invoicing, clinical documentation (SOAP/DAP), real-time communication, and data-driven analytics.

---

## 🌟 Key Features & Module Capabilities

1. **Therapist Practice & Branded Link (`/:slug`)**
   - Public branded profile featuring credentials, specializations, languages, consultation fees, and cancellation policy.
   - Interactive scheduling with client timezone conversion and advance notice rules.
   - Atomic double-booking prevention at both application and database index levels.
2. **Client Intake & Auditable Consent**
   - First-time intake capture (presenting concerns, therapy history, emergency contacts).
   - Auditable digital informed consent with timestamps, agreement versioning, and client IP logging.
3. **Client CRM & Caseload Tracking**
   - Searchable, filterable client roster with tags, session counts, and last consultation date.
   - Client drawer aggregating intake history, verified consent records, clinical notes, and payment receipts.
4. **Advance Payments, Packages & GST Invoices**
   - Razorpay test mode integration with order creation, signature verification, and test sandbox modal.
   - 3, 6, and 12-session discounted packages with automated session deduction and validity tracking.
   - GST-compliant tax invoice generation with downloadable PDF receipts (SAC code 998311, CGST/SGST breakdowns).
5. **Clinical Documentation with Strict Privacy Safeguards**
   - TipTap rich text clinical editor with autosave capabilities.
   - Structured **SOAP** (Subjective, Objective, Assessment, Plan) and **DAP** (Data, Assessment, Plan) templates.
   - **Critical Privacy Boundary:** Private notes are strictly excluded from client portal endpoints at the API query and serialization level.
6. **Real-Time Communication & Notifications**
   - Real-time chat powered by Socket.io with persistent history and typing indicators.
   - In-app notification center for appointment confirmations, payment receipts, and session reminders.
   - Automated WhatsApp and Email notification stubs with delivery logs.
7. **Centralized Entitlement Service (`canAccess`)**
   - Config-driven subscription tiers (**Starter**, **Professional**, **Enterprise**).
   - Active client caps (e.g. 10 clients on Starter).
   - Clinical note template gating (SOAP/DAP restricted to Professional+).
   - Analytics depth gating (Basic vs Advanced retention cohorts).
   - In-app upgrade prompts with instant plan switching.
8. **Practice Analytics Hub**
   - High-performance server-side MongoDB aggregation pipelines.
   - Monthly revenue trends, attendance breakdown, and no-show rate tracking.

---

## 🏗️ Architecture & Technology Stack

```text
Clients & Therapists
        │
     HTTPS
        │
React Frontend (Vite)
  ├── Public Branded Link & Booking (/:slug)
  ├── Therapist Dashboard (/dashboard)
  └── Client Sanctuary Portal (/portal)
        │
  REST API + Socket.io
        │
Node.js + Express Backend
  ├── Centralized Entitlement Engine (canAccess)
  ├── Multi-Tenant Isolation Middleware
  ├── Razorpay Gateway Service
  ├── PDFKit GST Invoice Engine
  └── MongoDB (Mongoose) with Embedded Fallback
```

- **Frontend**: React 18, Vite, Lucide Icons, TipTap Rich Text Editor, Canvas Confetti, Date-fns.
- **Backend**: Node.js, Express, Mongoose, Socket.io, PDFKit, Razorpay SDK, Bcryptjs, JWT, Helmet, Express-Rate-Limit.
- **Database**: Flexible hybrid connector — connects to `MONGODB_URI` if provided (e.g. MongoDB Atlas or local MongoDB service), and automatically spins up a zero-config embedded `MongoMemoryServer` if no external database is configured.

---

## 🚀 Step-by-Step Local Setup Guide

### Prerequisites
- **Node.js**: v18 or higher (Node v20+ recommended)
- **npm**: v9 or higher

> [!TIP]
> **No Database Installation Required!**
> If you don't have MongoDB installed locally, the platform will automatically run an embedded in-memory MongoDB instance out-of-the-box.

---

### Step 1: Clone or Navigate to the Project Directory
```powershell
cd "c:\Users\hp\Desktop\major project"
```

---

### Step 2: Install Dependencies
Install dependencies across the root, backend, and frontend with a single command:
```powershell
npm run install:all
```
*(Alternatively, run `npm install` inside `backend/` and `frontend/` separately).*

---

### Step 3: Environment Variables (Optional)
Sensible defaults are pre-configured in `backend/.env`. If you want to customize your configuration or connect to MongoDB Atlas, edit `backend/.env`:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
JWT_SECRET=unfazed_super_secret_jwt_key_india_2026_dev
JWT_EXPIRES_IN=7d

# Leave empty for zero-config embedded MongoDB, or provide an Atlas URI:
# MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/unfazed

# Razorpay Test Credentials (mock sandbox simulator is built-in):
RAZORPAY_KEY_ID=rzp_test_unfazedMockKeyId1234
RAZORPAY_KEY_SECRET=unfazedMockSecretKey5678
RAZORPAY_WEBHOOK_SECRET=unfazedMockWebhookSecret999
```

---

### Step 4: Seed the Database with Realistic Demo Data
Populate the database with realistic demo therapists, clients, intake responses, verified consent records, packages, sessions, and clinical notes:
```powershell
npm run seed
```

---

### Step 5: Start the Full-Stack Application
Start both the backend API server and frontend development server concurrently:
```powershell
npm run dev
```

The services will launch at:
- **Frontend Web App**: [http://localhost:5173](http://localhost:5173)
- **Backend API Server**: [http://localhost:5000](http://localhost:5000)
- **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🔑 Demo Credentials & Test Accounts

### 1. Therapist 1 (Professional Tier — Full Access)
- **Email:** `ananya@unfazed.in`
- **Password:** `Password123!`
- **Public Branded Page:** [http://localhost:5173/dr-ananya-sharma](http://localhost:5173/dr-ananya-sharma)
- **Features:** 50 client capacity, SOAP & DAP note templates unlocked, advanced revenue analytics, multiple packages.

### 2. Therapist 2 (Starter Tier — Tier Gating Demo)
- **Email:** `rohan@unfazed.in`
- **Password:** `Password123!`
- **Public Branded Page:** [http://localhost:5173/dr-rohan-mehta](http://localhost:5173/dr-rohan-mehta)
- **Features:** 10 active client cap, standard notes only, basic analytics (demonstrates the upgrade prompt).

### 3. Client Portal Access
- **Portal URL:** [http://localhost:5173/portal](http://localhost:5173/portal)
- **Client Email:** `aditi@example.com`
- **Therapist Slug:** `dr-ananya-sharma`
- *(Quick 1-click login buttons are also built directly into the login screens for effortless testing).*

---

## 🧪 Automated Test Suite

UNFAZED comes with an automated security and business logic test suite validating:
- Therapist registration and password hashing
- Duplicate email prevention
- Strict tenant isolation (Therapist B cannot query Therapist A's clients)
- Clinical note privacy (Private notes strictly blocked from client serializers)
- Double-booking prevention on overlapping slots
- Entitlement usage caps and template gating
- Payment signature verification

To run the automated tests:
```powershell
npm test
```

---

## 📋 Acceptance Checklist Verification

| Feature | Status | Verification Route / Method |
| :--- | :---: | :--- |
| **Therapist Registration & Login** | ✅ | `/login` and `/register` with bcrypt & JWT auth |
| **Unique Branded Slug** | ✅ | Public link at `/:slug` (e.g. `/dr-ananya-sharma`) |
| **Availability Management** | ✅ | `/dashboard/schedule` with day-by-day hours & buffers |
| **Real-time Slot Booking** | ✅ | Timezone-converted slot selection with intake & consent |
| **Double-Booking Guard** | ✅ | Atomic database unique indexing & collision filter |
| **Razorpay Test Payments** | ✅ | Test mode sandbox modal with UPI/Card simulation |
| **GST Tax Invoices** | ✅ | Downloadable PDF receipts generated with PDFKit |
| **Multi-Session Packages** | ✅ | 3, 6, and 12-session discounted packages |
| **TipTap Clinical Notes** | ✅ | Rich-text clinical documentation with formatting |
| **SOAP & DAP Templates** | ✅ | Structured clinical sections gated by tier |
| **Private/Shared Note Privacy**| ✅ | Private notes are strictly excluded from client portal |
| **Client Sanctuary Portal** | ✅ | `/portal` for sessions, shared summaries & receipts |
| **Real-Time Chat** | ✅ | Live Socket.io messaging with typing indicators |
| **System Notifications** | ✅ | In-app alerts, plus WhatsApp and Email stub logs |
| **Centralized Entitlements** | ✅ | `canAccess(therapistId, featureKey)` backend guard |
| **Config-Driven Tiers** | ✅ | Starter, Professional, Enterprise tier configs |
| **In-App Upgrade Prompt** | ✅ | Explains blocked feature and updates plan dynamically |
| **MongoDB Aggregation Analytics**| ✅ | Revenue trends, no-show rate, and completion rate |
| **Tenant Isolation** | ✅ | JWT-derived therapist tenancy on all queries/mutations |

---

## 📂 Project Structure

```text
major-project/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                 # Resilient MongoDB connector (Atlas or memory-server)
│   │   │   └── tiers.js              # Subscription tier configurations
│   │   ├── controllers/              # Express controllers for each domain
│   │   ├── middleware/               # Auth, tenant isolation, rate limiter, error handler
│   │   ├── models/                   # Mongoose schemas (Therapist, Client, Session, etc.)
│   │   ├── routes/                   # REST route definitions
│   │   ├── seeds/
│   │   │   └── seed.js               # Comprehensive Indian therapist seed script
│   │   ├── services/                 # Entitlements, payments, invoices, notifications, sockets
│   │   └── server.js                 # Server entry point
│   ├── tests/
│   │   └── run-tests.js              # Automated security and privacy test suite
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/               # Navbar, Sidebar, TipTapEditor, UpgradeModal, RazorpayModal
│   │   ├── context/                  # AuthContext, SocketContext, ToastContext
│   │   ├── hooks/                    # useEntitlement, useAuth, useSocket
│   │   ├── pages/
│   │   │   ├── auth/                 # Login & Register
│   │   │   ├── dashboard/            # Overview, Clients CRM, Schedule, Notes, Payments, Analytics, Settings
│   │   │   ├── portal/               # Client Sanctuary Portal
│   │   │   └── public/               # Branded Public Profile & Booking (/:slug)
│   │   ├── services/                 # Axios API client
│   │   ├── App.jsx                   # React Router
│   │   ├── index.css                 # Custom calm therapeutic design system
│   │   └── main.jsx
│   ├── vite.config.js
│   └── package.json
├── package.json                      # Workspace runner (concurrently)
├── README.md                         # This documentation
└── spec.md                           # Single source of truth product specification
```

---

## 📄 License
Educational & Commercial SaaS Prototype — Built for mental health practitioners in India.
