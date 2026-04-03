import os
import logging
import smtplib
from email.message import EmailMessage
from email.utils import formataddr

logger = logging.getLogger(__name__)


def _get_smtp_credentials() -> tuple[str, str]:
    """
    Returns (EMAIL_USER, EMAIL_PASS) from environment.
    Raises EnvironmentError with a clear message if either is missing.
    """
    email_user = os.getenv('EMAIL_USER', '').strip()
    email_pass = os.getenv('EMAIL_PASS', '').strip()
    if not email_user:
        raise EnvironmentError("EMAIL_USER is not set in environment variables.")
    if not email_pass:
        raise EnvironmentError("EMAIL_PASS is not set in environment variables.")
    return email_user, email_pass


def _build_smtp_connection() -> smtplib.SMTP_SSL:
    """
    Opens and returns an authenticated SMTP_SSL connection.
    Raises on any connection or auth failure — no silent swallowing.
    """
    email_user, email_pass = _get_smtp_credentials()
    smtp = smtplib.SMTP_SSL('smtp.gmail.com', 465)
    smtp.login(email_user, email_pass)
    return smtp


def _dispatch_email(msg: EmailMessage) -> None:
    """
    Sends a pre-built EmailMessage through SMTP.
    Raises Exception on any failure so callers can decide how to handle it.
    """
    email_user, _ = _get_smtp_credentials()
    with _build_smtp_connection() as smtp:
        smtp.send_message(msg)


def send_verification_email(to_email: str, raw_token: str, user_name: str = "User") -> None:
    """
    Sends an account verification email. BACKEND_URL must be configured.

    Raises:
        EnvironmentError  — if EMAIL_USER, EMAIL_PASS, or BACKEND_URL are missing
        Exception         — if SMTP delivery fails for any reason

    Callers are responsible for catching and handling these exceptions.
    """
    backend_url = os.getenv('BACKEND_URL', '').rstrip('/')
    if not backend_url:
        raise EnvironmentError("BACKEND_URL is not set — verification link cannot be constructed.")

    email_user, _ = _get_smtp_credentials()   # raises EnvironmentError if missing

    verify_link = f"{backend_url}/auth/verify/{raw_token}"

    msg = EmailMessage()
    msg['Subject'] = 'Verify your FocusPath account'
    msg['From'] = formataddr(("FocusPath", email_user))
    msg['To'] = to_email

    plain = (
        f"Hi {user_name},\n\n"
        "Welcome to FocusPath! Please verify your email address by clicking the button "
        "in the HTML version of this email, or visiting the link below:\n\n"
        f"{verify_link}\n\n"
        "This link expires in 24 hours. If you did not create this account, ignore this email.\n\n"
        "— The FocusPath Team"
    )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6d28d9,#8b5cf6);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:28px;letter-spacing:1px;">FocusPath</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">AI-Powered Career Guidance</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#e2e8f0;margin:0 0 16px;font-size:22px;">Welcome, {user_name}! 👋</h2>
            <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 20px;">
              You're almost ready to start your journey. Please verify your email address to activate your account.
            </p>
            <p style="color:#94a3b8;font-size:14px;margin:0 0 32px;">
              This link will expire in <strong style="color:#e2e8f0;">24 hours</strong>.
            </p>
            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center">
                  <a href="{verify_link}"
                     style="display:inline-block;background:linear-gradient(135deg,#6d28d9,#8b5cf6);
                            color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;
                            padding:14px 40px;border-radius:8px;letter-spacing:0.5px;">
                    Verify Email Address
                  </a>
                </td>
              </tr>
            </table>
            <!-- Fallback link -->
            <p style="color:#64748b;font-size:13px;margin:32px 0 0;word-break:break-all;">
              Button not working? Copy and paste this link into your browser:<br>
              <a href="{verify_link}" style="color:#8b5cf6;">{verify_link}</a>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #2d2d44;text-align:center;">
            <p style="color:#475569;font-size:12px;margin:0;">
              If you didn't create a FocusPath account, you can safely ignore this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    msg.set_content(plain)
    msg.add_alternative(html, subtype='html')

    try:
        _dispatch_email(msg)
        logger.info(f"Verification email sent successfully to {to_email}")
    except Exception as e:
        logger.error(f"Email send failed for {to_email}: {str(e)}")
        raise


def send_reset_email(to_email: str, raw_token: str, user_name: str = "User") -> None:
    """
    Sends a password reset email. FRONTEND_URL must be configured.

    Raises:
        EnvironmentError  — if EMAIL_USER, EMAIL_PASS, or FRONTEND_URL are missing
        Exception         — if SMTP delivery fails for any reason

    Callers are responsible for catching and handling these exceptions.
    """
    frontend_url = os.getenv('FRONTEND_URL', '').rstrip('/')
    if not frontend_url:
        raise EnvironmentError("FRONTEND_URL is not set — reset link cannot be constructed.")

    email_user, _ = _get_smtp_credentials()   # raises EnvironmentError if missing

    reset_link = f"{frontend_url}/reset-password/{raw_token}"

    msg = EmailMessage()
    msg['Subject'] = 'Reset your FocusPath password'
    msg['From'] = formataddr(("FocusPath", email_user))
    msg['To'] = to_email

    plain = (
        f"Hi {user_name},\n\n"
        "We received a request to reset your FocusPath password. Visit the link below:\n\n"
        f"{reset_link}\n\n"
        "This link expires in 24 hours. If you did not request a reset, ignore this email.\n\n"
        "— The FocusPath Team"
    )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6d28d9,#8b5cf6);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:28px;letter-spacing:1px;">FocusPath</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">AI-Powered Career Guidance</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#e2e8f0;margin:0 0 16px;font-size:22px;">Password Reset Request 🔐</h2>
            <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 20px;">
              Hi {user_name}, we received a request to reset the password for your FocusPath account.
            </p>
            <p style="color:#94a3b8;font-size:14px;margin:0 0 32px;">
              This link will expire in <strong style="color:#e2e8f0;">24 hours</strong>. If you didn't request this, no action is required.
            </p>
            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center">
                  <a href="{reset_link}"
                     style="display:inline-block;background:linear-gradient(135deg,#6d28d9,#8b5cf6);
                            color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;
                            padding:14px 40px;border-radius:8px;letter-spacing:0.5px;">
                    Reset My Password
                  </a>
                </td>
              </tr>
            </table>
            <!-- Fallback link -->
            <p style="color:#64748b;font-size:13px;margin:32px 0 0;word-break:break-all;">
              Button not working? Copy and paste this link into your browser:<br>
              <a href="{reset_link}" style="color:#8b5cf6;">{reset_link}</a>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #2d2d44;text-align:center;">
            <p style="color:#475569;font-size:12px;margin:0;">
              If you didn't request a password reset, your account remains secure. No changes were made.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    msg.set_content(plain)
    msg.add_alternative(html, subtype='html')

    try:
        _dispatch_email(msg)
        logger.info(f"Password reset email sent successfully to {to_email}")
    except Exception as e:
        logger.error(f"Reset email send failed for {to_email}: {str(e)}")
        raise
