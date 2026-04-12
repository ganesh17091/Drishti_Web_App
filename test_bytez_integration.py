import os
import json
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv('backend/.env', override=True)
api_key = os.getenv("BYTEZ_API_KEY")

if not api_key:
    print("❌ No BYTEZ_API_KEY found in backend/.env")
    exit(1)

BYTEZ_BASE_URL = "https://api.bytez.com/models/v2/openai/v1"
client = OpenAI(api_key=api_key, base_url=BYTEZ_BASE_URL)

models_to_test = [
    "meta-llama/Llama-3.2-3B-Instruct",
    "meta-llama/Meta-Llama-3-8B-Instruct",
    "Qwen/Qwen1.5-0.5B-Chat"
]

print("Starting Bytez API tests...\n")

for model in models_to_test:
    print(f"Testing model: {model}")
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Say 'hello world' and nothing else."}
            ],
            temperature=0.7,
            max_tokens=10
        )
        print(f"✅ Success! Response: {response.choices[0].message.content.strip()}")
    except Exception as e:
        print(f"❌ Failed: {e}")
    print("-" * 50)
