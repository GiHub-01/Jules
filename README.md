# Absent

> A personal semester and absence management web application that helps students manage semesters, courses, absence limits, and recovery status in one place.

## 🌐 Live Application

**Production:** https://absence-sigma.vercel.app

**GitHub Repository:** https://github.com/GiHub-01/Jules

---

## 📌 Overview

Absent is a full-stack student attendance/absence management application built with Next.js and Supabase.

The core idea is simple:

- Create and manage semesters.
- Add courses to the active semester.
- Define the maximum number of absences allowed for each course.
- Record, edit, and delete absences.
- See how many absences remain for each course.
- Monitor semester health from the dashboard.
- Receive recovery recommendations when approaching or reaching an absence limit.
- Preserve completed semesters so historical data can be viewed and previous semesters can be activated again.

The application is designed around a **maximum allowed absences** model. It does not attempt to calculate attendance percentage from total classes conducted. This keeps the system simple and focused on the student's actual absence allowance.

---

# ✨ Features

## 🔐 Authentication

- User signup
- User login
- User logout
- Supabase Authentication
- Persistent authenticated sessions
- Protected application routes
- User-specific database access

---

## 📚 Semester Management

Users can manage their academic semesters from a dedicated Semester page.

### Current semester

The active semester displays:

- Semester name
- Start date
- End date
- Active status
- Edit functionality
- End/deactivate functionality

### Previous semesters

Completed semesters are preserved instead of being deleted.

For every previous semester, users can:

- View historical information
- See its courses
- See historical absence counts
- See maximum allowed absences
- See remaining absence allowance
- Activate the semester again if needed

### Historical semester summary

The View section provides a summary including:

- Number of courses
- Total absences
- Total allowed absences

Historical course information is displayed separately from the currently active semester.

---

# 📖 Course Management

Courses belong to a specific semester.

Users can:

- Add courses
- Edit courses
- Delete courses
- Set course code
- Set course name
- Set instructor information
- Set maximum allowed absences

Each course maintains its own absence limit.

### Example

```text
Computer Networks
Code: CS301

Maximum Allowed Absences: 10
Absences Taken: 4
Absences Remaining: 6
```

---

# 📝 Absence Management

Users can record absences against courses in the active semester.

Each absence can contain:

- Course
- Date
- Reason
- Optional note

Users can:

- Record an absence
- Edit an absence
- Delete an absence
- Select from saved reasons
- Add custom reasons

The application prevents users from exceeding a course's configured maximum absence allowance.

---

# 📊 Dashboard

The Dashboard provides a high-level view of the active semester.

It includes:

### Current Semester

Displays:

- Current semester name
- Start date
- End date
- Link to semester management

### Course Overview

Shows the number of courses in the active semester.

### Semester Health

Courses are classified according to their remaining absence allowance:

| Status | Meaning |
|---|---|
| 🟢 Safe | More than 2 absences remaining |
| 🟡 Getting Close | 1–2 absences remaining |
| 🔴 Limit Reached | 0 absences remaining |

The overall semester health is determined from the course statuses.

### Attendance Overview

Each course displays:

- Course name
- Course code
- Absences used
- Maximum allowed absences
- Progress indicator
- Remaining absences
- Current course status

Example:

```text
Operating Systems
CS302

Absences used: 6 / 8

██████████████░░

2 absences remaining
🟡 Getting Close
```

### Recovery Recommendations

The Dashboard provides contextual recommendations:

- Warn when a course is close to its limit.
- Warn when a course has reached its limit.
- Confirm when all courses are in a comfortable state.

### Recent Absences

Recent absence records can be expanded or collapsed to keep the Dashboard compact.

---

# 🌓 Dark Mode

The application supports:

- Light mode
- Dark mode
- Persistent theme selection

The selected theme is stored locally so it remains available after refreshing the page.

---

# 📱 Responsive Design

The UI is designed to work on:

- Desktop
- Laptop
- Tablet
- Mobile

The production application has been tested on both desktop and mobile.

---

# 🔒 Security

The application uses Supabase Row Level Security (RLS).

User-specific data is protected so that users can access only their own records.

Protected resources include:

- Profiles
- Semesters
- Courses
- Absences
- Absence reasons

The ownership model is based on the authenticated Supabase user.

Conceptually:

```text
User A
  │
  ├── Own semesters
  ├── Own courses
  ├── Own absences
  └── Own absence reasons

User B
  │
  ├── Own semesters
  ├── Own courses
  ├── Own absences
  └── Own absence reasons
```

A user should not be able to access another user's application data.

---

# 🏗️ Application Architecture

The application follows a Next.js App Router structure.

High-level architecture:

```text
Browser
   │
   ▼
Next.js Application
   │
   ├── Authentication
   │       │
   │       ▼
   │    Supabase Auth
   │
   ├── UI / Pages
   │       ├── Dashboard
   │       ├── Semester
   │       ├── Courses
   │       ├── Absences
   │       ├── Login
   │       └── Signup
   │
   └── Supabase Client
           │
           ▼
      Supabase Database
           │
           └── PostgreSQL + RLS
```

---

# 🗂️ Project Structure

The main application structure is:

```text
Jules/
│
├── src/
│   └── app/
│       ├── absences/
│       │   └── page.tsx
│       │
│       ├── components/
│       │   └── Navbar.tsx
│       │
│       ├── courses/
│       │   └── page.tsx
│       │
│       ├── dashboard/
│       │   └── page.tsx
│       │
│       ├── login/
│       │   └── page.tsx
│       │
│       ├── semester/
│       │   └── page.tsx
│       │
│       ├── signup/
│       │   └── page.tsx
│       │
│       ├── globals.css
│       ├── layout.tsx
│       └── proxy.ts
│
├── public/
│
├── .env.local
├── .gitignore
├── package.json
└── README.md
```

> The exact supporting files may vary as the project evolves.

---

# 🛠️ Tech Stack

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

## Backend / Database

- Supabase
- PostgreSQL
- Supabase Authentication
- Row Level Security (RLS)

## Deployment

- Vercel

## Version Control

- Git
- GitHub

---

# 🚀 Getting Started

## Prerequisites

Install:

- Node.js
- npm
- Git

You also need a Supabase project.

---

## 1. Clone the repository

```bash
git clone https://github.com/GiHub-01/Jules.git
```

Enter the project:

```bash
cd Jules
```

---

## 2. Install dependencies

```bash
npm install
```

---

## 3. Configure environment variables

Create a file named:

```text
.env.local
```

Add the Supabase environment variables used by the application.

Example:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

### Important

Never commit `.env.local`.

The repository's `.gitignore` already ignores:

```text
.env*
```

Do not place service-role keys or other server secrets in publicly exposed client-side variables.

---

# ▶️ Run the Development Server

Start Next.js:

```bash
npm run dev
```

The application will normally be available at:

```text
http://localhost:3000
```

For testing the application from another device on the same local network, the development server can be started with a network hostname/IP as appropriate for the local machine.

---

# 🧪 Production Build

Before deployment, verify that the application builds successfully:

```bash
npm run build
```

A successful build should finish without TypeScript or compilation errors.

---

# 🔄 Development Workflow

A typical development workflow is:

```text
1. Make a change
      ↓
2. Run the application
      ↓
3. Test locally
      ↓
4. Run npm run build
      ↓
5. Review git diff/status
      ↓
6. Commit
      ↓
7. Push to GitHub
      ↓
8. Vercel deploys the new version
      ↓
9. Test production
```

Useful Git commands:

```bash
git status
git add .
git commit -m "Describe your change"
git push origin main
```

---

# ☁️ Deployment

The production application is deployed using Vercel.

The GitHub repository is connected to the Vercel project.

The deployment flow is:

```text
GitHub
   │
   ▼
Vercel
   │
   ├── Install dependencies
   ├── Build Next.js application
   └── Deploy
        │
        ▼
Production Application
```

Environment variables must be configured in the Vercel project settings because `.env.local` is intentionally not committed to GitHub.

---

# 🗃️ Data Model

The core data relationships are conceptually:

```text
User
 │
 ├──────────────┐
 │              │
 ▼              ▼
Profile       Semester
                │
                │
                ▼
              Course
                │
                │
                ▼
             Absence
```

There is also a user-specific absence-reason collection:

```text
User
 │
 ▼
Absence Reasons
```

### Semester

A semester represents an academic period belonging to a user.

It can be:

```text
Active
Inactive / Completed
```

Only one active semester is intended to drive the current Dashboard/Courses/Absences workflow.

### Course

A course belongs to a semester and contains the configured maximum absence allowance.

### Absence

An absence belongs to a course and stores the record of a missed class.

---

# 🧮 Absence Calculation Model

Absent uses a straightforward maximum-absence model.

For each course:

```text
Remaining Absences
=
Maximum Allowed Absences
-
Absences Taken
```

Example:

```text
Maximum Allowed = 10
Absences Taken  = 6

Remaining       = 4
```

Course status:

```text
Remaining > 2
    ↓
🟢 Safe

Remaining = 1 or 2
    ↓
🟡 Getting Close

Remaining = 0
    ↓
🔴 Limit Reached
```

This application does **not** currently calculate attendance percentage from total classes conducted.

---

# 🧠 Design Decisions

## Why maximum allowed absences?

The project intentionally focuses on the student's absence allowance instead of requiring students to manually maintain:

- Total classes conducted
- Classes attended
- Attendance percentage

This keeps the MVP simpler and directly answers the question:

> "How many more absences can I take?"

---

## Why keep completed semesters?

Ending a semester does not destroy its data.

Instead:

```text
Active Semester
      ↓
End Semester
      ↓
Completed Semester
      ↓
Historical View
      ↓
Optional Reactivation
```

This preserves academic history while keeping old semester data out of the active Dashboard.

---

# 🧪 Testing

The current version has been tested for:

### Authentication

- Signup
- Login
- Logout
- Session persistence

### Semester

- Create
- Edit
- End/deactivate
- View history
- Historical summary
- Reactivate

### Courses

- Add
- Edit
- Delete

### Absences

- Add
- Edit
- Delete
- Saved reasons
- Custom reasons
- Maximum absence protection

### Dashboard

- Current semester
- Course count
- Semester health
- Course-level absence allowance
- Recovery recommendations
- Recent absences

### UI

- Light mode
- Dark mode
- Desktop
- Mobile

### Security

- Supabase RLS policy inspection
- User-specific data access

### Production

- Vercel deployment
- Production authentication
- Production Dashboard
- Production Courses
- Production Absences
- Production Semester management
- Mobile production testing

---

# 🔐 Environment & Security Notes

Do not commit:

```text
.env.local
```

Do not expose:

- Supabase service-role keys
- Database passwords
- Private API keys
- Other server-side secrets

The client-side Supabase publishable key is configured through the application's public environment variable, while database access is protected through RLS.

Always verify RLS policies when adding new tables or user-owned data.

---

# 📈 Future Improvements

Potential future versions could include:

## v1.1

- Improved landing page
- Application branding/logo
- Improved mobile navigation
- Profile/settings page
- Forgot-password flow
- Better notifications

## v1.2

- Attendance trends
- Calendar view
- Absence analytics
- Data export
- Semester statistics

## v2.0

- Progressive Web App (PWA)
- Installable mobile experience
- Notifications/reminders
- More advanced recovery planning
- Advanced analytics

These features are intentionally outside the current v1.0 scope.

---

# 🎯 Project Goal

The goal of Absent is to give students a simple place to answer three questions:

```text
1. What courses am I taking?
2. How many absences have I used?
3. How many more absences can I take?
```

The Dashboard then turns those numbers into simple health indicators and recommendations.

---

# 📄 Version

**Current version:** v1.0 — Absent MVP

**Status:** Production / Live

**Deployment:** Vercel

**Database & Authentication:** Supabase

---

# 👨‍💻 Development

Built as a full-stack web application using modern JavaScript/TypeScript tooling and a managed PostgreSQL backend.

Repository:

https://github.com/GiHub-01/Jules

Live application:

https://absence-sigma.vercel.app

---

## License

No license has currently been specified for this project.
