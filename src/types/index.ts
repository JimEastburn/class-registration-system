/**
 * Type definitions for the Class Registration System
 * Aligned with database schema defined in supabase/migrations/
 */

// =============================================================================
// Enums / Union Types
// =============================================================================

/**
 * User role for RBAC - matches public."UserRole" enum in database
 */
export type UserRole =
  | 'parent'
  | 'teacher'
  | 'student'
  | 'admin'
  | 'class_scheduler'
  | 'super_admin';

/**
 * Class status - matches public."ClassStatus" enum in database
 */
export type ClassStatus = 'draft' | 'published' | 'completed' | 'cancelled';

/**
 * Enrollment status - matches public."EnrollmentStatus" enum in database
 */
export type EnrollmentStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'waitlisted';

/**
 * Payment status - matches public."PaymentStatus" enum in database
 */
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

/**
 * Sync status for external integrations (e.g., Zoho Books)
 */
export type SyncStatus = 'pending' | 'synced' | 'failed';

// =============================================================================
// Core Interfaces
// =============================================================================

/**
 * User profile linked to auth.users
 */
export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  specializations: string[] | null;
  created_at: string;
  updated_at: string;
  code_of_conduct_agreed_at: string | null;
}

/**
 * Family member (student) linked to a parent
 */
export interface FamilyMember {
  id: string;
  parent_id: string;
  student_user_id: string | null; // Optional link to a registered student user account
  first_name: string;
  last_name: string;
  grade: string | null;
  dob: string | null; // ISO date string
  created_at: string;
  updated_at: string;
}

/**
 * Schedule configuration for recurring classes
 */
export interface ScheduleConfig {
  day: string; // 'Monday', 'Tuesday', etc.
  block: string; // 'Block 1', 'Block 2', etc.
  recurring: boolean;
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
}

/**
 * Class offered by a teacher
 */
export interface Class {
  id: string;
  teacher_id: string;
  name: string; // Renamed from 'title'
  description: string | null;
  capacity: number;
  price: number; // Stored as decimal in DB (in cents)
  location: string | null;
  schedule_config: ScheduleConfig | null;
  status: ClassStatus;
  // Individual schedule fields (for easier querying)
  day: string | null;
  block: string | null;
  start_date: string | null; // ISO date string
  end_date: string | null; // ISO date string
  age_min: number | null;
  age_max: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Student enrollment in a class
 */
export interface Enrollment {
  id: string;
  student_id: string; // References family_members.id
  class_id: string;
  status: EnrollmentStatus;
  waitlist_position: number | null; // Null if not on waitlist
  created_at: string;
  updated_at: string;
}

/**
 * Payment record linked to enrollment
 */
export interface Payment {
  id: string;
  enrollment_id: string;
  stripe_payment_intent: string | null;
  amount: number; // Stored as decimal in DB
  status: PaymentStatus;
  sync_status: string; // For Zoho sync tracking
  created_at: string;
  updated_at: string;
}

/**
 * Teacher block preventing student enrollment
 */
export interface ClassBlock {
  id: string;
  teacher_id: string;
  student_id: string; // References family_members.id
  reason: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null; // User who created the block
}

/**
 * Calendar event for a class session
 */
export interface CalendarEvent {
  id: string;
  class_id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  block: string;
  location: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Audit log entry for system actions
 */
export interface AuditLog {
  id: string;
  user_id: string | null; // User who performed the action
  action: string;
  target_type: string | null; // e.g., 'profile', 'class', 'enrollment'
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

/**
 * System setting key-value pair
 */
export interface SystemSetting {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
}

/**
 * Class material (files/links) attached to a class
 */
export interface ClassMaterial {
  id: string;
  class_id: string;
  title: string;
  file_url: string;
  type: string; // e.g., 'pdf', 'video', 'link'
  created_at: string;
}

// =============================================================================
// Extended Types (with relations)
// =============================================================================

/**
 * Class with teacher profile included
 */
export interface ClassWithTeacher extends Class {
  teacher: Pick<Profile, 'id' | 'first_name' | 'last_name' | 'email'>;
}

/**
 * Enrollment with related student and class
 */
export interface EnrollmentWithDetails extends Enrollment {
  student: FamilyMember;
  class: Class;
}

/**
 * Family member with enrollment information
 */
export interface FamilyMemberWithEnrollments extends FamilyMember {
  enrollments: Enrollment[];
}

// =============================================================================
// Action Result Types
// =============================================================================

/**
 * Standard result type for server actions
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
