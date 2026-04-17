import os
import logging
import requests
from flask import current_app
from threading import Thread

logger = logging.getLogger(__name__)

def _dispatch_brevo_email(app, subject, sender_email, to_email, html_content):
    """Internal abstract handler to send emails via Brevo HTTP API asynchronously."""
    with app.app_context():
        api_key = app.config.get('BREVO_API_KEY')
        if not api_key:
            logger.error("DEBUG EMAIL ERROR: BREVO_API_KEY is not configured.")
            return

        headers = {
            "accept": "application/json",
            "api-key": api_key,
            "content-type": "application/json"
        }
        
        payload = {
            "sender": {
                "name": "FocusPath",
                "email": sender_email
            },
            "to": [
                {
                    "email": to_email
                }
            ],
            "subject": subject,
            "htmlContent": html_content
        }

        try:
            logger.info(f"DEBUG EMAIL [Brevo]: Triggering HTTP POST to {to_email}")
            response = requests.post("https://api.brevo.com/v3/smtp/email", json=payload, headers=headers, timeout=10)
            
            if response.status_code in (200, 201, 202):
                logger.info(f"DEBUG EMAIL [Brevo]: Successfully dispatched email to {to_email}. Provider response: {response.status_code}")
            else:
                logger.error(f"DEBUG EMAIL [Brevo]: Failed to deliver to {to_email}. Provider response: {response.status_code} - {response.text}")
        except Exception as e:
            logger.error(f"DEBUG EMAIL ERROR [Brevo]: Network failure sending to {to_email}: {str(e)}", exc_info=True)


def send_verification_email(to_email: str, raw_token: str, user_name: str = "User") -> None:
    """Sends an account verification email via Brevo HTTP API."""
    backend_url = os.getenv('BACKEND_URL', '').rstrip('/')
    if backend_url and not backend_url.startswith('http'):
        backend_url = 'https://' + backend_url
    if not backend_url:
        raise EnvironmentError("BACKEND_URL is not set — verification link cannot be constructed.")

    sender_email = current_app.config.get('MAIL_DEFAULT_SENDER', 'noreply@focuspath.com')
    verify_link = f"{backend_url}/auth/verify/{raw_token}"
    subject = "Verify your FocusPath account"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
        <tr>
          <td style="background:linear-gradient(135deg,#6d28d9,#8b5cf6);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:28px;letter-spacing:1px;">FocusPath</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">AI-Powered Career Guidance</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#e2e8f0;margin:0 0 16px;font-size:22px;">Welcome, {user_name}! 👋</h2>
            <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 20px;">
              You're almost ready to start your journey. Please verify your email address to activate your account.
            </p>
            <p style="color:#94a3b8;font-size:14px;margin:0 0 32px;">
              This link will expire in <strong style="color:#e2e8f0;">24 hours</strong>.
            </p>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center">
                  <a href="{verify_link}" style="display:inline-block;background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 40px;border-radius:8px;letter-spacing:0.5px;">
                    Verify Email Address
                  </a>
                </td>
              </tr>
            </table>
            <p style="color:#64748b;font-size:13px;margin:32px 0 0;word-break:break-all;">
              Button not working? Copy and paste this link into your browser:<br>
              <a href="{verify_link}" style="color:#8b5cf6;">{verify_link}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    app = current_app._get_current_object()
    Thread(target=_dispatch_brevo_email, args=(app, subject, sender_email, to_email, html)).start()


def send_reset_email(to_email: str, raw_token: str, user_name: str = "User") -> None:
    """Sends a password reset email via Brevo HTTP API."""
    frontend_url = os.getenv('FRONTEND_URL', '').rstrip('/')
    if frontend_url and not frontend_url.startswith('http'):
        frontend_url = 'https://' + frontend_url
    if not frontend_url:
        raise EnvironmentError("FRONTEND_URL is not set — reset link cannot be constructed.")

    sender_email = current_app.config.get('MAIL_DEFAULT_SENDER', 'noreply@focuspath.com')
    reset_link = f"{frontend_url}/reset-password/{raw_token}"
    subject = "Reset your FocusPath password"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
        <tr>
          <td style="background:linear-gradient(135deg,#6d28d9,#8b5cf6);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:28px;letter-spacing:1px;">FocusPath</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">AI-Powered Career Guidance</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#e2e8f0;margin:0 0 16px;font-size:22px;">Password Reset Request 🔐</h2>
            <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 20px;">
              Hi {user_name}, we received a request to reset the password for your FocusPath account.
            </p>
            <p style="color:#94a3b8;font-size:14px;margin:0 0 32px;">
              This link will expire in <strong style="color:#e2e8f0;">24 hours</strong>. If you didn't request this, no action is required.
            </p>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center">
                  <a href="{reset_link}" style="display:inline-block;background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 40px;border-radius:8px;letter-spacing:0.5px;">
                    Reset My Password
                  </a>
                </td>
              </tr>
            </table>
            <p style="color:#64748b;font-size:13px;margin:32px 0 0;word-break:break-all;">
              Button not working? Copy and paste this link into your browser:<br>
              <a href="{reset_link}" style="color:#8b5cf6;">{reset_link}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    app = current_app._get_current_object()
    Thread(target=_dispatch_brevo_email, args=(app, subject, sender_email, to_email, html)).start()
