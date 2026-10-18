# TTL Hub

**An all-in-one platform for the students, volunteers, and staff of [Teach to Lead](#about-teach-to-lead), a nonprofit that teaches English to children in Honduras.**

TTL Hub brings everything the organization runs on into one place: volunteer hours, weekly reports, class observations, teaching content, projects, announcements, and student progress. Before TTL Hub, this information lived in scattered spreadsheets, chats, and folders.

> 🚧 **Status:** In active development since June 2026. See the [Roadmap](#roadmap) for what's coming next.

<img width="1433" height="709" alt="Captura de pantalla 2026-10-18 a la(s) 1 56 01 p m" src="https://github.com/user-attachments/assets/538ffeeb-aa0b-462f-8dd5-047fda996077" />

<img width="1433" height="709" alt="Captura de pantalla 2026-10-18 a la(s) 2 05 19 p m" src="https://github.com/user-attachments/assets/2f186e0e-1a3e-4bc8-a5ba-59776114d6e1" />

<img width="1433" height="709" alt="Captura de pantalla 2026-10-18 a la(s) 2 02 04 p m" src="https://github.com/user-attachments/assets/0a7e561a-6b11-448f-939e-cb4439ad626e" />

---

## Features

### For volunteers
- **Personal dashboard** with quick access to every tool based on the volunteer's role
- **My hours:** track content and meeting hours
- **Weekly reports:** submit what was done each week
- **Checklist:** personal onboarding and task checklist
- **Week off requests** and **certificate requests**
- **Projects:** shared projects with assignable tasks
- **Content hub:** a shared library of teaching materials
- **Class observations:** record observations from classes
- **Outreach:** manage outreach events and creators, with a personal assignments view for interns

### For students
- A dedicated **student dashboard**, in Spanish, with their own view of the platform

### For staff and admins
- **Admin panel** to create accounts and manage users, communities, and levels
- **Manage hours** across all volunteers
- **Reports & observations** overview
- **Announcements** visible to the whole team

### Role-based access
Each person sees only what fits their role. Roles include staff admin, director of programs, director of schools, volunteer coordinator, marketing staff, volunteers, and students. Every page except the landing page requires signing in.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router, JavaScript, CSS |
| Build tool | Vite |
| Backend & database | Supabase (PostgreSQL, Auth) |
| Server functions | Supabase Edge Functions (TypeScript / Deno) for creating users and resetting passwords |
| Hosting | Vercel |

---

## Project structure

```
src/
├── pages/          # One page per feature (Dashboard, ContentHub, WeeklyReport, ...)
├── components/     # Shared components, including route protection
├── supabase.js     # Supabase client
└── App.jsx         # Routes
supabase/
└── functions/      # Edge functions: create-user, reset-password
```

---

## Running it locally

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/SophiaDaCorte/teach-to-lead-app.git
   cd teach-to-lead-app
   npm install
   ```
2. Create a `.env` file in the project root with your Supabase project's values:
   ```
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

---

## Roadmap

- [ ] **Chat** between volunteers and staff
- [ ] **Shared file storage** (drive) inside the hub
- [ ] **Live meetings** without leaving the platform
- [ ] **Offline access:** many of the children we serve in Honduras have weak or no internet signal. I am researching how to let them open their materials without a connection and sync automatically when they reconnect.

---

## About Teach to Lead

Teach to Lead is a nonprofit organization that teaches English to children in Honduras, with a team of volunteers who prepare content, teach classes, and run outreach. TTL Hub was built to give that team a single place to organize their work so they can spend more time teaching.

---

## Author

Built by **Sophia Da Corte** ([@SophiaDaCorte](https://github.com/SophiaDaCorte)).

AI tools assisted with parts of the user interface design; the application's features, data structure, and logic were built by me.
