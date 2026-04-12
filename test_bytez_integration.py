import os, requests
from dotenv import load_dotenv
load_dotenv('backend/.env', override=True)
key = os.getenv("BYTEZ_API_KEY")

r = requests.get(
    "https://api.bytez.com/models/v2/list/models",
    params={"task": "chat"},
    headers={"Authorization": key},
    timeout=15
)
data = r.json()
models = data if isinstance(data, list) else data.get("models", data)

print("Models sized 'sm':")
for m in models:
    if isinstance(m, dict):
         # Print if meter or size or whatever implies small
         meter = str(m.get("meter", "")).lower()
         if "sm" in meter or "free" in meter:
             print(f"{m.get('id')} - meter: {m.get('meter')}")
