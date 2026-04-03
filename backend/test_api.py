import os
from dotenv import load_dotenv
load_dotenv()
from google import genai

client = genai.Client(api_key=os.getenv('GOOGLE_API_KEY'))

try:
    print(client.models.generate_content(model='gemini-2.5-flash', contents='hi').text)
except Exception as e:
    print('TYPE:', type(e))
    print('STR:', str(e))
    print('ATTRS:', dir(e))
    # print code if it has one
    if hasattr(e, 'code'):
        print('CODE:', e.code)
    # print status code if it has one
    if hasattr(e, 'status_code'):
        print('STATUS_CODE:', e.status_code)
