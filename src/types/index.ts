import { Database as GeneratedDatabase } from './supabase';

// Re-export generated types
export type Database = GeneratedDatabase;

// Convenience types from the database
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Entity types
export type Profile = Tables<'profiles'>;
export type FamilyMember = Tables<'family_members'>;
export type Class = Tables<'classes'>;
export type Enrollment = Tables<'enrollments'>;
export type Payment = Tables<'payments'>;

// Insert types
export type ProfileInsert = InsertTables<'profiles'>;
export type FamilyMemberInsert = InsertTables<'family_members'>;
export type ClassInsert = InsertTables<'classes'>;
export type EnrollmentInsert = InsertTables<'enrollments'>;
export type PaymentInsert = InsertTables<'payments'>;

// Update types
export type ProfileUpdate = UpdateTables<'profiles'>;
export type FamilyMemberUpdate = UpdateTables<'family_members'>;
export type ClassUpdate = UpdateTables<'classes'>;
export type EnrollmentUpdate = UpdateTables<'enrollments'>;
export type PaymentUpdate = UpdateTables<'payments'>;

// Enum types
export type UserRole = 'parent' | 'teacher' | 'student' | 'admin';
export type ClassStatus = 'draft' | 'active' | 'cancelled' | 'completed';
export type EnrollmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type Relationship = 'child' | 'spouse' | 'guardian' | 'other';
export type GradeLevel = '6' | '7' | '8' | '9' | '10' | '11' | '12';
export type PaymentProvider = 'stripe' | 'paypal';

// Extended types with relations
export interface ClassWithTeacher extends Class {
  teacher: Profile;
}

export interface EnrollmentWithDetails extends Enrollment {
  student: FamilyMember;
  class: ClassWithTeacher;
  payment?: Payment;
}

export interface FamilyMemberWithEnrollments extends FamilyMember {
  enrollments: EnrollmentWithDetails[];
}

// API response types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiError {
  error: string;
  message: string;
  code?: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

// Schedule types
export interface ScheduleItem {
  class_id: string;
  class_name: string;
  teacher_name: string;
  location: string;
  start_time: string;
  end_time: string;
  status: ClassStatus;
}
