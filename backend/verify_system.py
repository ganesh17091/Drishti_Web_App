import json
from app import create_app

app = create_app()
app.testing = True
client = app.test_client()

def test_auth_and_ai():
    print("====================================")
    print("🧪 FOCUSPATH VERIFICATION PROTOCOL")
    print("====================================\n")

    # 1. Test Signup
    print("[1] Testing User Registration (/auth/signup)...")
    signup_payload = {
        "name": "Test Engineer",
        "email": "tester_ai@example.com",
        "password": "securepassword123"
    }
    res = client.post('/auth/signup', data=json.dumps(signup_payload), content_type='application/json')
    if res.status_code in [201, 200]:
        print("    ✅ Signup successful!")
    elif res.status_code == 409:
        print("    ℹ️ Test user already exists, proceeding...")
    else:
        print(f"    ❌ Signup failed: {res.status_code} - {res.data}")
        return

    # 2. Test Login
    print("\n[2] Testing Authentication Phase (/auth/login)...")
    login_payload = {
        "email": "tester_ai@example.com",
        "password": "securepassword123"
    }
    res = client.post('/auth/login', data=json.dumps(login_payload), content_type='application/json')
    if res.status_code == 200:
        token = json.loads(res.data).get('token')
        print(f"    ✅ Login successful! JWT Acquired: {token[:15]}...{token[-10:]}")
    else:
        print(f"    ❌ Login failed: {res.status_code} - {res.data}")
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # 3. Test AI Onboarding
    print("\n[3] Testing User Profile Registration (/ai/onboarding)...")
    onboarding_payload = {
        "age": 22,
        "current_role": "Computer Science Student",
        "goals": "Become a senior machine learning engineer taking algorithms courses",
        "interests": "Deep learning, neural networks, mathematics",
        "daily_available_hours": 4
    }
    res = client.post('/ai/onboarding', headers=headers, data=json.dumps(onboarding_payload))
    if res.status_code == 201:
        print("    ✅ Onboarding Payload Synced to Database!")
    else:
        print(f"    ❌ Onboarding failed: {res.status_code} - {res.data}")
        return

    # 4. Test Activity Logging
    print("\n[4] Testing Activity Hooks (/ai/log-activity)...")
    activity_payload = {
        "activity_type": "study",
        "description": "Read Chapter 1 of Deep Learning Book",
        "duration_minutes": 60
    }
    res = client.post('/ai/log-activity', headers=headers, data=json.dumps(activity_payload))
    if res.status_code == 201:
        print("    ✅ Activity Logged Successfully to Database!")
    else:
        print(f"    ❌ Activity logic failed: {res.status_code}")
        return

    # 5. Test AI OpenAI Inference Engine
    print("\n[5] Stress Testing OpenAI GPT-4 Inference Context (/ai/generate-schedule)...")
    print("    ⏳ Reaching out to external OpenAI API, this may take a moment...")
    res = client.post('/ai/generate-schedule', headers=headers)
    if res.status_code == 200:
        data = json.loads(res.data)
        print("    ✅ OpenAI LLM responded exactly with Structured JSON Context!")
        print("    🤖 Here is the generated schedule mapping:")
        print(json.dumps(data, indent=2))
        print("\n🏆 Verification Protocol Completed Masterfully. The backend is immortal.")
    else:
        print(f"    ❌ OpenAI Inference hook failed: {res.status_code} - {res.data}")

if __name__ == '__main__':
    test_auth_and_ai()
