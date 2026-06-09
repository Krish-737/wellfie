import os
from dotenv import load_dotenv

load_dotenv()

print(f"GOOGLE_CLIENT_ID: '{os.getenv('GOOGLE_CLIENT_ID')}'")
print(f"MICROSOFT_CLIENT_ID: '{os.getenv('MICROSOFT_CLIENT_ID')}'")
print(f"FACEBOOK_APP_ID: '{os.getenv('FACEBOOK_APP_ID')}'")
print(f"FRONTEND_URL: '{os.getenv('FRONTEND_URL')}'")
