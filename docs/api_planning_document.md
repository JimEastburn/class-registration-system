# API & Architecture Reference

## Overview

The Class Registration System creates a hybrid API architecture tailored for the Next.js App Router:

1.  **Server Actions (`src/lib/actions`)**: The primary "internal API" for the application. Used for all form submissions, data mutations, and business logic triggered by the UI. These are TypeScript functions called directly from Client Components, running securely on the server.
2.  **REST Endpoints (`src/app/api`)**: Traditional HTTP endpoints used for specific use cases requiring external access, webhooks, or non-JSON responses (e.g., CSV exports, generated HTML).

---

## REST API Endpoints

These endpoints are located in `src/app/api`. Use these for external integrations or specialized browser requests.

### 1. Payments & Checkout

**`POST /api/checkout`**
Creates a Stripe Checkout Session for a specific enrollment.

- **Auth**: Required (Supabase Session)
- **Body**: `{ "enrollmentId": "uuid" }`
- **Response**: `{ "sessionId": "...", "url": "..." }`
- **Logic**:
  - Verifies user ownership of the enrollment.
  - Ensures enrollment is `pending`.
  - Creates Stripe session with line items from the class fee.
  - Creates a pending `payments` record.

**`GET /api/invoice`**
Generates a printable HTML invoice for a payment.

- **Auth**: Required (User must be the parent or Admin)
- **Query Params**: `?id=<payment_uuid>`
- **Response**: `text/html` (Rendered Invoice)

### 2. Administrative Tools

**`GET /api/export`**
Exports system data as CSV for administrative use.

- **Auth**: Admin only
- **Query Params**: `?type=<users|classes|enrollments|payments>`
- **Response**: `text/csv` (File download)
- **Security**: Includes CSV Injection protection (sanitizing formulas).

### 3. Webhooks

**`POST /api/webhooks/stripe`**
Handles asynchronous events from Stripe.

- **Auth**: Stripe Signature Verification
- **Events Handled**:
  - `checkout.session.completed`: Marks payment as `completed`, confirms enrollment, sends receipt email, triggers Zoho Sync.
  - `checkout.session.expired`: Marks payment as `failed`.
  - `charge.refunded`: Logs refund (implementation details may vary).

---

## Server Actions (Internal API)

Business logic is encapsulated in Server Actions located in `src/lib/actions`. These functions return a standard `ActionResult` or `AuthActionResult` type.

**Common Response Pattern:**

```typescript
type ActionResult = {
  success?: boolean;
  error?: string;
  data?: unknown;
};
```

### Core Modules

| Module          | File             | Key Responsibilities                                                                                         |
| :-------------- | :--------------- | :----------------------------------------------------------------------------------------------------------- |
| **Auth**        | `auth.ts`        | `signUp`, `signIn`, `signOut`, `resetPassword`. Handles Supabase Auth interactions and role-based redirects. |
| **Classes**     | `classes.ts`     | `createClass`, `updateClass`, `deleteClass` (Drafts only). Enforces teacher/scheduler permissions.           |
| **Enrollments** | `enrollments.ts` | Student enrollment logic, capacity checks, status updates.                                                   |
| **Family**      | `family.ts`      | `createFamilyMember`, `propagateParentEmail`. Manages parent-student relationships.                          |
| **Scheduler**   | `scheduler.ts`   | Advanced scheduling logic, detecting overlaps (referenced in `classes.ts`).                                  |
| **Admin**       | `admin.ts`       | User role management, potentially high-level overrides.                                                      |
| **Waitlist**    | `waitlist.ts`    | Managing class waitlists when capacity is full.                                                              |
| **Invites**     | `invites.ts`     | Handling teacher/student invitations (if applicable).                                                        |
| **Refunds**     | `refunds.ts`     | Processing logic for refunds (likely interfacing with Stripe/DB).                                            |

### Key Workflows

#### Class Creation (`classes.ts`)

- **Function**: `createClass(formData)`
- **Permissions**: Teacher, Admin, Class Scheduler.
- **Validation**: Checks for schedule overlaps (`checkScheduleOverlap`).
- **Defaults**: If created by a Teacher, schedule is "To Be Announced" by default until finalized by a scheduler.

#### Enrollment (`enrollments.ts`)

- **Function**: `enrollStudent(classId, studentId)`
- **Logic**:
  - Checks class capacity.
  - Checks if student is already enrolled.
  - Creates `enrollment` record with `pending` status.
  - (Payment is then handled via `/api/checkout`).

---

## Data Models (Supabase)

The API interacts with the following core tables (Public Schema):

- `profiles` (Users + Roles)
- `family_members` (Students linked to Parents)
- `classes` (Course details, fee, schedule)
- `enrollments` (Link between Student and Class, includes Status)
- `payments` (Transaction records linked to Enrollments)
- `class_blocks` (Teachers blocking specific students)
