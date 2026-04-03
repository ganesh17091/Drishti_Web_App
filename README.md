# FocusPath – Smart Student Success Platform

A full-stack AI-powered web application that helps students with career planning, study planning, skill development, focus improvement, productivity tracking, and internship discovery.

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

## 📁 Folder Structure

```
focuspath/
├── app.py                  # Main Flask App
├── config.py               # Application Configs
├── models.py               # Database Schema (Users, Profiles, Plans)
├── utils.py                # Token Generators
├── routes/                 # Blueprint Controllers
│   ├── admin_routes.py
│   ├── ai_routes.py
│   ├── auth_routes.py
│   ├── dashboard_routes.py
│   └── study_routes.py
├── static/
│   ├── css/
│       └── main.css        # Core aesthetics
├── templates/              # Jinja2 Layouts
│   ├── admin/
│   ├── auth/
│   ├── dashboard/
│   ├── base.html
│   └── index.html
```

## 🛠 Installation & Usage

### 1. Requirements
Ensure you have Python 3 installed. If you prefer virtual environments, set one up prior to installing dependencies.

### 2. Install Dependencies
```bash
pip install Flask Flask-Login Flask-Mail bcrypt Flask-SQLAlchemy Flask-Bcrypt email-validator
```

### 3. Initialize Database
The application natively creates the local database schemas upon the first run! No action is needed.

### 4. Run the Server
```bash
python app.py
```

### 5. Open Web App
Navigate to [http://127.0.0.1:5000](http://127.0.0.1:5000).

---
*Built as the ideal platform for AI-powered student success.*
