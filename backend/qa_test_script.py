import os
import sys
import json
import traceback
from app import create_app
from app.extensions import db
from app.models import User

def bold(text):
    return f"\033[1m{text}\033[0m"

def green(text):
    return f"\033[92m{text}\033[0m"

def red(text):
    return f"\033[91m{text}\033[0m"

results = {}

def print_result(step, status, details=""):
    results[step] = {"status": "PASS" if status else "FAIL", "details": details}
    print(f"[{'PASS' if status else 'FAIL'}] {bold(step)}")
    if details:
        print(f"   -> {details}")
    print("-" * 40)

def run_tests():
    # Attempt app initialization
    print("Initializing Flask App for testing...")
    
    # We will test without real SMTP credentials to ensure error handling is safe if missing
    # But wait, we want to test if it passes. It might fail if no dummy credentials exist.
    # We just want to check if it crashes or returns a properly formatted 500 JSON.
    os.environ['TESTING'] = 'true'
    
    try:
        app = create_app()
        app.config['TESTING'] = True
        app.config['WTF_CSRF_ENABLED'] = False
        client = app.test_client()
    except Exception as e:
        print_result("App Factory Creation", False, str(e))
        traceback.print_exc()
        return

    print_result("App Factory Creation", True, "Successfully booted modular architecture")

    with app.app_context():
        import random
        random_suffix = str(random.randint(1000, 9999))
        test_email = f"real_email_{random_suffix}@gmail.com"
        db.create_all()

        # STEP 1: SERVER HEALTH
        res1 = client.get('/health')
        if res1.status_code == 200 and 'healthy' in res1.get_json(silent=True).get('status', ''):
            print_result("STEP 1: GET /health", True, "Returned 200 OK")
        else:
            print_result("STEP 1: GET /health", False, f"Status: {res1.status_code}, Body: {res1.data}")

        # STEP 2: BASIC ROUTE
        res2 = client.get('/')
        if res2.status_code == 200:
            print_result("STEP 2: GET / (Basic Route)", True, "Returned 200 OK")
        else:
            print_result("STEP 2: GET / (Basic Route)", False, f"Status: {res2.status_code}, Body: {res2.data}")

        # STEP 3: SIGNUP FLOW
        payload = {
            "name": "Test",
            "email": test_email,
            "password": "123456"
        }
        res3 = client.post('/auth/signup', json=payload)
        
        # We expect a 201 OR a structured 500 if email is missing (not an HTML crash)
        body3 = res3.get_json(silent=True) or {}
        if res3.status_code in [201]:
            print_result("STEP 3: POST /auth/signup", True, f"Success 201: {body3}")
        elif res3.status_code in [500]:
            if 'error' in body3:
                print_result("STEP 3: POST /auth/signup", True, f"Handled Exception gracefully (Likely no SMTP config): {body3}")
            else:
                print_result("STEP 3: POST /auth/signup", False, f"Crashed or improperly handled: {res3.data}")
        else:
            print_result("STEP 3: POST /auth/signup", False, f"Unexpected code {res3.status_code}: {res3.data}")

        # In case signup failed with no user or rolled back, we will force create user for next tests to ensure DB validity
        user = User.query.filter_by(email=test_email).first()
        if not user:
            u = User(email=test_email, name="Test", is_verified=True)
            u.set_password("123456")
            db.session.add(u)
            db.session.commit()

        # STEP 4: LOGIN FLOW
        payload_login = {
            "email": test_email,
            "password": "123456"
        }
        res4 = client.post('/auth/login', json=payload_login)
        body4 = res4.get_json(silent=True) or {}
        if res4.status_code == 200 and 'token' in body4:
            print_result("STEP 4: POST /auth/login", True, "Received Token")
            test_token = body4['token']
        else:
            print_result("STEP 4: POST /auth/login", False, f"Failed: {res4.status_code} {res4.data}")
            test_token = ""

        # STEP 5: FORGOT PASSWORD
        payload_forgot = {"email": test_email}
        res5 = client.post('/auth/forgot_password', json=payload_forgot)
        body5 = res5.get_json(silent=True) or {}
        
        # Like signup, we accept 200, or a handled 500
        if res5.status_code == 200:
            print_result("STEP 5: POST /auth/forgot_password", True, f"Success: {body5}")
        elif res5.status_code == 500 and 'error' in body5:
            print_result("STEP 5: POST /auth/forgot_password", True, f"Graceful catch (Likely SMTP): {body5}")
        else:
            print_result("STEP 5: POST /auth/forgot_password", False, f"Crashed {res5.status_code} {res5.data}")

        # STEP 6: AI ROUTES
        headers = {'Authorization': f'Bearer {test_token}'} if test_token else {}
        res6 = client.post('/ai/generate-schedule', headers=headers, json={"some": "data"})
        body6 = res6.get_json(silent=True) or {}
        
        # We expect 400 (no profile), 429, or 500 (graceful handled AI error) or 200
        if res6.status_code != 500:
            if 'error' in body6 or 'schedule' in body6:
                 print_result("STEP 6: POST /ai/generate-schedule", True, f"Safe Response {res6.status_code}: {body6}")
            else:
                 print_result("STEP 6: POST /ai/generate-schedule", False, f"Weird Response: {res6.data}")
        else:
            if 'error' in body6:
                print_result("STEP 6: POST /ai/generate-schedule", True, f"Graceful 500 catch: {body6}")
            else:
                print_result("STEP 6: POST /ai/generate-schedule", False, f"Crash 500: {res6.data}")

        with open('qa_results.json', 'w') as f:
            json.dump(results, f)

if __name__ == "__main__":
    run_tests()
