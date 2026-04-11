import os
import json
import logging
import time
from dotenv import load_dotenv
from google import genai
from google.genai import types
try:
    from google.api_core.exceptions import ResourceExhausted
except ImportError:
    ResourceExhausted = None

logger = logging.getLogger(__name__)

def get_client():
    load_dotenv(override=True)
    return genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

def _call_gemini_json(system_prompt, user_content, retries=3, delay=2):
    """Internal helper to format the strict JSON Gemini request using the modern SDK.
    Retries on transient API failures before giving up."""
    last_error = None
    for attempt in range(retries):
        try:
            client = get_client()
            response = client.models.generate_content(
                model='gemini-2.0-flash',
                contents=user_content,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    response_mime_type="application/json",
                    temperature=0.7,
                ),
            )
            try:
                return json.loads(response.text)
            except (json.JSONDecodeError, ValueError) as json_err:
                logger.error(
                    "[ai_engine] Gemini returned invalid JSON (attempt %d/%d): %s | Raw: %.500s",
                    attempt + 1, retries, json_err, response.text
                )
                last_error = json_err
                if attempt < retries - 1:
                    time.sleep(delay)
                continue

        except Exception as e:
            last_error = e
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
                logger.warning("[ai_engine] Gemini API rate limit hit – aborting retries.")
                return {
                    "error": "RATE_LIMIT",
                    "message": "FocusBot has hit its free-tier API limit. Please wait a minute and try again."
                }

            logger.warning(
                "[ai_engine] Gemini API attempt %d/%d failed: %s",
                attempt + 1, retries, e
            )
            if attempt < retries - 1:
                time.sleep(delay)

    logger.error("[ai_engine] Gemini API permanently failed after %d retries. Last error: %s", retries, last_error)
    return {"error": "Failed to generate AI response. Please try again later."}

def analyze_user(user_profile, activity_logs):
    """Analyzes a user's behavior and generates insights/productivity analysis"""
    profile_data = {
        "age": user_profile.age,
        "current_role": user_profile.current_role,
        "goals": user_profile.goals,
        "interests": user_profile.interests,
        "daily_available_hours": user_profile.daily_available_hours
    }
    
    logs_data = []
    for log in activity_logs:
        logs_data.append({
            "type": log.activity_type,
            "desc": log.description,
            "duration": log.duration_minutes
        })

    sys_prompt = '''You are an expert career guidance AI. Analyze the user's profile and their raw activity logs. 
Output a JSON response matching exactly this format:
{
  "productivity_level": "string description",
  "strengths": ["list", "of", "strings"],
  "weaknesses": ["list", "of", "strings"],
  "insights": "string detailed actionable summary"
}'''

    user_info = f"Profile: {json.dumps(profile_data)}\nLogs: {json.dumps(logs_data)}"
    return _call_gemini_json(sys_prompt, user_info)

def generate_daily_schedule(user_profile, activity_logs, user_request=None):
    """Generates an optimal daily schedule mapping to user availability"""
    profile_data = {
        "role": user_profile.current_role,
        "goals": user_profile.goals,
        "free_hours": user_profile.daily_available_hours
    }
    
    sys_prompt = '''You are an expert schedule building AI. Output an optimal daily schedule representing their available free hours mapping to their goals.
Output a JSON response matching exactly this format:
{
  "schedule": [
    {"time": "08:00 AM", "task": "description of task", "duration": "in minutes"}
  ],
  "daily_focus": "string overview of the day"
}'''

    if user_request:
        sys_prompt += f"\n\nCRITICAL OVERRIDE: The user requested a specific ad-hoc modification today: '{user_request}'. You MUST incorporate this exact request into today's schedule at a logical time block."

    user_info = f"Goal/Profile context: {json.dumps(profile_data)}"
    return _call_gemini_json(sys_prompt, user_info)

def generate_recommendations(user_profile):
    """Generates personalized roadmaps, books, and resources"""
    profile_data = {
        "role": user_profile.current_role,
        "goals": user_profile.goals,
        "interests": user_profile.interests
    }

    sys_prompt = '''You are a career mapping expert. Given a user's goals and interests, recommend actionable learning resources. 
Output a JSON response matching exactly this format:
{
    "books": [{"title": "t", "author": "a", "reason": "why"}],
    "research_papers": [{"title": "t", "topic": "area"}],
    "roadmap_steps": ["step 1", "step 2", "step 3"]
}'''
    
    user_info = f"Context: {json.dumps(profile_data)}"
    return _call_gemini_json(sys_prompt, user_info)

def generate_resource_links(user_profile):
    """Generates deep-linked books, YouTube videos, shorts, and courses using Gemini analysis"""
    profile_data = {
        "role": user_profile.current_role,
        "goals": user_profile.goals,
        "interests": user_profile.interests
    }

    sys_prompt = '''You are a learning resource curator AI. Analyze the user's career goals and interests.
Generate highly relevant, real learning resources. For each resource, generate a real functional URL:
- Books: use Google Books search URL format: https://www.google.com/search?q=<book+title+author>+book+pdf+review
- YouTube Videos: use https://www.youtube.com/results?search_query=<topic+tutorial>
- YouTube Shorts: use https://www.youtube.com/shorts/ style search: https://www.youtube.com/results?search_query=<topic+short+explanation>&sp=EgIYAQ%3D%3D
- Courses: use real platforms (Coursera, edX, Udemy, fast.ai) with real known URL paths

Output ONLY this exact JSON structure (nothing else):
{
  "books": [
    {
      "title": "exact book title",
      "author": "author name",
      "why": "one sentence why this is essential for the user",
      "level": "Beginner|Intermediate|Advanced",
      "url": "https://www.google.com/search?q=exact+title+author+book"
    }
  ],
  "youtube_videos": [
    {
      "title": "descriptive video title to search",
      "channel": "known YouTube channel name",
      "topic": "what concept this covers",
      "duration_est": "short|medium|long",
      "url": "https://www.youtube.com/results?search_query=exact+search+query"
    }
  ],
  "youtube_shorts": [
    {
      "title": "short concept title",
      "topic": "quick concept to learn",
      "url": "https://www.youtube.com/results?search_query=topic+explained+in+60+seconds&sp=EgIYAQ%3D%3D"
    }
  ],
  "courses": [
    {
      "title": "course name",
      "platform": "Coursera|edX|Udemy|fast.ai|MIT OCW|Stanford Online",
      "level": "Beginner|Intermediate|Advanced",
      "free": true,
      "why": "why this course",
      "url": "real course url"
    }
  ]
}
Generate exactly: 6 books, 8 youtube_videos, 6 youtube_shorts, 5 courses.'''

    user_info = f"User profile: {json.dumps(profile_data)}"
    return _call_gemini_json(sys_prompt, user_info)
