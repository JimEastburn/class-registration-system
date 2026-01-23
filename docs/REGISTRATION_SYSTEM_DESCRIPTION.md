# Class Registration System

A web-based class registration system for middle and high school students.

## Overview

This system enables parents to manage their families and enroll children in classes, teachers to create and manage their classes, students to view their schedules, and administrators to oversee all system operations.

## User Roles

| Role | Description |
|------|-------------|
| **Parent** | Manage family members, enroll children in classes, make payments |
| **Teacher** | Create/manage classes, view enrolled students |
| **Student** | View class schedule, materials, and locations |
| **Admin** | Full system access - manage all users, classes, enrollments, payments. **Note**: Admins can also access the Parent Portal to manage their own family data. |

## Core Features

### Authentication
- Email/password registration and login
- Role-based access control (parent, teacher, student, admin)
- Protected routes with automatic redirects
- Session management via Supabase Auth

### Parent Portal (`/parent`)
- **Dashboard** - Overview of family, enrollments, and quick actions
- **Family Management** - Add, edit, delete family members (children)
- **Student Linking** - Generate invite codes for children to link their student accounts
- **Class Browsing** - View available classes with teacher info and availability
- **Enrollment** - Enroll children in classes
- **Payments** - Pay enrollment fees via Stripe

### Teacher Portal (`/teacher`)
- **Dashboard** - Overview of classes and student counts
- **Class Management** - Create, edit, delete classes
- **Class Status** - Publish (draft → active), complete, or cancel classes
- **Student Roster** - View enrolled students per class

### Student Portal (`/student`)
- **Account Linking** - Enter invite code from parent to link account to family
- **Dashboard** - Overview of enrolled classes (requires linked account)
- **Schedule View** - Weekly calendar of classes
- **Class Details** - View class info, teacher, location, syllabus

### Admin Portal (`/admin`)
- **Dashboard** - System-wide stats and recent activity
- **User Management** - View all users, change roles, delete accounts
- **Class Management** - View/edit/delete any class
- **Enrollment Management** - View/edit/delete any enrollment
- **Payment Management** - View all payments, update status, revenue tracking

## Data Entities

| Entity | Description |
|--------|-------------|
| **Profiles** | User accounts with role, name, email, phone |
| **Family Members** | Children/students linked to parent accounts (optionally linked to student user account via `user_id`) |
| **Family Member Invites** | Invite codes for linking student accounts to family members |
| **Classes** | Courses with schedule, location, fee, capacity |
| **Enrollments** | Student-to-class registrations with status |
| **Payments** | Payment records for enrollments via Stripe |

## Payment Processing

- **Provider**: Stripe
- **Flow**: Checkout sessions → Redirect to Stripe → Webhook confirmation
- **Statuses**: Pending, Completed, Failed, Refunded

## Technical Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js Server Actions, API Routes
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Auth**: Supabase Auth
- **Payments**: Stripe Checkout + Webhooks
- **Validation**: Zod schemas

## Security

- Row Level Security (RLS) on all database tables
- Role-based route protection via middleware
- Server-side role verification on all actions
- Secure payment handling via Stripe webhooks