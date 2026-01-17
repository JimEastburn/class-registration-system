# API Planning Document
## Class Registration System - OpenAPI 3.0 Specification

---

## Overview

This document defines the REST API design for the class registration system based on the **OpenAPI 3.0** specification. The API follows RESTful conventions and is designed for CRUD operations with a focus on clarity, consistency, and security.

---

## User Review Required

> [!IMPORTANT]
> **API Versioning Strategy**: This plan uses URL path versioning (`/api/v1/`). Please confirm this approach or suggest alternatives (header versioning, query param versioning).

> [!IMPORTANT]
> **Authentication Approach**: The API assumes Supabase Auth with JWT tokens. If using a different auth provider, the authentication endpoints will need adjustment.

---

## API Design Principles

### 1. RESTful Resource Naming
- Use **plural nouns** for resources: `/users`, `/classes`, `/enrollments`
- Use **kebab-case** for multi-word resources: `/family-members`
- Use **resource nesting** for relationships: `/classes/{classId}/enrollments`

### 2. HTTP Methods for CRUD
| Operation | HTTP Method | Example |
|-----------|-------------|---------|
| Create | `POST` | `POST /classes` |
| Read (list) | `GET` | `GET /classes` |
| Read (single) | `GET` | `GET /classes/{id}` |
| Update (full) | `PUT` | `PUT /classes/{id}` |
| Update (partial) | `PATCH` | `PATCH /classes/{id}` |
| Delete | `DELETE` | `DELETE /classes/{id}` |

### 3. Response Codes
| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful read/update |
| 201 | Created | Successful creation |
| 204 | No Content | Successful deletion |
| 400 | Bad Request | Validation errors |
| 401 | Unauthorized | Missing/invalid auth |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate/constraint violation |
| 422 | Unprocessable Entity | Business logic errors |
| 500 | Server Error | Unexpected errors |

### 4. Pagination
All list endpoints support:
- `?page=1` - Page number (1-indexed)
- `?limit=20` - Items per page (default: 20, max: 100)
- `?sort=created_at` - Sort field
- `?order=desc` - Sort order (asc/desc)

### 5. Filtering
List endpoints support query parameter filtering:
- `GET /classes?status=active`
- `GET /enrollments?student_id=uuid`

---

## API Endpoints Overview

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Register a new user |
| `POST` | `/auth/login` | Login with email/password |
| `POST` | `/auth/logout` | Logout current session |
| `POST` | `/auth/refresh` | Refresh access token |
| `POST` | `/auth/forgot-password` | Request password reset |
| `POST` | `/auth/reset-password` | Reset password with token |
| `GET` | `/auth/me` | Get current user profile |

### Users (`/api/v1/users`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/users` | List users (admin only) |
| `GET` | `/users/{id}` | Get user by ID |
| `PATCH` | `/users/{id}` | Update user profile |
| `DELETE` | `/users/{id}` | Deactivate user |

### Family Members (`/api/v1/family-members`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/family-members` | List current user's family |
| `POST` | `/family-members` | Add family member |
| `GET` | `/family-members/{id}` | Get family member |
| `PATCH` | `/family-members/{id}` | Update family member |
| `DELETE` | `/family-members/{id}` | Remove family member |

### Teachers (`/api/v1/teachers`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/teachers` | List all teachers |
| `GET` | `/teachers/{id}` | Get teacher profile |
| `GET` | `/teachers/{id}/classes` | Get teacher's classes |

### Classes (`/api/v1/classes`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/classes` | List available classes |
| `POST` | `/classes` | Create class (teacher) |
| `GET` | `/classes/{id}` | Get class details |
| `PATCH` | `/classes/{id}` | Update class |
| `DELETE` | `/classes/{id}` | Delete/cancel class |
| `GET` | `/classes/{id}/enrollments` | List class enrollments |
| `GET` | `/classes/{id}/students` | List enrolled students |

### Enrollments (`/api/v1/enrollments`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/enrollments` | List user's enrollments |
| `POST` | `/enrollments` | Enroll in a class |
| `GET` | `/enrollments/{id}` | Get enrollment details |
| `PATCH` | `/enrollments/{id}` | Update enrollment |
| `DELETE` | `/enrollments/{id}` | Cancel enrollment |

### Payments (`/api/v1/payments`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/payments/checkout` | Create checkout session |
| `GET` | `/payments/{id}` | Get payment details |
| `GET` | `/payments/history` | List payment history |
| `POST` | `/payments/webhook` | Stripe webhook handler |

### Student Schedule (`/api/v1/schedule`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/schedule` | Get student's schedule |
| `GET` | `/schedule/calendar` | Get schedule in iCal format |

---

## OpenAPI 3.0.3 Specification

```yaml
openapi: 3.0.3
info:
  title: Class Registration System API
  description: |
    RESTful API for a class registration system supporting parents, teachers, and students.
    This API enables user management, class creation, enrollment, and payment processing.
  version: 1.0.0
  contact:
    name: API Support
    email: support@example.com
  license:
    name: MIT
    
servers:
  - url: https://api.example.com/api/v1
    description: Production server
  - url: https://staging-api.example.com/api/v1
    description: Staging server
  - url: http://localhost:3000/api/v1
    description: Development server

tags:
  - name: Authentication
    description: User authentication and session management
  - name: Users
    description: User profile management
  - name: Family Members
    description: Parent's family member management
  - name: Teachers
    description: Teacher profiles and classes
  - name: Classes
    description: Class management and discovery
  - name: Enrollments
    description: Class enrollment operations
  - name: Payments
    description: Payment processing
  - name: Schedule
    description: Student schedule views

security:
  - bearerAuth: []

paths:
  # ============================================
  # AUTHENTICATION
  # ============================================
  /auth/register:
    post:
      tags: [Authentication]
      summary: Register a new user
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RegisterRequest'
      responses:
        '201':
          description: User registered successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '409':
          description: Email already exists
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /auth/login:
    post:
      tags: [Authentication]
      summary: Login with email and password
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'

  /auth/logout:
    post:
      tags: [Authentication]
      summary: Logout current session
      responses:
        '204':
          description: Logged out successfully
        '401':
          $ref: '#/components/responses/Unauthorized'

  /auth/refresh:
    post:
      tags: [Authentication]
      summary: Refresh access token
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [refresh_token]
              properties:
                refresh_token:
                  type: string
      responses:
        '200':
          description: Token refreshed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'

  /auth/me:
    get:
      tags: [Authentication]
      summary: Get current user profile
      responses:
        '200':
          description: Current user profile
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '401':
          $ref: '#/components/responses/Unauthorized'

  # ============================================
  # USERS
  # ============================================
  /users:
    get:
      tags: [Users]
      summary: List all users (admin only)
      parameters:
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
        - name: role
          in: query
          schema:
            $ref: '#/components/schemas/UserRole'
      responses:
        '200':
          description: List of users
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserListResponse'
        '403':
          $ref: '#/components/responses/Forbidden'

  /users/{id}:
    get:
      tags: [Users]
      summary: Get user by ID
      parameters:
        - $ref: '#/components/parameters/IdParam'
      responses:
        '200':
          description: User details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          $ref: '#/components/responses/NotFound'
    
    patch:
      tags: [Users]
      summary: Update user profile
      parameters:
        - $ref: '#/components/parameters/IdParam'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateUserRequest'
      responses:
        '200':
          description: User updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'

  # ============================================
  # FAMILY MEMBERS
  # ============================================
  /family-members:
    get:
      tags: [Family Members]
      summary: List current user's family members
      responses:
        '200':
          description: List of family members
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/FamilyMember'
    
    post:
      tags: [Family Members]
      summary: Add a family member
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateFamilyMemberRequest'
      responses:
        '201':
          description: Family member added
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/FamilyMember'
        '400':
          $ref: '#/components/responses/BadRequest'

  /family-members/{id}:
    get:
      tags: [Family Members]
      summary: Get family member details
      parameters:
        - $ref: '#/components/parameters/IdParam'
      responses:
        '200':
          description: Family member details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/FamilyMember'
        '404':
          $ref: '#/components/responses/NotFound'
    
    patch:
      tags: [Family Members]
      summary: Update family member
      parameters:
        - $ref: '#/components/parameters/IdParam'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateFamilyMemberRequest'
      responses:
        '200':
          description: Family member updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/FamilyMember'
    
    delete:
      tags: [Family Members]
      summary: Remove family member
      parameters:
        - $ref: '#/components/parameters/IdParam'
      responses:
        '204':
          description: Family member removed
        '404':
          $ref: '#/components/responses/NotFound'

  # ============================================
  # TEACHERS
  # ============================================
  /teachers:
    get:
      tags: [Teachers]
      summary: List all teachers
      parameters:
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
      responses:
        '200':
          description: List of teachers
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Teacher'
                  pagination:
                    $ref: '#/components/schemas/Pagination'

  /teachers/{id}:
    get:
      tags: [Teachers]
      summary: Get teacher profile
      parameters:
        - $ref: '#/components/parameters/IdParam'
      responses:
        '200':
          description: Teacher profile
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Teacher'
        '404':
          $ref: '#/components/responses/NotFound'

  /teachers/{id}/classes:
    get:
      tags: [Teachers]
      summary: Get teacher's classes
      parameters:
        - $ref: '#/components/parameters/IdParam'
        - name: status
          in: query
          schema:
            $ref: '#/components/schemas/ClassStatus'
      responses:
        '200':
          description: Teacher's classes
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Class'

  # ============================================
  # CLASSES
  # ============================================
  /classes:
    get:
      tags: [Classes]
      summary: List available classes
      security: []
      parameters:
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
        - name: teacher_id
          in: query
          schema:
            type: string
            format: uuid
        - name: status
          in: query
          schema:
            $ref: '#/components/schemas/ClassStatus'
        - name: search
          in: query
          schema:
            type: string
          description: Search by class name or description
      responses:
        '200':
          description: List of classes
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ClassListResponse'
    
    post:
      tags: [Classes]
      summary: Create a new class (teacher only)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateClassRequest'
      responses:
        '201':
          description: Class created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Class'
        '400':
          $ref: '#/components/responses/BadRequest'
        '403':
          $ref: '#/components/responses/Forbidden'

  /classes/{id}:
    get:
      tags: [Classes]
      summary: Get class details
      security: []
      parameters:
        - $ref: '#/components/parameters/IdParam'
      responses:
        '200':
          description: Class details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ClassDetail'
        '404':
          $ref: '#/components/responses/NotFound'
    
    patch:
      tags: [Classes]
      summary: Update class details
      parameters:
        - $ref: '#/components/parameters/IdParam'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateClassRequest'
      responses:
        '200':
          description: Class updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Class'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
    
    delete:
      tags: [Classes]
      summary: Delete or cancel a class
      parameters:
        - $ref: '#/components/parameters/IdParam'
      responses:
        '204':
          description: Class deleted
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'

  /classes/{id}/enrollments:
    get:
      tags: [Classes]
      summary: List enrollments for a class
      parameters:
        - $ref: '#/components/parameters/IdParam'
        - name: status
          in: query
          schema:
            $ref: '#/components/schemas/EnrollmentStatus'
      responses:
        '200':
          description: Class enrollments
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Enrollment'
        '403':
          $ref: '#/components/responses/Forbidden'

  /classes/{id}/students:
    get:
      tags: [Classes]
      summary: List enrolled students
      parameters:
        - $ref: '#/components/parameters/IdParam'
      responses:
        '200':
          description: Enrolled students
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/StudentSummary'
        '403':
          $ref: '#/components/responses/Forbidden'

  # ============================================
  # ENROLLMENTS
  # ============================================
  /enrollments:
    get:
      tags: [Enrollments]
      summary: List user's enrollments
      parameters:
        - name: student_id
          in: query
          schema:
            type: string
            format: uuid
        - name: status
          in: query
          schema:
            $ref: '#/components/schemas/EnrollmentStatus'
      responses:
        '200':
          description: User's enrollments
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/EnrollmentWithClass'
    
    post:
      tags: [Enrollments]
      summary: Enroll a student in a class
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateEnrollmentRequest'
      responses:
        '201':
          description: Enrollment created (pending payment)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EnrollmentWithPayment'
        '400':
          $ref: '#/components/responses/BadRequest'
        '409':
          description: Already enrolled or class is full

  /enrollments/{id}:
    get:
      tags: [Enrollments]
      summary: Get enrollment details
      parameters:
        - $ref: '#/components/parameters/IdParam'
      responses:
        '200':
          description: Enrollment details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EnrollmentDetail'
        '404':
          $ref: '#/components/responses/NotFound'
    
    delete:
      tags: [Enrollments]
      summary: Cancel enrollment
      parameters:
        - $ref: '#/components/parameters/IdParam'
      responses:
        '204':
          description: Enrollment cancelled
        '404':
          $ref: '#/components/responses/NotFound'

  # ============================================
  # PAYMENTS
  # ============================================
  /payments/checkout:
    post:
      tags: [Payments]
      summary: Create a checkout session
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CheckoutRequest'
      responses:
        '200':
          description: Checkout session created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CheckoutResponse'
        '400':
          $ref: '#/components/responses/BadRequest'

  /payments/{id}:
    get:
      tags: [Payments]
      summary: Get payment details
      parameters:
        - $ref: '#/components/parameters/IdParam'
      responses:
        '200':
          description: Payment details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Payment'
        '404':
          $ref: '#/components/responses/NotFound'

  /payments/history:
    get:
      tags: [Payments]
      summary: Get payment history
      parameters:
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
      responses:
        '200':
          description: Payment history
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Payment'
                  pagination:
                    $ref: '#/components/schemas/Pagination'

  /payments/webhook:
    post:
      tags: [Payments]
      summary: Stripe webhook endpoint
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
      responses:
        '200':
          description: Webhook processed
        '400':
          description: Invalid webhook signature

  # ============================================
  # SCHEDULE
  # ============================================
  /schedule:
    get:
      tags: [Schedule]
      summary: Get student's class schedule
      parameters:
        - name: student_id
          in: query
          schema:
            type: string
            format: uuid
        - name: start_date
          in: query
          schema:
            type: string
            format: date
        - name: end_date
          in: query
          schema:
            type: string
            format: date
      responses:
        '200':
          description: Student schedule
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/ScheduleItem'

  /schedule/calendar:
    get:
      tags: [Schedule]
      summary: Get schedule in iCalendar format
      parameters:
        - name: student_id
          in: query
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: iCalendar file
          content:
            text/calendar:
              schema:
                type: string

# ============================================
# COMPONENTS
# ============================================
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  parameters:
    IdParam:
      name: id
      in: path
      required: true
      schema:
        type: string
        format: uuid
    
    PageParam:
      name: page
      in: query
      schema:
        type: integer
        minimum: 1
        default: 1
    
    LimitParam:
      name: limit
      in: query
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 20

  responses:
    BadRequest:
      description: Bad request - validation error
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ValidationError'
    
    Unauthorized:
      description: Unauthorized - authentication required
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    
    Forbidden:
      description: Forbidden - insufficient permissions
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    
    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

  schemas:
    # ========== Enums ==========
    UserRole:
      type: string
      enum: [parent, teacher, student, admin]
    
    ClassStatus:
      type: string
      enum: [draft, active, cancelled, completed]
    
    EnrollmentStatus:
      type: string
      enum: [pending, confirmed, cancelled, completed]
    
    PaymentStatus:
      type: string
      enum: [pending, completed, failed, refunded]
    
    Relationship:
      type: string
      enum: [child, spouse, guardian, other]
    
    GradeLevel:
      type: string
      enum: ['6', '7', '8', '9', '10', '11', '12']

    # ========== Common ==========
    Error:
      type: object
      required: [error, message]
      properties:
        error:
          type: string
        message:
          type: string
        code:
          type: string
    
    ValidationError:
      type: object
      required: [error, message, details]
      properties:
        error:
          type: string
          example: validation_error
        message:
          type: string
        details:
          type: array
          items:
            type: object
            properties:
              field:
                type: string
              message:
                type: string
    
    Pagination:
      type: object
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer
        total_pages:
          type: integer

    # ========== Auth ==========
    RegisterRequest:
      type: object
      required: [email, password, role, first_name, last_name]
      properties:
        email:
          type: string
          format: email
        password:
          type: string
          minLength: 8
        role:
          $ref: '#/components/schemas/UserRole'
        first_name:
          type: string
        last_name:
          type: string
        phone:
          type: string
    
    LoginRequest:
      type: object
      required: [email, password]
      properties:
        email:
          type: string
          format: email
        password:
          type: string
    
    AuthResponse:
      type: object
      properties:
        access_token:
          type: string
        refresh_token:
          type: string
        expires_in:
          type: integer
        user:
          $ref: '#/components/schemas/User'

    # ========== Users ==========
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        role:
          $ref: '#/components/schemas/UserRole'
        first_name:
          type: string
        last_name:
          type: string
        phone:
          type: string
        avatar_url:
          type: string
          format: uri
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time
    
    UpdateUserRequest:
      type: object
      properties:
        first_name:
          type: string
        last_name:
          type: string
        phone:
          type: string
        avatar_url:
          type: string
          format: uri
    
    UserListResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/User'
        pagination:
          $ref: '#/components/schemas/Pagination'

    # ========== Family Members ==========
    FamilyMember:
      type: object
      properties:
        id:
          type: string
          format: uuid
        parent_id:
          type: string
          format: uuid
        first_name:
          type: string
        last_name:
          type: string
        grade_level:
          $ref: '#/components/schemas/GradeLevel'
        relationship:
          $ref: '#/components/schemas/Relationship'
        birth_date:
          type: string
          format: date
        notes:
          type: string
        created_at:
          type: string
          format: date-time
    
    CreateFamilyMemberRequest:
      type: object
      required: [first_name, last_name, relationship]
      properties:
        first_name:
          type: string
        last_name:
          type: string
        grade_level:
          $ref: '#/components/schemas/GradeLevel'
        relationship:
          $ref: '#/components/schemas/Relationship'
        birth_date:
          type: string
          format: date
        notes:
          type: string
    
    UpdateFamilyMemberRequest:
      type: object
      properties:
        first_name:
          type: string
        last_name:
          type: string
        grade_level:
          $ref: '#/components/schemas/GradeLevel'
        relationship:
          $ref: '#/components/schemas/Relationship'
        birth_date:
          type: string
          format: date
        notes:
          type: string

    # ========== Teachers ==========
    Teacher:
      type: object
      properties:
        id:
          type: string
          format: uuid
        first_name:
          type: string
        last_name:
          type: string
        email:
          type: string
          format: email
        bio:
          type: string
        avatar_url:
          type: string
          format: uri
        specializations:
          type: array
          items:
            type: string

    # ========== Classes ==========
    Class:
      type: object
      properties:
        id:
          type: string
          format: uuid
        teacher_id:
          type: string
          format: uuid
        name:
          type: string
        description:
          type: string
        status:
          $ref: '#/components/schemas/ClassStatus'
        location:
          type: string
        start_date:
          type: string
          format: date
        end_date:
          type: string
          format: date
        schedule:
          type: string
          description: "e.g., 'Mon/Wed 3:00 PM - 4:30 PM'"
        max_students:
          type: integer
        current_enrollment:
          type: integer
        fee:
          type: number
          format: decimal
        created_at:
          type: string
          format: date-time
    
    ClassDetail:
      allOf:
        - $ref: '#/components/schemas/Class'
        - type: object
          properties:
            teacher:
              $ref: '#/components/schemas/Teacher'
            syllabus:
              type: string
            materials:
              type: array
              items:
                type: object
                properties:
                  name:
                    type: string
                  url:
                    type: string
                    format: uri
    
    CreateClassRequest:
      type: object
      required: [name, location, start_date, end_date, schedule, max_students, fee]
      properties:
        name:
          type: string
        description:
          type: string
        location:
          type: string
        start_date:
          type: string
          format: date
        end_date:
          type: string
          format: date
        schedule:
          type: string
        max_students:
          type: integer
          minimum: 1
        fee:
          type: number
          format: decimal
          minimum: 0
        syllabus:
          type: string
    
    UpdateClassRequest:
      type: object
      properties:
        name:
          type: string
        description:
          type: string
        location:
          type: string
        schedule:
          type: string
        max_students:
          type: integer
        fee:
          type: number
          format: decimal
        syllabus:
          type: string
        status:
          $ref: '#/components/schemas/ClassStatus'
    
    ClassListResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/Class'
        pagination:
          $ref: '#/components/schemas/Pagination'

    # ========== Enrollments ==========
    Enrollment:
      type: object
      properties:
        id:
          type: string
          format: uuid
        student_id:
          type: string
          format: uuid
        class_id:
          type: string
          format: uuid
        status:
          $ref: '#/components/schemas/EnrollmentStatus'
        enrolled_at:
          type: string
          format: date-time
    
    EnrollmentWithClass:
      allOf:
        - $ref: '#/components/schemas/Enrollment'
        - type: object
          properties:
            class:
              $ref: '#/components/schemas/Class'
    
    EnrollmentWithPayment:
      allOf:
        - $ref: '#/components/schemas/Enrollment'
        - type: object
          properties:
            payment:
              $ref: '#/components/schemas/Payment'
            checkout_url:
              type: string
              format: uri
    
    EnrollmentDetail:
      allOf:
        - $ref: '#/components/schemas/Enrollment'
        - type: object
          properties:
            student:
              $ref: '#/components/schemas/FamilyMember'
            class:
              $ref: '#/components/schemas/ClassDetail'
            payment:
              $ref: '#/components/schemas/Payment'
    
    CreateEnrollmentRequest:
      type: object
      required: [student_id, class_id]
      properties:
        student_id:
          type: string
          format: uuid
        class_id:
          type: string
          format: uuid
    
    StudentSummary:
      type: object
      properties:
        id:
          type: string
          format: uuid
        first_name:
          type: string
        last_name:
          type: string
        grade_level:
          $ref: '#/components/schemas/GradeLevel'
        parent_email:
          type: string
          format: email

    # ========== Payments ==========
    Payment:
      type: object
      properties:
        id:
          type: string
          format: uuid
        enrollment_id:
          type: string
          format: uuid
        amount:
          type: number
          format: decimal
        currency:
          type: string
          default: USD
        status:
          $ref: '#/components/schemas/PaymentStatus'
        provider:
          type: string
          enum: [stripe, paypal]
        transaction_id:
          type: string
        paid_at:
          type: string
          format: date-time
        created_at:
          type: string
          format: date-time
    
    CheckoutRequest:
      type: object
      required: [enrollment_id]
      properties:
        enrollment_id:
          type: string
          format: uuid
        provider:
          type: string
          enum: [stripe, paypal]
          default: stripe
        success_url:
          type: string
          format: uri
        cancel_url:
          type: string
          format: uri
    
    CheckoutResponse:
      type: object
      properties:
        checkout_url:
          type: string
          format: uri
        session_id:
          type: string

    # ========== Schedule ==========
    ScheduleItem:
      type: object
      properties:
        class_id:
          type: string
          format: uuid
        class_name:
          type: string
        teacher_name:
          type: string
        location:
          type: string
        start_time:
          type: string
          format: date-time
        end_time:
          type: string
          format: date-time
        status:
          $ref: '#/components/schemas/ClassStatus'
```

---

## API Usage Examples

### Register a New Parent

```bash
curl -X POST https://api.example.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "parent@example.com",
    "password": "SecurePass123!",
    "role": "parent",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1-555-123-4567"
  }'
```

### Add a Child to Family

```bash
curl -X POST https://api.example.com/api/v1/family-members \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "last_name": "Doe",
    "relationship": "child",
    "grade_level": "9",
    "birth_date": "2010-05-15"
  }'
```

### Create a Class (Teacher)

```bash
curl -X POST https://api.example.com/api/v1/classes \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Introduction to Algebra",
    "description": "Foundation algebra course for 8th-9th graders",
    "location": "Room 101, Main Building",
    "start_date": "2026-02-01",
    "end_date": "2026-05-15",
    "schedule": "Tue/Thu 4:00 PM - 5:30 PM",
    "max_students": 20,
    "fee": 150.00,
    "syllabus": "Week 1: Variables and expressions..."
  }'
```

### Enroll Student in Class

```bash
curl -X POST https://api.example.com/api/v1/enrollments \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "123e4567-e89b-12d3-a456-426614174000",
    "class_id": "987fcdeb-51a2-34b5-c678-426614174999"
  }'
```

### Create Payment Checkout

```bash
curl -X POST https://api.example.com/api/v1/payments/checkout \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "enrollment_id": "456e7890-e12b-34d5-a678-426614175000",
    "provider": "stripe",
    "success_url": "https://example.com/payment/success",
    "cancel_url": "https://example.com/payment/cancel"
  }'
```

---

## Error Response Examples

### Validation Error (400)
```json
{
  "error": "validation_error",
  "message": "Request validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

### Unauthorized (401)
```json
{
  "error": "unauthorized",
  "message": "Authentication required",
  "code": "AUTH_REQUIRED"
}
```

### Forbidden (403)
```json
{
  "error": "forbidden",
  "message": "You do not have permission to perform this action",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

### Not Found (404)
```json
{
  "error": "not_found",
  "message": "Class not found",
  "code": "RESOURCE_NOT_FOUND"
}
```

---

## Next Steps

1. ✅ Review and approve this API specification
2. ⏳ Generate API client SDK from OpenAPI spec
3. ⏳ Generate API documentation (Swagger UI / Redoc)
4. ⏳ Implement API endpoints
5. ⏳ Write API integration tests
6. ⏳ Set up API versioning infrastructure

---

## Appendix: OpenAPI Tools

### Code Generation
- **openapi-generator-cli** - Generate client SDKs in multiple languages
- **@openapitools/openapi-generator-cli** - NPM package for CI/CD

### Documentation
- **Swagger UI** - Interactive API documentation
- **Redoc** - Beautiful API reference documentation
- **Stoplight Elements** - Modern API documentation

### Validation
- **@readme/openapi-parser** - Validate OpenAPI spec
- **spectral** - Lint OpenAPI documents

### Testing
- **Prism** - Mock server from OpenAPI spec
- **Dredd** - API testing against spec
