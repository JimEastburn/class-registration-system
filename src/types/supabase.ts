export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    email: string
                    role: 'parent' | 'teacher' | 'student' | 'admin' | 'class_scheduler'
                    first_name: string
                    last_name: string
                    phone: string | null
                    avatar_url: string | null
                    bio: string | null
                    specializations: string[] | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email: string
                    role: 'parent' | 'teacher' | 'student' | 'admin' | 'class_scheduler'
                    first_name: string
                    last_name: string
                    phone?: string | null
                    avatar_url?: string | null
                    bio?: string | null
                    specializations?: string[] | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    role?: 'parent' | 'teacher' | 'student' | 'admin'
                    first_name?: string
                    last_name?: string
                    phone?: string | null
                    avatar_url?: string | null
                    bio?: string | null
                    specializations?: string[] | null
                    created_at?: string
                    updated_at?: string
                }
            }
            family_members: {
                Row: {
                    id: string
                    parent_id: string
                    first_name: string
                    last_name: string
                    grade_level: 'elementary' | 'middle school' | 'high school' | null
                    relationship: 'child' | 'spouse' | 'guardian' | 'other'
                    birth_date: string | null
                    notes: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    parent_id: string
                    first_name: string
                    last_name: string
                    grade_level?: 'elementary' | 'middle school' | 'high school' | null
                    relationship: 'child' | 'spouse' | 'guardian' | 'other'
                    birth_date?: string | null
                    notes?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    parent_id?: string
                    first_name?: string
                    last_name?: string
                    grade_level?: 'elementary' | 'middle school' | 'high school' | null
                    relationship?: 'child' | 'spouse' | 'guardian' | 'other'
                    birth_date?: string | null
                    notes?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            classes: {
                Row: {
                    id: string
                    teacher_id: string
                    name: string
                    description: string | null
                    status: 'draft' | 'active' | 'cancelled' | 'completed'
                    location: string
                    start_date: string
                    end_date: string
                    schedule: string
                    max_students: number
                    current_enrollment: number
                    fee: number
                    syllabus: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    teacher_id: string
                    name: string
                    description?: string | null
                    status?: 'draft' | 'active' | 'cancelled' | 'completed'
                    location: string
                    start_date: string
                    end_date: string
                    schedule: string
                    max_students: number
                    current_enrollment?: number
                    fee: number
                    syllabus?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    teacher_id?: string
                    name?: string
                    description?: string | null
                    status?: 'draft' | 'active' | 'cancelled' | 'completed'
                    location?: string
                    start_date?: string
                    end_date?: string
                    schedule?: string
                    max_students?: number
                    current_enrollment?: number
                    fee?: number
                    syllabus?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            enrollments: {
                Row: {
                    id: string
                    student_id: string
                    class_id: string
                    status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
                    enrolled_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    student_id: string
                    class_id: string
                    status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
                    enrolled_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    student_id?: string
                    class_id?: string
                    status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
                    enrolled_at?: string
                    updated_at?: string
                }
            }
            payments: {
                Row: {
                    id: string
                    enrollment_id: string
                    amount: number
                    currency: string
                    status: 'pending' | 'completed' | 'failed' | 'refunded'
                    provider: 'stripe' | 'paypal'
                    transaction_id: string | null
                    paid_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    enrollment_id: string
                    amount: number
                    currency?: string
                    status?: 'pending' | 'completed' | 'failed' | 'refunded'
                    provider: 'stripe' | 'paypal'
                    transaction_id?: string | null
                    paid_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    enrollment_id?: string
                    amount?: number
                    currency?: string
                    status?: 'pending' | 'completed' | 'failed' | 'refunded'
                    provider?: 'stripe' | 'paypal'
                    transaction_id?: string | null
                    paid_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
    }
}
