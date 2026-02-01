# Class Scheduler Calendar Design Plan

## Overview

- **Primary Feature:** A calendar interface to display and manage class schedules.
- **Access Control:** Restricted strictly to the `Class Scheduler` role.
- **Core Action:** Drag-and-drop functionality to move classes between different times and days.

## Scheduling Constraints & Logic

- **Block-Based Scheduling:** Classes are assigned to specific "Blocks" (e.g., Block 1, Block 2), not specific arbitrary times.
- **Exclusivity:** A class can only occupy one block at a time.
- **Schedule Patterns:** A class can be assigned to one of the following day patterns:
  - Tuesday/Thursday
  - Tuesday Only
  - Only Thursday
  - Wednesday Only
- **Teacher Conflicts:** A teacher can only be assigned to _one_ class per block per day.

## Interaction Design

### Drag and Drop

- Dragging a class to a new block automatically removes it from the previous block and assigns it to the new one.

### Class Management Modal

Clicking on a class opens a modal with a form to update details.

#### Form Fields

- Class Name
- Assigned Teacher
- Room Location
- Start & End Date
- Max Student Class Size
- Fee
- Syllabus URL
- Days of the Week (Pattern)
- Time Block

#### Validation

- **Teacher Availability Check:** When updating a class (via form or drag-and-drop), the system must check if the assigned teacher is already teaching another class in the target block/day.
- **Error Handling:** If a conflict exists, show an error message and prevent the update.

## Calendar Grid Layout

The calendar is organized as a matrix:

| Axis              | Labels / Structure                                            |
| :---------------- | :------------------------------------------------------------ |
| **X-Axis (Top)**  | Day • Block 1 • Block 2 • Lunch • Block 3 • Block 4 • Block 5 |
| **Y-Axis (Left)** | Tuesday/Thursday • Tuesday • Thursday • Wednesday             |
