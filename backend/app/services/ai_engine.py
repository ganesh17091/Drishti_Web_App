import os
import json
import logging
import time
from dotenv import load_dotenv
from openai import OpenAI, RateLimitError

logger = logging.getLogger(__name__)

BYTEZ_MODEL = "meta-llama/Llama-3.2-3B-Instruct"
BYTEZ_BASE_URL = "https://api.bytez.com/models/v2/openai/v1"


def get_client():
    load_dotenv(override=True)
    return OpenAI(
        api_key=os.getenv("BYTEZ_API_KEY"),
        base_url=BYTEZ_BASE_URL,
    )


def _call_ai_json(system_prompt, user_content, retries=3, delay=2):
    """Calls Bytez LLM and parses the JSON response. Retries on transient failures."""
    last_error = None
    for attempt in range(retries):
        try:
            client = get_client()
            response = client.chat.completions.create(
                model=BYTEZ_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": user_content},
                ],
                temperature=0.7,
            )
            raw = response.choices[0].message.content

            # Strip markdown fences if model wraps output in ```json ... ```
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("```", 2)[-1] if cleaned.count("```") >= 2 else cleaned
                cleaned = cleaned.lstrip("json").strip().rstrip("```").strip()

            try:
                return json.loads(cleaned)
            except (json.JSONDecodeError, ValueError) as json_err:
                logger.error(
                    "[ai_engine] Invalid JSON on attempt %d/%d: %s | Raw: %.500s",
                    attempt + 1, retries, json_err, raw
                )
                last_error = json_err
                if attempt < retries - 1:
                    time.sleep(delay)
                continue

        except RateLimitError as e:
            logger.warning("[ai_engine] Bytez rate limit hit: %s", e)
            return {
                "error": "RATE_LIMIT",
                "message": "FocusBot has hit its API rate limit. Please wait a minute and try again."
            }

        except Exception as e:
            last_error = e
            err_str = str(e).lower()
            if "rate" in err_str or "429" in err_str or "quota" in err_str:
                logger.warning("[ai_engine] Rate limit detected: %s", e)
                return {
                    "error": "RATE_LIMIT",
                    "message": "FocusBot has hit its API rate limit. Please wait a minute and try again."
                }
            logger.warning("[ai_engine] Attempt %d/%d failed: %s", attempt + 1, retries, e)
            if attempt < retries - 1:
                time.sleep(delay)

    logger.error("[ai_engine] Permanently failed after %d retries. Last error: %s", retries, last_error)
    return {"error": "Failed to generate AI response. Please try again later."}


def analyze_user(user_profile, activity_logs):
    """Analyzes a user's behaviour and generates insights/productivity analysis."""
    profile_data = {
        "age": user_profile.age,
        "current_role": user_profile.current_role,
        "goals": user_profile.goals,
        "interests": user_profile.interests,
        "daily_available_hours": user_profile.daily_available_hours
    }
    logs_data = [
        {"type": log.activity_type, "desc": log.description, "duration": log.duration_minutes}
        for log in activity_logs
    ]

    sys_prompt = (
        "You are an expert career guidance AI. Analyze the user's profile and raw activity logs. "
        "You MUST respond with ONLY valid JSON — no markdown, no extra text. "
        "Use exactly this format:\n"
        '{"productivity_level":"string","strengths":["list","of","strings"],'
        '"weaknesses":["list","of","strings"],"insights":"string detailed actionable summary"}'
    )
    user_info = f"Profile: {json.dumps(profile_data)}\nLogs: {json.dumps(logs_data)}"
    return _call_ai_json(sys_prompt, user_info)


def generate_daily_schedule(user_profile, activity_logs, user_request=None):
    """Generates an optimal daily schedule mapping to user availability."""
    profile_data = {
        "role": user_profile.current_role,
        "goals": user_profile.goals,
        "free_hours": user_profile.daily_available_hours
    }
    sys_prompt = (
        "You are an expert schedule building AI. Output an optimal daily schedule for the user's free hours. "
        "You MUST respond with ONLY valid JSON — no markdown, no extra text. "
        "Use exactly this format:\n"
        '{"schedule":[{"time":"08:00 AM","task":"description","duration":"in minutes"}],'
        '"daily_focus":"string overview of the day"}'
    )
    if user_request:
        sys_prompt += (
            f"\n\nCRITICAL OVERRIDE: The user requested this change today: '{user_request}'. "
            "You MUST incorporate it into the schedule."
        )
    user_info = f"Goal/Profile context: {json.dumps(profile_data)}"
    return _call_ai_json(sys_prompt, user_info)


def generate_recommendations(user_profile):
    """Generates personalised roadmaps, books, and resources."""
    profile_data = {
        "role": user_profile.current_role,
        "goals": user_profile.goals,
        "interests": user_profile.interests
    }
    sys_prompt = (
        "You are a career mapping expert. Given the user's goals and interests, recommend learning resources. "
        "You MUST respond with ONLY valid JSON — no markdown, no extra text. "
        "Use exactly this format:\n"
        '{"books":[{"title":"t","author":"a","reason":"why"}],'
        '"research_papers":[{"title":"t","topic":"area"}],'
        '"roadmap_steps":["step 1","step 2","step 3"]}'
    )
    user_info = f"Context: {json.dumps(profile_data)}"
    return _call_ai_json(sys_prompt, user_info)


def generate_resource_links(user_profile):
    """Generates deep-linked books, YouTube videos, shorts, and courses."""
    profile_data = {
        "role": user_profile.current_role,
        "goals": user_profile.goals,
        "interests": user_profile.interests
    }
    sys_prompt = (
        "You are a learning resource curator AI. Generate highly relevant real learning resources. "
        "You MUST respond with ONLY valid JSON — no markdown, no extra text. "
        "Use exactly this format:\n"
        "{\n"
        '  "books":[{"title":"","author":"","why":"","level":"Beginner|Intermediate|Advanced","url":"https://www.google.com/search?q=title+author"}],\n'
        '  "youtube_videos":[{"title":"","channel":"","topic":"","duration_est":"short|medium|long","url":"https://www.youtube.com/results?search_query=topic"}],\n'
        '  "youtube_shorts":[{"title":"","topic":"","url":"https://www.youtube.com/results?search_query=topic+60+seconds&sp=EgIYAQ%3D%3D"}],\n'
        '  "courses":[{"title":"","platform":"Coursera|edX|Udemy|fast.ai|MIT OCW","level":"Beginner|Intermediate|Advanced","free":true,"why":"","url":""}]\n'
        "}\n"
        "Generate exactly: 6 books, 8 youtube_videos, 6 youtube_shorts, 5 courses."
    )
    user_info = f"User profile: {json.dumps(profile_data)}"
    return _call_ai_json(sys_prompt, user_info)
