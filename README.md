# TaskFlow — Team Task Manager

TaskFlow is a professional, full-stack Team Task Manager with role-based access control, approval workflows, and a Kanban board experience for team collaboration.

---

## 🔑 Super Admin Login

When the server starts for the **first time** with an empty database, a Super Admin account is created automatically.

| Field    | Value                  |
|----------|------------------------|
| Email    | `admin@taskflow.dev`   |
| Password | `Admin@123`            |

> The Super Admin can approve new user registrations and assign them a role of **Manager** or **Member**.

---

## Features
- **Authentication:** JWT-based auth with secure httpOnly refresh cookies.
- **Approval Workflow:** New users are PENDING until approved by Admin/Manager.
- **RBAC:** Global roles (ADMIN, MANAGER, MEMBER).
- **Projects & Kanban Board:** Drag and drop tasks across status columns.
- **Real-Time Dashboard:** Rich statistics, charts, and overdue warnings.
- **Task Management:** Due dates, assignees, priorities, and comment threads.

## Role Permissions

| Action              | Admin | Manager | Member |
|---------------------|-------|---------|--------|
| Approve users       | ✅    | ✅      | ❌     |
| Create Project      | ✅    | ✅      | ❌     |
| Create Task         | ✅    | ✅      | ✅     |
| Edit/Delete Task    | ✅    | ✅      | Own only |
| Archive Project     | ✅    | ✅      | ❌     |
| Manage Members      | ✅    | ✅      | ❌     |

---

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React 19 (Vite), React Router v6, Zustand, Axios, TailwindCSS, @dnd-kit/core, Recharts |
| Backend | Node.js, Fastify v4, nano (CouchDB client), bcryptjs, Zod |
| Database | CouchDB |

---

## Local Setup

### Prerequisites
- Node.js (v20+)
- CouchDB installed and running locally ([Download](https://couchdb.apache.org/#download))
  - Default credentials: `admin` / `admin` on `http://localhost:5984`

### Running the App

**Backend:**
```bash
cd server
npm install
npm run dev
```

**Frontend:**
```bash
cd client
npm install
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **CouchDB Dashboard (Fauxton):** http://localhost:5984/_utils

---

## Environment Variables

### Server (`server/.env`)
```
COUCHDB_URL=http://admin:admin@127.0.0.1:5984
ACCESS_TOKEN_SECRET=your_access_secret
REFRESH_TOKEN_SECRET=your_refresh_secret
FRONTEND_URL=http://localhost:5173
PORT=3000
NODE_ENV=development
```

### Client (`client/.env`)
```
VITE_API_URL=http://localhost:3000/api/v1
```

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/signup` | No | Register (sets status PENDING) |
| POST | `/api/v1/auth/login` | No | Authenticate user |
| POST | `/api/v1/auth/refresh` | Cookie | Refresh access token |
| POST | `/api/v1/auth/logout` | Yes | Logout and clear cookie |
| GET | `/api/v1/auth/me` | Yes | Get current user profile |
| GET | `/api/v1/users` | ADMIN | List all users |
| GET | `/api/v1/users/pending` | ADMIN/MANAGER | List pending users |
| POST | `/api/v1/users/:id/approve` | ADMIN/MANAGER | Approve user with role |
| GET | `/api/v1/projects` | Yes | List projects |
| POST | `/api/v1/projects` | ADMIN/MANAGER | Create project |
| GET | `/api/v1/projects/:id` | Yes | Get project detail |
| GET | `/api/v1/projects/:id/tasks` | Yes | List project tasks |
| POST | `/api/v1/projects/:id/tasks` | Yes | Create task |
| PATCH | `/api/v1/tasks/:id` | Yes | Update task |
| PATCH | `/api/v1/tasks/:id/status` | Yes | Quick status update |
| DELETE | `/api/v1/tasks/:id` | Yes | Delete task |
| GET | `/api/v1/dashboard/summary` | Yes | Dashboard stats |

---

## Known Limitations / Future Improvements
- No WebSockets for real-time board updates (polling can be added).
- No rich text editor for task descriptions.
- No email notifications for approval.
