# Copywriting: Voice & Tone Guidelines

When generating text, adhere to this brand persona.

## Brand Personality Keywords

- Professional but approachable
- Direct and efficient
- Tech-savvy but jargon-free
- Empathetic and supportive (parents managing family activities)

## Grammar & Mechanics

- **Headings:** Use Title Case for main headings (H1, H2). Use sentence case for subheadings (H3+).
- **Punctuation:** Avoid exclamation points (!) in standard interface copy. Use periods for complete sentences.
- **Clarity:** Prefer active voice over passive voice. Keep sentences concise.
- **Lists:** Use sentence fragments in bulleted lists (no trailing periods unless full sentences).

## Terminology Guide

| Do Not Use | Use Instead |
|:-----------|:------------|
| "Utilize" | "Use" |
| "In order to..." | "To..." |
| "Kid" / "Child" (standalone) | "Student" (in class context) or "Family member" (in account context) |
| "Sign up" (for classes) | "Enroll" |
| "Cancel slot" | "Cancel enrollment" |
| "Pending approval" | "Pending" |
| "On the wait list" | "Waitlisted" |
| "Dropped" / "Removed" | "Cancelled" |
| "Slot" / "Spot" | "Seat" (for capacity) |
| "Class time" | "Class session" |
| "Teacher account" | "Teacher portal" |
| "Admin page" | "Admin portal" |

## Enrollment Status Labels

Use these exact labels consistently across the UI:

| Status | Label | Badge Color | Context |
|--------|-------|-------------|---------|
| Confirmed | "Confirmed" | Green | Student has a seat |
| Pending | "Pending" | Yellow | Awaiting payment or admin approval |
| Waitlisted | "Waitlisted" | Orange | No seat available; queued |
| Cancelled | "Cancelled" | Red/Pink | Enrollment removed |

## Message Patterns

### Success Messages

- Keep short: "Enrollment confirmed" not "Your enrollment has been successfully confirmed!"
- Include the relevant entity: "Enrolled [Student Name] in [Class Name]"
- Use toast notifications, not modal dialogs

### Error Messages

- State what happened, then what to do: "Payment failed. Please check your card details and try again."
- Never blame the user: "We couldn't process that" not "You entered invalid data"
- Avoid technical jargon: "Something went wrong" not "500 Internal Server Error"

### Empty States

- Be helpful, not apologetic: "No classes scheduled yet. Create your first class to get started."
- Include a call to action when possible
- Avoid "Oops!" or other filler exclamations

### Confirmation Prompts

- State the consequence clearly: "Cancel enrollment for [Name]? Their seat will be released."
- Use the verb in the confirm button: "Cancel Enrollment" not "OK" or "Yes"
