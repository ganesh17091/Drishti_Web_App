import os
import time
from dotenv import load_dotenv
from openai import OpenAI

# Load the backend env
load_dotenv(override=True)
api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    print("❌ No GROQ_API_KEY found in backend/.env")
    exit(1)

GROQ_BASE_URL = "https://api.groq.com/openai/v1"
GROQ_MODEL = "llama-3.3-70b-versatile"

client = OpenAI(api_key=api_key, base_url=GROQ_BASE_URL)

print(f"Starting Groq API test using model: {GROQ_MODEL}\n")

try:
    start_time = time.time()
    
    # Simple Request
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": "You are a helpful and extremely concise assistant."},
            {"role": "user", "content": "Write a short 2-sentence welcome message for a student using Focuspath."}
        ],
        temperature=0.7,
        max_tokens=60
    )
    
    end_time = time.time()
    latency = end_time - start_time
    
    print("✅ Success! The model responded successfully.\n")
    print("=" * 40)
    print(f"Response: {response.choices[0].message.content.strip()}")
    print("=" * 40)
    print(f"Time taken: {latency:.2f} seconds")
    
except Exception as e:
    print(f"❌ Failed to connect to Groq: {e}")
