# FocusPath – Smart Student Success Platform

A full-stack AI-powered web application that helps students with career planning, study planning, skill development, focus improvement, productivity tracking, and internship discovery.

## 🌐 Live Deployment
**The application is live and deployed in production!**
- **Frontend**: [FocusPath Next.js App (Deployed)](#)
- **Backend API**: [FocusPath Flask API (Render)](https://focuspath-backend.onrender.com)

## 🚀 Features

- **Secure Authentication System** (Signup, Login, Logout, Forgot Password)
- **Persistent Database Storage** (SQLite / SQLAlchemy)
- **Student Profile Management** (Goals, Skills, Study Hours)
- **AI Career Recommendation System** (Heuristic matching for optimal career paths)
- **Skill Gap Analysis** (Compares current skills against required)
- **Smart Study Planner** (Task creation, deadlines, completions)
- **Focus Timer Engine** (Pomodoro technique integration with analytics)
- **AI Chat Assistant** (Integrated chatbot for studying advice)
- **Admin Dashboard** (User stats and task aggregations)

## 💻 Tech Stack

### Frontend
- **Framework:** Next.js 16 (React 19)
- **Language:** TypeScript
- **Icons & Data Viz:** Lucide React, Recharts

### Backend
- **Framework:** Python 3 & Flask
- **Database:** PostgreSQL (via Flask-SQLAlchemy)
- **Authentication:** JWT, Flask-Bcrypt, Flask-Login
- **AI Integrations:** OpenAI API Interface (Groq)

### Deployment & Tools
- **Providers:** Vercel (Frontend), Render (Backend)
- **Production Server:** Gunicorn

## 📁 Folder Structure

```
focuspath/
├── frontend/               # Next.js React Frontend
│   ├── src/
│   │   ├── app/            # Next.js App Router pages
│   │   ├── components/     # UI Components
│   │   └── lib/            # API services and utilities
│   └── package.json
│
├── backend/                # Flask Python Backend
│   ├── app/                # Main Application Package
│   │   ├── routes/         # API Blueprints
│   │   ├── models/         # Database Models
│   │   └── config.py
│   ├── requirements.txt
│   └── wsgi.py             # Render Entry Point
```

## 🛠 Local Development

### 1. Backend (Flask) Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
flask run
```
*The API will run on http://localhost:5000*

### 2. Frontend (Next.js) Setup
```bash
cd frontend
npm install
npm run dev
```
*The web app will run on http://localhost:3000*

---
*Built as the ideal platform for AI-powered student success.*
