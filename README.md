# Script Squad 🚀

**Work Smarter Together** — A full-stack productivity platform for teams, freelancers, and professionals.

![Script Squad](https://img.shields.io/badge/Script_Squad-v1.0.0-6366f1?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=nodedotjs)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat&logo=mongodb)

---

## ✨ Features

### Core
- 🔐 **JWT Authentication** — Secure register, login, logout with protected routes
- 📋 **Project Management** — Create, edit, delete projects with color coding
- ✅ **Task CRUD** — Full task management with priorities, due dates, and statuses
- 🎯 **Kanban Board** — Drag-and-drop tasks between Todo / In Progress / Done
- 🔍 **Search & Filter** — Filter by name, status, priority, and due date
- 📱 **Responsive Design** — Works beautifully on desktop and mobile
- 🌙 **Dark Mode** — Toggle between light and dark themes
- 📊 **Analytics Dashboard** — Charts for productivity trends and task breakdowns
- 🔌 **Real-time Updates** — Socket.io for live collaboration

### Bonus
- Animated glassmorphism UI
- Completion progress rings
- Quick-add tasks from dashboard
- Delete confirmation modals
- Overdue task highlighting

---

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, React Router, @dnd-kit, Recharts |
| Backend | Node.js, Express.js, Socket.io |
| Database | MongoDB Atlas (Mongoose) |
| Auth | JWT + bcryptjs |
| Styling | Vanilla CSS with custom design system |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account

### 1. Clone the repo
```bash
git clone https://github.com/your-username/Script-Squad.git
cd Script-Squad
```

### 2. Setup Backend
```bash
cd backend
npm install
```

Create `.env` in `backend/`:
```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/scriptsquad
JWT_SECRET=your_super_secret_key
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173
```

```bash
npm run dev
```

### 3. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 📁 Project Structure

```
Script-Squad/
├── backend/
│   ├── config/db.js         # MongoDB connection
│   ├── middleware/auth.js   # JWT middleware
│   ├── models/              # User, Project, Task schemas
│   ├── routes/              # auth, projects, tasks APIs
│   └── server.js            # Express + Socket.io server
└── frontend/
    ├── src/
    │   ├── contexts/        # Auth & Theme providers
    │   ├── components/      # Reusable components
    │   ├── pages/           # Route pages
    │   └── index.css        # Global design system
    └── vite.config.js
```

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks (with filters) |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| PUT | `/api/tasks/reorder/bulk` | Reorder kanban tasks |
| GET | `/api/tasks/analytics/summary` | Analytics data |

---

## 🔒 Environment Variables

Never commit your `.env` file! Add it to `.gitignore`.

---

## 👥 Team
Made with ❤️ by Script Squad

---

*Built for the "Future of Work" hackathon theme*