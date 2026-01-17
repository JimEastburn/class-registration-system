// Database types for the class registration system

export type UserRole = 'parent' | 'teacher' | 'student' | 'admin';
export type ClassStatus = 'draft' | 'active' | 'cancelled' | 'completed';
export type EnrollmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type Relationship = 'child' | 'spouse' | 'guardian' | 'other';
export type GradeLevel = '6' | '7' | '8' | '9' | '10' | '11' | '12';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  parent_id: string;
  first_name: string;
  last_name: string;
  grade_level?: GradeLevel;
  relationship: Relationship;
  birth_date?: string;
  notes?: string;
  created_at: string;
}

export interface Teacher extends User {
  bio?: string;
  specializations?: string[];
}

export interface Class {
  id: string;
  teacher_id: string;
  name: string;
  description?: string;
  status: ClassStatus;
  location: string;
  start_date: string;
  end_date: string;
  schedule: string;
  max_students: number;
  current_enrollment: number;
  fee: number;
  syllabus?: string;
  created_at: string;
  updated_at: string;
}

export interface ClassWithTeacher extends Class {
  teacher: Teacher;
}

export interface Enrollment {
  id: string;
  student_id: string;
  class_id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
}

export interface EnrollmentWithClass extends Enrollment {
  class: Class;
}

export interface EnrollmentWithDetails extends Enrollment {
  student: FamilyMember;
  class: ClassWithTeacher;
  payment?: Payment;
}

export interface Payment {
  id: string;
  enrollment_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: 'stripe' | 'paypal';
  transaction_id?: string;
  paid_at?: string;
  created_at: string;
}

export interface ScheduleItem {
  class_id: string;
  class_name: string;
  teacher_name: string;
  location: string;
  start_time: string;
  end_time: string;
  status: ClassStatus;
}

// API Request/Response types
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
