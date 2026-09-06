# UNFAZED — SaaS Major Project Specification

## 1. Product Overview
**Product:** Unfazed  
**Type:** SaaS platform for therapists in India  
**Goal:** Manage private practice end-to-end through one branded link, covering client acquisition, scheduling, payments, clinical notes, communication, and analytics.

Example: `unfazed.in/dr-sharma`

Core areas from the reference:
- Therapist Dashboard
- Client Portal
- Entitlement / Subscription Layer
- System-wide Communication Layer

## 2. Users and Roles
### Therapist
Register/login, manage profile, clients, availability, sessions, notes, payments, packages, analytics, communication, and subscription-gated features.

### Client
Access therapist branded page, complete intake/consent, book sessions, pay, use portal/chat, and view only information shared with them.

### Admin — recommended addition
The reference PDF does not define an admin role. For a complete SaaS, add an internal admin role for therapist/account support, tier configuration, platform monitoring, payment/refund oversight, and audit/operational controls. Admin permissions must be separate from therapist/client permissions.

# 3. Functional Requirements

## Module 1 — Authentication, Profile & Branded Link
### Authentication
- Therapist registration.
- Therapist login.
- bcrypt password hashing.
- JWT authentication middleware.
- Input validation.
- Duplicate-email prevention.
- Secure logout/token lifecycle — recommended.
- Password reset/change — added gap.
- Email verification — added gap.
- Rate limiting/brute-force protection — added gap.

### Therapist Profile
Required reference fields:
- name
- email
- password_hash
- unique slug
- bio
- specializations[]
- languages[]

Recommended additions:
- profile photo
- qualifications/credentials
- experience
- session pricing
- location/online availability
- timezone
- cancellation policy
- professional registration information where applicable

### Public Profile
Route pattern: `/:slug`

Must include:
- Hero
- About
- Specializations
- Languages
- Service/session cards
- Booking CTA
- Responsive design
- Open Graph/meta tags
- Unique slug generation/validation

Acceptance: therapist can register, login, edit profile, and share a working branded link.

## Module 2 — Scheduling & Booking
### Availability
Support:
- recurring weekly availability
- one-time overrides
- blocked slots
- therapist timezone
- buffer time
- 30/45/60/90-minute sessions

### Booking
- Show only available slots.
- Convert slots to client local timezone.
- Instant confirmation.
- Prevent double booking.
- Server-side slot validation/locking.
- Bookings linked to therapist and client.

Recommended missing requirements:
- status lifecycle: pending/confirmed/cancelled/completed/no-show
- cancellation/rescheduling
- advance-booking rules
- booking horizon
- holidays/time-off
- calendar export/integration readiness
- idempotency/race-condition protection

Stretch:
- waitlist
- auto-notify when a slot frees

Acceptance: therapist opens slots, client books one, and the same slot cannot be booked twice.

## Module 3 — Client CRM & Intake
### Client
Client references Therapist and supports:
- name
- email
- phone
- age/date of birth where appropriate
- status
- tags
- notes/summary
- consent status
- timestamps

### Client List
- search
- sort
- filters
- status
- tags
- last session

### Client Profile
Aggregate:
- session history
- payment history
- authorized notes
- intake
- consent records

### Intake
Static first:
- demographics
- presenting concern
- history

Recommended:
- validation
- draft/save
- client self-service intake link
- intake versioning
- audit trail
- export

### Consent
- explicit checkbox/consent
- timestamp
- auditable record
- consent version/text reference — added gap
- withdrawal/re-consent — added gap

Stretch: dynamic drag-and-drop form builder stored as JSON schema.

## Module 4 — Payments, Packages & Invoices
### Payments
- Razorpay test mode.
- Advance payment at booking.
- Isolate gateway behind a service interface.
- Never expose secret keys to frontend.

Payment should support:
- gateway transaction/order/payment ID
- platform fee
- net amount
- gross amount
- currency
- status
- therapist/client/session/package references
- timestamps

Suggested statuses:
created, pending, authorized, captured/success, failed, refunded, partially_refunded.

### Webhooks
- Razorpay webhook endpoint.
- Verify webhook signature.
- Webhook is authoritative for confirmation.
- Idempotent webhook handling.
- Do not rely only on client callback.

### Packages
Reference:
- 3 sessions
- 6 sessions
- 12 sessions

Support:
- per-session rate
- session count
- expiry
- consumed sessions
- remaining sessions
- package status

### Invoices
- GST-style invoice PDF after successful payment.
- Invoice reference/storage.
- Business/payment details.
- Config-driven totals.

Recommended gaps:
- refunds
- failed-payment recovery
- reconciliation
- duplicate-payment prevention
- invoice numbering
- tax configuration
- payment audit log
- never store card details

## Module 5 — Clinical Documentation
SessionNote:
- therapist
- client
- session
- content
- type
- timestamps

Required types:
- `private`
- `shared`

**Critical privacy rule:** private notes must NEVER be returned by client-facing routes. Enforce this at API/query/serializer level, not only in React.

Editor:
- TipTap rich text
- create/edit/save

Stretch:
- SOAP
- DAP

Recommended security gaps:
- authorization on every note endpoint
- audit logging
- sensitive-data protection
- protection against ID guessing
- safe serializers

Acceptance: therapist can create private/shared notes; client can receive shared notes only.

## Module 6 — Communication & Notifications
### Chat
Socket.io:
- therapist-client messaging
- real-time delivery
- conversation history

Recommended:
- message IDs
- sender/receiver authorization
- read receipts
- typing indicators
- presence
- secure attachments

### Notifications
Trigger on:
- booking confirmation
- 24-hour reminder
- payment success/failure
- session completion
- post-session follow-up

### WhatsApp
Stub/log/queue the integration when live WhatsApp Business API access is unavailable.

### Email
Optional/recommended using Nodemailer/provider:
- booking confirmation
- payment receipt/invoice
- reminders
- password reset
- verification

Recommended gaps:
- notification preferences
- retry strategy
- delivery status
- templates
- duplicate-notification prevention

## Module 7 — Subscription, Entitlements & Analytics
### Subscription configuration
SubscriptionTierConfig:
- tier name
- monetary configuration
- usage caps
- feature flags

No hardcoded tier limits or monetary values.

### Entitlement Service
Exactly one central service:
`canAccess(therapistId, featureKey)`

Every gated backend route must use it. Frontend `useEntitlement.js` may display UI state, but cannot replace backend authorization.

Minimum three gated features:
1. active-client cap
2. note-template type
3. analytics depth

Recommended:
- monthly bookings
- package creation
- chat/attachments
- advanced reports
- custom branding
- automated reminders

Upgrade prompt:
- explain blocked feature
- show current tier
- show upgrade path

### Analytics
Use server-side MongoDB aggregation for:
- revenue trend
- active clients
- no-show rate

Recommended:
- booking conversion
- completed sessions
- cancellation rate
- package utilization
- outstanding payments
- new clients over time
- average revenue/session

## 4. Data Models
Reference:
- Therapist
- Client
- Session
- SessionNote
- Availability
- Payment
- Package
- ClientPackage
- Lead
- SubscriptionTierConfig

Recommended additions:
- Notification
- Conversation
- Message
- ConsentRecord
- Invoice
- Subscription
- AuditLog
- WebhookEvent
- PasswordResetToken/VerificationToken

All tenant-owned records must be scoped to the owning therapist.

## 5. Multi-Tenant SaaS — IMPORTANT GAP
The PDF describes SaaS but does not fully specify tenant isolation.

Implement:
- therapist account as tenant/practice owner
- therapist-scoped client/session/payment/note/availability/package data
- derive therapist identity from authenticated JWT
- never trust therapist IDs from request body for authorization
- prevent cross-therapist ID-guessing/access
- authorization on every protected resource

Future extension: practice/team/staff members.

## 6. Security & Privacy — IMPORTANT GAP
Implement:
- HTTPS in deployment
- bcrypt
- JWT authentication
- authorization
- tenant isolation
- private/shared note enforcement
- validation/sanitization
- rate limiting
- production CORS restriction
- secure HTTP headers
- secret management
- `.env` excluded from Git
- webhook signature verification
- upload validation/size limits
- audit logs
- token expiry/refresh strategy
- non-leaky error responses

Because clinical information is sensitive, obtain qualified legal/compliance review for production use. The reference PDF does not define a specific regulatory implementation.

## 7. File Storage
Reference architecture includes AWS S3.

Use an isolated storage service for:
- upload
- download/access
- delete
- metadata
- authorization

Recommended:
- private bucket
- signed URLs
- file type/size validation
- malware-scanning strategy
- no public clinical attachments

## 8. API Requirements
Backend:
- Node.js
- Express
- Mongoose
- REST
- Socket.io

Required route groups:
- `/api/auth`
- `/api/therapist`
- `/api/clients`
- `/api/scheduling`
- `/api/payments`
- `/api/notes`
- `/api/analytics`

Recommended:
- `/api/notifications`
- `/api/packages`
- `/api/subscriptions`
- `/api/admin`
- `/api/webhooks`

API standards:
- consistent JSON
- correct HTTP status codes
- central error handler
- validation errors
- authentication middleware
- entitlement checks
- pagination/filtering/sorting
- API-versioning readiness

## 9. Frontend Requirements
### Therapist Dashboard
Required:
- Dashboard
- Clients
- Schedule
- Notes
- Analytics
- Profile

Recommended:
- Payments
- Packages
- Notifications
- Settings
- Subscription/Upgrade

### Client Portal
Required:
- BookingPage
- ClientPortal
- Payment

Recommended:
- Intake
- Consent
- Sessions
- Shared Notes
- Chat
- Payment History

### Components
Common, profile, scheduling, CRM, payments, notes, chat and analytics reusable components as defined by the reference architecture.

## 10. UI/UX
- responsive desktop/tablet/mobile
- clear dashboard navigation
- simple client booking flow
- accessible labels/controls
- loading, empty, error and success states
- destructive-action confirmation
- consistent design system
- do not expose internal IDs
- clear privacy messaging
- mobile-first client portal

## 11. Architecture
```text
Clients
   |
 HTTPS
   |
React Frontend
 ├── Therapist Dashboard
 └── Client Portal
   |
 REST API + Axios + Socket.io
   |
Node.js + Express API
 ├── Routes
 ├── Controllers
 ├── Middleware
 └── Services
   |
 ├── MongoDB / Mongoose
 ├── Entitlement Service
 ├── Razorpay
 ├── Socket.io
 ├── Notification Service
 └── Cloud Storage / S3
```

Architectural principles:
1. Centralize entitlement checks.
2. Separate private/shared data at API layer.
3. Keep monetary values and tier caps configurable.
4. Isolate third-party integrations behind service interfaces.

## 12. Testing — IMPORTANT GAP
Test:
- registration/login/invalid credentials
- unauthorized access
- tenant isolation
- double booking/timezones
- cancellation
- payment success/failure
- webhook signature/idempotency
- private/shared note privacy
- entitlement allow/block/caps
- analytics aggregation correctness

## 13. Seed Data
Create a seed script after Module 1 with realistic demo:
- therapists
- clients
- sessions
- availability
- packages
- payments
- subscription tiers
- notes

Mark seed data as test/demo data.

## 14. Logging & Observability — IMPORTANT GAP
Use:
- structured server logs
- request/error logs
- payment/webhook logs
- notification logs
- audit logs for sensitive operations

Never log passwords, JWT secrets, Razorpay secrets, card secrets, or unnecessary private clinical content.

## 15. Deployment
Reference direction:
- Frontend: Vercel
- Backend: Render/Railway
- Database: MongoDB Atlas

Production:
- environment variables on hosting
- production CORS
- HTTPS
- production DB credentials
- webhook URL
- health-check endpoint
- documented build/start commands
- database indexes/performance review
- monitoring recommended

Deploy incrementally.

## 16. Related SaaS Products for Benchmarking
These are comparison references, not copied requirements:
- **Practice Better:** client portal, scheduling, forms, packages, payments, practitioner workflow.
- **SimplePractice:** practice management, scheduling, clinical documentation, billing, client portal.
- **TherapyNotes:** clinical documentation, scheduling, billing, therapist workflow.
- **Jane App:** online booking, scheduling, payments, client communication.
- **Cliniko:** scheduling, client management, billing, practice administration.
- **Zanda / Power Diary:** practice management, scheduling, forms, communication, reporting.

### Unfazed differentiation
- India-focused therapist SaaS.
- One branded public therapist link.
- Acquisition → intake → booking → payment → documentation → communication → analytics in one flow.
- Centralized entitlement architecture.
- Strong private/shared clinical-note boundary.
- Config-driven subscription tiers.
- Razorpay-first payments.
- Indian invoice/tax readiness.
- Mobile-first client booking.

## 17. Identified Missing / Under-Specified Points
1. Admin role/platform administration
2. Multi-tenant isolation
3. Resource-level authorization
4. Password reset
5. Email verification
6. Rate limiting
7. Token lifecycle
8. Booking status lifecycle
9. Cancellation/rescheduling
10. Race-condition/idempotency handling
11. Refunds
12. Payment reconciliation
13. Invoice numbering
14. Consent versioning/withdrawal
15. Audit logging
16. Secure file storage
17. Notification preferences/retries
18. Message authorization
19. Data retention/deletion
20. Testing strategy
21. Logging/observability
22. Backup/disaster recovery
23. Monitoring
24. Accessibility
25. API pagination/filtering standards
26. Error response standards
27. Database indexing/performance
28. Search strategy
29. Subscription lifecycle/renewal
30. Upgrade/downgrade/proration rules
31. Trial rules
32. Subscription payment-failure handling
33. Client account lifecycle
34. Therapist data export/deletion
35. Calendar integration readiness
36. Legal/privacy/terms workflow
37. India-specific tax/compliance review
38. Backup strategy
39. Secure attachments
40. Disaster recovery

## 18. Non-Functional Requirements
### Performance
Fast dashboards, pagination, indexed queries, server-side aggregation, minimal redundant API calls.

### Reliability
Graceful external-service failures, retries, idempotent payment/webhook operations, no duplicate bookings.

### Security
Authentication, authorization, tenant isolation, sensitive-data protection, secret management, input validation.

### Scalability
Modular services, config-driven entitlements, stateless API where practical, background-job readiness.

### Maintainability
Modular controllers/services, reusable React components, central API client, central entitlement service, consistent naming, Git workflow.

## 19. Development Sequence
Build in this order:
1. Foundation
2. Therapist authentication
3. Profile + branded link
4. Client CRM
5. Scheduling
6. Sessions
7. Payments/packages/invoices
8. Clinical notes
9. Client portal
10. Chat/notifications
11. Subscription/entitlements
12. Analytics
13. Security hardening
14. Testing
15. Deployment
16. Documentation/demo

## 20. Final Acceptance Checklist
- [x] Therapist registration/login
- [x] Profile editing
- [x] Unique branded link
- [x] Public therapist profile
- [x] Client intake
- [x] Auditable consent
- [x] Client CRM
- [x] Availability management
- [x] Booking
- [x] Double-booking prevention
- [x] Session lifecycle
- [x] Razorpay test payment
- [x] Verified payment webhook
- [x] 3/6/12-session packages
- [x] Invoice PDF
- [x] Private/shared notes
- [x] Client privacy enforcement
- [x] Real-time chat
- [x] Notifications
- [x] WhatsApp stub
- [x] Configuration-driven tiers
- [x] Central `canAccess()` entitlement service
- [x] Three or more gated features
- [x] Upgrade prompt
- [x] MongoDB aggregation analytics
- [x] Tenant-isolation tests
- [x] Security controls
- [x] Seed data
- [x] Testing completed
- [ ] Frontend deployed (ready for Vercel/Netlify)
- [ ] Backend deployed (ready for Render/Railway)
- [ ] MongoDB Atlas configured (ready in .env)
- [x] GitHub repository organized (.gitignore, .env.example)
- [x] README/documentation complete

## 21. Source Boundary
The uploaded major-project PDF is the primary source for the required project scope, architecture, folder structure, setup, seven modules, sequencing and deployment direction. The sections explicitly labeled recommended/added gap/important gap, SaaS benchmarks, security hardening, testing, operational and production-readiness are extensions added to make the specification more complete and should be treated as recommendations rather than claims that they were explicitly required by the PDF.
