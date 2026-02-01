# Class Registration System

A web-based class registration system for middle and high school students.

## Overview

This system enables parents to manage their families and enroll children in classes, teachers to create and manage their classes, students to view their schedules, class schedulers to view and create every teacher's classes, schedules, and enrolled students, and administrators to oversee all system operations.

## User Roles

| Role                | Description                                                                                                                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Parent**          | Manage family members, enroll children in classes, make payments. **Note**: Parents can also be Teachers, Admins or Class Schedulers.                                                                                 |
| **Teacher**         | Create/manage classes, view enrolled students. **Note**: Teachers can also be Parents or Admins, but cannot be Class Schedulers.                                                                                      |
| **Student**         | View class schedule, materials, and locations.                                                                                                                                                                        |
| **Admin**           | Full system access - manage all users, classes, enrollments, payments. **Note**: Admins can also access the Parent Portal to manage their own family data. Admins can also be Teachers, Parents, or Class Schedulers. |
| **Class Scheduler** | View and create every teacher's classes, schedules, and enrolled students. **Note**: Class Schedulers can also be Parents, but cannot be Teachers or Admins.                                                          |
| **Super Admin**     | **God Mode** access. Can access ALL portals (Admin, Teacher, Scheduler, Parent) via a global view switcher. Bypass all RLS database policies.                                                                         |

## Core Features

### Authentication

- Email/password registration and login
- Role-based access control (parent, teacher, student, admin, class scheduler)
- Protected routes with automatic redirects
- Session management via Supabase Auth
- **Profile View Switching**: Multi-role users (e.g., Teachers who are also Parents) can toggle between their views without logging out.
- **Super Admin Bypass**: Super Admins can switch to ANY view for debugging and management.

### Parent Portal (`/parent`)

- **Dashboard** - Overview of family, enrollments, and quick actions
- **Family Management** - Add, edit, delete family members (children)
- **Student Linking** - Link child accounts via email (prevents double-linking).
- **Class Browsing** - View available classes with teacher info and availability
- **Enrollment** - Enroll children in classes
- **Payments** - Pay enrollment fees via Stripe

### Teacher Portal (`/teacher`)

- **Dashboard** - Overview of classes and student counts
- **Class Management** - Create, edit, delete classes
- **Class Status** - Publish (draft → active), complete, or cancel classes
- **Class Materials** - Upload and manage resources (PDFs, links) for students.
- **Student Roster** - View enrolled students per class
- **Student Management** - Block/Unblock students from enrolling.

### Student Portal (`/student`)

- **Dashboard** - Overview of enrolled classes (requires linked account)
- **Schedule View** - Weekly calendar of classes
- **Class Details** - View class info, teacher, location, syllabus

### Admin Portal (`/admin`)

- **Dashboard** - System-wide stats and recent activity
- **User Management** - View all users, change roles, delete accounts
- **Class Management** - View/edit/delete any class
- **Enrollment Management** - Force add/remove/cancel enrollments. Refund processing reverts enrollment status.
- **Payment Management** - View all payments, update status, revenue tracking
- **System Configuration** - Manage global settings (e.g., Registration Open Date).
- **Role Management** - Promote/Demote users (enforcing constraints like "Teachers cannot be Class Schedulers").

### Class Scheduler Portal (`/class-scheduler`)

- **Dashboard** - Overview of classes and student counts
- **Class Management** - View/edit/delete any class
- **Class Status** - Publish (draft → active), complete, or cancel classes
- **Student Roster** - View enrolled students per class
- **Calendar View** - Weekly calendar of classes

## Data Entities

| Entity              | Description                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| **Profiles**        | User accounts with role, name, email, phone                                                           |
| **Family Members**  | Children/students linked to parent accounts (optionally linked to student user account via `user_id`) |
| **Classes**         | Courses with schedule, location, fee, capacity                                                        |
| **Enrollments**     | Student-to-class registrations with status                                                            |
| **Payments**        | Payment records for enrollments via Stripe                                                            |
| **Calendar Events** | Calendar events with start and end times, location, and description                                   |

## Payment Processing

- **Provider**: Stripe
- **Flow**: Checkout sessions → Redirect to Stripe → Webhook confirmation
- **Statuses**: Pending, Completed, Failed, Refunded

## Technical Stack

- **Frontend**: Next.js 16 (App Router), React 19.2.0, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js Server Actions, API Routes
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Auth**: Supabase Auth
- **Payments**: Stripe Checkout + Webhooks
- **Validation**: Zod schemas
- **Email**: Resend

## Security

- Row Level Security (RLS) on all database tables
- Role-based route protection via middleware
- Server-side role verification on all actions
- Secure payment handling via Stripe webhooks
