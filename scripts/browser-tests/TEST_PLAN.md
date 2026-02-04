# Browser Test Coverage Plan

> **🤖 AI AGENT:** Use workflow `/browser-tests` to run tests with auto-approval.

**Documentation Sources:**
- `docs/REGISTRATION_SYSTEM_DESCRIPTION.md` - System overview
- `docs/MANUAL_TESTING.md` - 60+ manual test cases
- `docs/api_planning_document.md` - API endpoints
- `docs/profile_view_logic.md` - View switching logic & constraints
- `docs/CALENDAR_DESIGN_PLANNING.md` - Calendar UI & scheduling constraints
- `tests/features/*.feature` - 12 Gherkin files, 70+ scenarios

---

## Test Suites by Portal

### 🔐 Authentication
| Test | Priority | Source | Script |
|------|----------|--------|--------|
| Sign up (Parent) with all fields | High | Gherkin | `test-signup-parent.sh` |
| Password validation (weak password) | High | Gherkin | `test-password-validation.sh` |
| Code of Conduct required | Medium | Gherkin | `test-coc-required.sh` |
| Sign in (Parent) → redirect to /parent | High | Gherkin | `test-login-parent.sh` |
| Sign in (Teacher) → redirect to /teacher | High | Gherkin | `test-login-teacher.sh` |
| Login with wrong password | High | Manual | `test-login-failure.sh` |
| Sign out → redirect to /login | Medium | Gherkin | `test-logout.sh` |
| Session persistence (refresh page) | Medium | Manual | `test-session-persistence.sh` |
| Password reset request | Medium | Gherkin | `test-password-reset.sh` |
| Password update via reset link | Medium | Gherkin | `test-password-update.sh` |

---

### 👨‍👩‍👧 Parent Portal (`/parent`)
| Test | Priority | Source | Script |
|------|----------|--------|--------|
| View dashboard | High | Manual | `test-parent-dashboard.sh` |
| Update profile (phone number) | Medium | Gherkin | `test-parent-update-profile.sh` |
| Add child to family (student) | High | Gherkin | `test-add-child.sh` |
| Add family member (parent/guardian) | Medium | Manual | `test-add-guardian.sh` |
| Update child details (grade level) | Medium | Gherkin | `test-update-child.sh` |
| Delete child profile | Medium | Gherkin | `test-delete-child.sh` |
| Link student via email | Medium | Gherkin | `test-link-student.sh` |
| Browse available classes | High | Manual | `test-browse-classes.sh` |
| View class details | Medium | Manual | `test-view-class-details.sh` |
| Enroll child in open class | High | Gherkin | `test-enrollment.sh` |
| Enroll in full class (rejected) | High | Gherkin | `test-enrollment-full.sh` |
| Duplicate enrollment (rejected) | High | Gherkin | `test-enrollment-duplicate.sh` |
| Enroll blocked student (rejected) | Medium | Gherkin | `test-enrollment-blocked.sh` |
| Cancel pending enrollment | Medium | Gherkin | `test-cancel-enrollment.sh` |
| View enrollments | High | Manual | `test-view-enrollments.sh` |
| Stripe payment checkout | High | Gherkin | `test-payment.sh` |
| Cancel on Stripe page | Medium | Manual | `test-payment-cancel.sh` |
| View payment history | Medium | Manual | `test-payment-history.sh` |

---

### 👩‍🏫 Teacher Portal (`/teacher`)
| Test | Priority | Source | Script |
|------|----------|--------|--------|
| View dashboard | High | Manual | `test-teacher-dashboard.sh` |
| Create class (draft) | High | Gherkin | ✅ `test-class-creation.sh` |
| Update class details | High | Gherkin | `test-edit-class.sh` |
| Publish class (draft → active) | High | Gherkin | `test-publish-class.sh` |
| Cancel class | Medium | Manual | `test-cancel-class.sh` |
| Delete draft class | Medium | Gherkin | `test-delete-draft-class.sh` |
| Cannot delete active class | Medium | Gherkin | `test-delete-active-class.sh` |
| Validate dates (end before start) | Medium | Gherkin | `test-invalid-dates.sh` |
| View student roster | High | Manual | `test-student-roster.sh` |
| Block a student | Medium | Gherkin | `test-block-student.sh` |
| Upload class materials | Medium | Manual | `test-upload-materials.sh` |
| Delete class materials | Low | Manual | `test-delete-materials.sh` |
| Teacher cannot create schedule | Medium | Gherkin | `test-teacher-no-schedule.sh` |
| Switch to Parent view | Medium | Gherkin | `test-teacher-to-parent.sh` |

---

### 🎓 Student Portal (`/student`)
| Test | Priority | Source | Script |
|------|----------|--------|--------|
| View linked dashboard | High | Gherkin | `test-student-dashboard.sh` |
| View weekly schedule | High | Manual | `test-student-schedule.sh` |
| View class details | Medium | Manual | `test-class-details.sh` |
| View class materials | Medium | Gherkin | `test-student-materials.sh` |

---

### ⚙️ Admin Portal (`/admin`)
| Test | Priority | Source | Script |
|------|----------|--------|--------|
| View dashboard | High | Manual | `test-admin-dashboard.sh` |
| List all users | High | Manual | `test-user-list.sh` |
| Promote user role | High | Gherkin | `test-promote-role.sh` |
| Demote user role | Medium | Gherkin | `test-demote-role.sh` |
| Delete user account | Medium | Gherkin | `test-delete-user.sh` |
| Singleton scheduler enforcement | Medium | Gherkin | `test-scheduler-singleton.sh` |
| Teacher cannot be scheduler | Medium | Gherkin | `test-teacher-not-scheduler.sh` |
| Student cannot be scheduler | Medium | Gherkin | `test-student-not-scheduler.sh` |
| View all classes | Medium | Manual | `test-admin-classes.sh` |
| Edit any class (override) | Medium | Gherkin | `test-admin-edit-class.sh` |
| View all enrollments | Medium | Manual | `test-admin-enrollments.sh` |
| Override enrollment status | Medium | Manual | `test-override-enrollment.sh` |
| Force cancel enrollment | Medium | Gherkin | `test-force-cancel.sh` |
| View all payments | Medium | Manual | `test-admin-payments.sh` |
| Process full refund | Medium | Gherkin | `test-refund.sh` |
| Prevent invalid refund | Medium | Gherkin | `test-invalid-refund.sh` |
| CSV export (users) | Low | Manual | `test-export-users.sh` |
| CSV export (classes) | Low | Manual | `test-export-classes.sh` |
| CSV export (enrollments) | Low | Manual | `test-export-enrollments.sh` |
| CSV export (payments) | Low | Manual | `test-export-payments.sh` |
| Update global settings | Low | Gherkin | `test-system-settings.sh` |
| Switch to Parent view | Medium | Gherkin | `test-admin-to-parent.sh` |

---

### 📅 Class Scheduler (`/class-scheduler`)

**Dashboard & Calendar**
| Test | Priority | Source | Script |
|------|----------|--------|--------|
| View dashboard | High | Manual | `test-scheduler-dashboard.sh` |
| View master calendar grid | High | CalDesign | `test-scheduler-calendar.sh` |
| Calendar shows correct X-axis (Day + Blocks 1-5) | High | CalDesign | `test-calendar-xaxis.sh` |
| Calendar shows correct Y-axis (Tue/Thu, Tue, Thu, Wed) | High | CalDesign | `test-calendar-yaxis.sh` |
| Switch to Parent view | Medium | Gherkin | `test-scheduler-to-parent.sh` |

**Class Management**
| Test | Priority | Source | Script |
|------|----------|--------|--------|
| Create class for any teacher | High | Gherkin | `test-scheduler-create.sh` |
| Delete any class | Medium | Gherkin | `test-scheduler-delete.sh` |
| Click class → modal opens | High | CalDesign | `test-class-modal-open.sh` |
| Modal: Update class name | Medium | CalDesign | `test-modal-classname.sh` |
| Modal: Update assigned teacher | Medium | CalDesign | `test-modal-teacher.sh` |
| Modal: Update room location | Low | CalDesign | `test-modal-location.sh` |
| Modal: Update start/end date | Medium | CalDesign | `test-modal-dates.sh` |
| Modal: Update max class size | Medium | CalDesign | `test-modal-capacity.sh` |
| Modal: Update fee | Medium | CalDesign | `test-modal-fee.sh` |
| Modal: Update syllabus URL | Low | CalDesign | `test-modal-syllabus.sh` |
| Modal: Update day pattern | High | CalDesign | `test-modal-day-pattern.sh` |
| Modal: Update time block | High | CalDesign | `test-modal-time-block.sh` |

**Block-Based Scheduling**
| Test | Priority | Source | Script |
|------|----------|--------|--------|
| Class occupies one block at a time | High | CalDesign | `test-one-block-only.sh` |
| Day pattern: Tuesday/Thursday | High | CalDesign | `test-pattern-tue-thu.sh` |
| Day pattern: Tuesday Only | Medium | CalDesign | `test-pattern-tue-only.sh` |
| Day pattern: Thursday Only | Medium | CalDesign | `test-pattern-thu-only.sh` |
| Day pattern: Wednesday Only | Medium | CalDesign | `test-pattern-wed-only.sh` |
| Define semester dates | Low | Gherkin | `test-semester-dates.sh` |

**Drag-and-Drop**
| Test | Priority | Source | Script |
|------|----------|--------|--------|
| Drag class to new block | High | CalDesign | `test-drag-new-block.sh` |
| Drag removes from previous block | High | CalDesign | `test-drag-removes-old.sh` |
| Drag class to new day pattern | Medium | CalDesign | `test-drag-new-day.sh` |

**Teacher Conflict Detection**
| Test | Priority | Source | Script |
|------|----------|--------|--------|
| Prevent overlap: same teacher, same block/day | High | CalDesign | `test-teacher-conflict-block.sh` |
| Conflict error message displayed | High | CalDesign | `test-conflict-error-msg.sh` |
| Conflict prevents save (modal) | High | CalDesign | `test-conflict-blocks-save.sh` |
| Conflict prevents drag-drop | High | CalDesign | `test-conflict-blocks-drag.sh` |

---

### 👑 Super Admin
| Test | Priority | Source | Script |
|------|----------|--------|--------|
| Global view switcher | High | Gherkin | `test-super-admin-switch.sh` |
| Access all portals | Medium | Gherkin | `test-super-admin-access.sh` |
| Bypass RLS (view draft classes) | Low | Manual | `test-rls-bypass.sh` |

---

### 🔗 Student Linking (`tests/features/student_linking.feature`)
| Test | Priority | Source | Script |
|------|----------|--------|--------|
| Parent links student by email | Medium | Gherkin | `test-link-student.sh` |
| Student registers → auto-link | Medium | Gherkin | `test-student-auto-link.sh` |
| Prevent double linking | Medium | Gherkin | `test-double-link.sh` |

---

### 🔄 View Switching (`docs/profile_view_logic.md`)

**Default View Tests**
| Test | Priority | Source | Script |
|------|----------|--------|--------|
| Student login → Student View (default) | High | ViewLogic | `test-student-default-view.sh` |
| Parent login → Parent View (default) | High | ViewLogic | `test-parent-default-view.sh` |
| Teacher login → Teacher View (default) | High | ViewLogic | `test-teacher-default-view.sh` |
| Admin login → Admin View (default) | High | ViewLogic | `test-admin-default-view.sh` |
| Scheduler login → Scheduler View (default) | High | ViewLogic | `test-scheduler-default-view.sh` |
| Super Admin login → Admin View (default) | High | ViewLogic | `test-superadmin-default-view.sh` |

**Toggle Capabilities**
| Test | Priority | Source | Script |
|------|----------|--------|--------|
| Teacher ↔ Parent view toggle | High | ViewLogic | `test-teacher-parent-toggle.sh` |
| Admin ↔ Parent view toggle | High | ViewLogic | `test-admin-parent-toggle.sh` |
| Scheduler ↔ Parent view toggle | High | ViewLogic | `test-scheduler-parent-toggle.sh` |
| Super Admin → Admin view | High | ViewLogic | `test-superadmin-to-admin.sh` |
| Super Admin → Scheduler view | High | ViewLogic | `test-superadmin-to-scheduler.sh` |
| Super Admin → Teacher view | High | ViewLogic | `test-superadmin-to-teacher.sh` |
| Super Admin → Parent view | High | ViewLogic | `test-superadmin-to-parent.sh` |
| Super Admin universal switcher (all 4 views) | High | ViewLogic | `test-superadmin-universal-switcher.sh` |

**Role Constraints (Negative Tests)**
| Test | Priority | Source | Script |
|------|----------|--------|--------|
| Student has NO view toggle | High | ViewLogic | `test-student-no-toggle.sh` |
| Parent has NO view toggle | High | ViewLogic | `test-parent-no-toggle.sh` |
| Teacher CANNOT access Admin view | High | ViewLogic | `test-teacher-no-admin.sh` |
| Teacher CANNOT access Scheduler view | High | ViewLogic | `test-teacher-no-scheduler.sh` |
| Admin CANNOT access Scheduler view | High | ViewLogic | `test-admin-no-scheduler.sh` |
| Scheduler CANNOT be Teacher (role constraint) | Medium | ViewLogic | `test-scheduler-not-teacher.sh` |
| Scheduler CANNOT be Student (role constraint) | Medium | ViewLogic | `test-scheduler-not-student.sh` |

---

### 📦 Enrollment Logic (`tests/features/enrollment_logic.feature`)
| Test | Priority | Source | Script |
|------|----------|--------|--------|
| Enroll with available seats | High | Gherkin | `test-enroll-available.sh` |
| Reject when full | High | Gherkin | `test-enroll-full.sh` |
| Join waitlist when full | Medium | Gherkin | `test-waitlist-join.sh` |
| Prevent waitlist if spots open | Low | Gherkin | `test-waitlist-prevented.sh` |
| Prevent double booking | High | Gherkin | `test-double-booking.sh` |
| Enforce block list | Medium | Gherkin | `test-block-list.sh` |

---

### ⚠️ Edge Cases & Error Handling
| Test | Priority | Source | Script |
|------|----------|--------|--------|
| Submit form with missing fields | Medium | Manual | `test-form-validation.sh` |
| Invalid date range | Medium | Manual | `test-invalid-dates.sh` |
| Unauthorized route access | High | Manual | `test-unauthorized-access.sh` |
| Delete class with enrollments | Medium | Manual | `test-delete-enrolled-class.sh` |

---

### 🔄 Cross-Role Integration Flows
| Flow | Description | Script |
|------|-------------|--------|
| Full enrollment loop | Teacher creates → Parent enrolls → Payment → Roster → Schedule | `test-full-enrollment-flow.sh` |
| Waitlist flow | Full class → Waitlist → Spot opens → Notify | `test-waitlist-flow.sh` |
| Refund flow | Admin refunds → Enrollment reverts → Payment updated | `test-refund-flow.sh` |

---

## Auth State Files Needed

| Role | File |
|------|------|
| Parent | `auth-state-parent.json` |
| Teacher | ✅ `auth-state.json` (exists) |
| Student | `auth-state-student.json` |
| Admin | `auth-state-admin.json` |
| Class Scheduler | `auth-state-scheduler.json` |
| Super Admin | `auth-state-superadmin.json` |

---

## Implementation Phases

### Phase 1: Core Flows ✅
1. ✅ Teacher: Class creation

### Phase 2: Parent Portal
2. Add child to family
3. Browse classes
4. Enrollment flow
5. Payment flow

### Phase 3: Validation & Edge Cases
6. Duplicate enrollment prevention
7. Full class rejection
8. Blocked student rejection
9. Form validation

### Phase 4: Admin & Roles
10. Dashboard & user management
11. Role promotion/demotion
12. View switching
13. Refund processing
14. CSV exports

### Phase 5: Advanced
15. Schedule conflict detection
16. Waitlist logic
17. Student linking
18. Cross-role integration flows
