import os
import json
import time
from dotenv import load_dotenv
from openai import OpenAI, RateLimitError
from datetime import date

BYTEZ_MODEL = "meta-llama/Llama-3.2-3B-Instruct"
BYTEZ_BASE_URL = "https://api.bytez.com/models/v2/openai/v1"


def get_chat_client():
    load_dotenv(override=True)
    return OpenAI(
        api_key=os.getenv("BYTEZ_API_KEY"),
        base_url=BYTEZ_BASE_URL,
    )


SYSTEM_PROMPT = """You are FocusBot — a personal AI career mentor and study assistant built into FocusPath.

You deeply understand the user's profile, goals, schedule, and learning history.
Your job is to:
1. Give practical, personalized, actionable career and study advice
2. Help the user stay on track with their goals
3. Adjust their schedule, tasks, or recommendations when they ask

CRITICAL: You MUST respond ONLY with valid JSON — no markdown, no extra text:

If just conversing:
{"reply": "Your natural conversational response here", "action": null}

If the user wants to make a change:
{"reply": "Done! I've [description]...", "action": {"type": "update_schedule | add_task | modify_goals | regenerate_recommendations", "data": {}}}

Action types and data schemas:
- update_schedule: {"request": "specific modification e.g. 'Add 2 hours of football'"}
- add_task: {"task": "task name", "deadline": "YYYY-MM-DD", "allocated_hours": 1.0}
- modify_goals: {"goals": "updated goals text", "interests": "updated interests"}
- regenerate_recommendations: {}

Rules:
- NEVER give generic advice. Always reference the user's specific goals, interests, and schedule.
- Be conversational, warm, motivating, and concise (2-4 sentences unless detail is requested).
- If asked to add a task without a deadline, use tomorrow's date.
- Always sign off with encouragement when relevant.
"""


def _build_context_block(user, profile, logs, schedule):
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
    Core chatbot function using Bytez API (OpenAI-compatible multi-turn format).
    Returns: {"reply": "...", "action": None | {...}}
    """
    context_block = _build_context_block(user, profile, logs, schedule)
    full_system = SYSTEM_PROMPT + context_block

    # Build multi-turn message history
    messages = [{"role": "system", "content": full_system}]
    for chat in chat_history[-20:]:
        role = "user" if chat.role == "user" else "assistant"
        messages.append({"role": role, "content": chat.message})
    messages.append({"role": "user", "content": message})

    for attempt in range(3):
        try:
            client = get_chat_client()
            response = client.chat.completions.create(
                model=BYTEZ_MODEL,
                messages=messages,
                temperature=0.85,
            )
            raw = response.choices[0].message.content

            # Strip markdown fences (open-source models often wrap JSON in ```)
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                parts = cleaned.split("```")
                cleaned = parts[1].lstrip("json").strip() if len(parts) >= 3 else cleaned
            
            result = json.loads(cleaned)

            if "reply" not in result or not result["reply"]:
                result["reply"] = "I'm here to help! Could you rephrase that?"
            if "action" not in result:
                result["action"] = None

            return result

        except RateLimitError:
            return {
                "reply": "⚠️ FocusBot has hit its API rate limit. Please wait a minute and try again!",
                "action": None
            }

        except (json.JSONDecodeError, ValueError):
            # Model returned non-JSON — treat as plain text reply
            if attempt == 2:
                return {"reply": raw.strip() if raw else "I'm here to help!", "action": None}
            time.sleep(1.5)
            continue

        except Exception as e:
            err_str = str(e).lower()
            if "rate" in err_str or "429" in err_str or "quota" in err_str:
                return {
                    "reply": "⚠️ FocusBot has hit its API rate limit. Please wait a minute and try again!",
                    "action": None
                }
            print(f"FocusBot attempt {attempt + 1}/3 failed: {e}")
            if attempt < 2:
                time.sleep(1.5)

    return {
        "reply": "I'm having a little trouble connecting right now. Please try again in a moment!",
        "action": None,
    }
