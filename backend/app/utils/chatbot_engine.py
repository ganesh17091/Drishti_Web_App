import os
import json
import time
from dotenv import load_dotenv
from google import genai
from google.genai import types
from datetime import date
try:
    from google.api_core.exceptions import ResourceExhausted
except ImportError:
    ResourceExhausted = None

def get_chat_client():
    load_dotenv(override=True)
    return genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

SYSTEM_PROMPT = """You are FocusBot — a personal AI career mentor and study assistant built into FocusPath.

You deeply understand the user's profile, goals, schedule, and learning history.
Your job is to:
1. Give practical, personalized, actionable career and study advice
2. Help the user stay on track with their goals
3. Adjust their schedule, tasks, or recommendations when they ask

CRITICAL: You MUST respond ONLY with valid JSON in this exact format — no extra text, no markdown:

If just conversing:
{
  "reply": "Your natural conversational response here",
  "action": null
}

If the user wants to make a change:
{
  "reply": "Done! I've [description of what you did]...",
  "action": {
    "type": "update_schedule | add_task | modify_goals | regenerate_recommendations",
    "data": {}
  }
}

Action types and their exact data schemas:
- update_schedule: {"request": "Specific user modification requests, e.g. 'Add 2 hours of football'"}
- add_task: {"task": "task name string", "deadline": "YYYY-MM-DD", "allocated_hours": 1.0}
- modify_goals: {"goals": "updated goals text", "interests": "updated interests"}
- regenerate_recommendations: {} (no data needed — system will fetch fresh resources)

Rules:
- NEVER give generic advice. Always reference the user's specific goals, interests, and schedule.
- Be conversational, warm, motivating, and concise (2-4 sentences unless detail is explicitly requested).
- If asked to add a task without a deadline, use tomorrow's date.
- If the user's question is unclear, ask a short clarifying question.
- Always sign off responses with encouragement when relevant.
"""


def _build_context_block(user, profile, logs, schedule):
    """Constructs a rich context block injected into every system prompt."""
    profile_summary = "No profile completed yet — user hasn't done onboarding."
    if profile:
        profile_summary = (
            f"  - Role/Major: {profile.current_role or 'Not set'}\n"
            f"  - Career Goals: {profile.goals or 'Not set'}\n"
            f"  - Interests: {profile.interests or 'Not set'}\n"
            f"  - Daily Free Hours: {profile.daily_available_hours or '?'}h"
        )

    log_summary = "No recent activity logged."
    if logs:
        entries = [
            f"  - {l.activity_type}: {l.description} ({l.duration_minutes}min)"
            for l in logs[:8]
        ]
        log_summary = "\n".join(entries)

    schedule_summary = "No AI schedule generated for today yet."
    if schedule and schedule.schedule_data:
        sd = schedule.schedule_data
        if isinstance(sd, dict) and "schedule" in sd:
            items = sd["schedule"][:6]
            schedule_summary = "\n".join([
                f"  - {item.get('time', '?')}: {item.get('task', '?')} ({item.get('duration', '?')}min)"
                for item in items
            ])
            if sd.get("daily_focus"):
                schedule_summary = f"  Focus: {sd['daily_focus']}\n" + schedule_summary

    return (
        f"\n\n=== LIVE USER CONTEXT ===\n"
        f"Name: {user.name}\n"
        f"Email: {user.email}\n"
        f"Today: {date.today().isoformat()}\n\n"
        f"=== PROFILE ===\n{profile_summary}\n\n"
        f"=== TODAY'S SCHEDULE ===\n{schedule_summary}\n\n"
        f"=== RECENT ACTIVITY (last 8 sessions) ===\n{log_summary}\n"
        f"=========================\n"
    )


def generate_chat_response(user, message, profile, logs, schedule, chat_history):
    """
    Core chatbot function using Gemini multi-turn format.
    Returns: {"reply": "...", "action": None | {...}}
    """
    context_block = _build_context_block(user, profile, logs, schedule)
    full_system = SYSTEM_PROMPT + context_block

    # Build Gemini-format multi-turn conversation history
    contents = []
    for chat in chat_history[-20:]:  # last 20 messages for context window
        role = "user" if chat.role == "user" else "model"
        contents.append(
            types.Content(role=role, parts=[types.Part(text=chat.message)])
        )

    # Append the new user message
    contents.append(
        types.Content(role="user", parts=[types.Part(text=message)])
    )

    for attempt in range(3):
        try:
            client = get_chat_client()
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=full_system,
                    response_mime_type="application/json",
                    temperature=0.85,
                ),
            )
            result = json.loads(response.text)

            # Sanitize output
            if "reply" not in result or not result["reply"]:
                result["reply"] = "I'm here to help! Could you rephrase that?"
            if "action" not in result:
                result["action"] = None

            return result

        except Exception as e:
            err_str = str(e).lower()
            is_rate_limit = (
                (ResourceExhausted is not None and isinstance(e, ResourceExhausted))
                or "429" in err_str
                or "quota" in err_str
                or "resource_exhausted" in err_str
                or "too many requests" in err_str
                or "rate_limit" in err_str
            )
            if is_rate_limit:
                return {
                    "reply": "⚠️ FocusBot has hit its free-tier API limit. Please wait a minute and try again!",
                    "action": None
                }

            print(f"FocusBot attempt {attempt + 1}/3 failed: {e}")
            if attempt < 2:
                time.sleep(1.5)

    return {
        "reply": "I'm having a little trouble connecting right now. Please try again in a moment!",
        "action": None,
    }
