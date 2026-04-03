import os
import smtplib
from email.message import EmailMessage
from email.utils import formataddr

def send_verification_email(email, token, user_name="User"):
    email_user = os.getenv('EMAIL_USER')
    email_pass = os.getenv('EMAIL_PASS')
    backend_url = os.getenv('BACKEND_URL', 'http://localhost:5000').rstrip('/')
    
    if not email_user or not email_pass:
        return
        
    msg = EmailMessage()
    msg['Subject'] = 'Verify your FocusPath account'
    msg['From'] = formataddr(("FocusPath Security", email_user))
    msg['To'] = email
    
    link = f"{backend_url}/auth/verify/{token}"
    
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
           <h1 style="color: #8b5cf6; margin: 0;">FocusPath</h1>
        </div>
        <div style="background-color: #f9fafb; padding: 30px; border-radius: 8px; border: 1px solid #e5e7eb;">
            <h2 style="margin-top: 0;">Welcome to FocusPath, {user_name}!</h2>
            <p>You're almost there! We just need to verify your email address before you can access your account.</p>
            <p>Please click the button below to verify your email. This link will expire in 24 hours.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{link}" style="background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;"><a href="{link}">{link}</a></p>
        </div>
        <div style="text-align: center; margin-top: 20px;">
            <p style="font-size: 12px; color: #999;">If you didn't create an account with FocusPath, please ignore this email.</p>
        </div>
      </body>
    </html>
    """
    
    msg.set_content("Please enable HTML to view this email.")
    msg.add_alternative(html_content, subtype='html')
    
    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(email_user, email_pass)
            smtp.send_message(msg)
    except Exception as e:
        pass

def send_reset_email(email, token, user_name="User"):
    email_user = os.getenv('EMAIL_USER')
    email_pass = os.getenv('EMAIL_PASS')
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000').rstrip('/')
    
    if not email_user or not email_pass:
        return
        
    msg = EmailMessage()
    msg['Subject'] = 'Reset your FocusPath password'
    msg['From'] = formataddr(("FocusPath Security", email_user))
    msg['To'] = email
    
    link = f"{frontend_url}/reset-password/{token}"
    
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
           <h1 style="color: #8b5cf6; margin: 0;">FocusPath</h1>
        </div>
        <div style="background-color: #f9fafb; padding: 30px; border-radius: 8px; border: 1px solid #e5e7eb;">
            <h2 style="margin-top: 0;">Password Reset Request</h2>
            <p>Hi {user_name},</p>
            <p>We received a request to reset your password for your FocusPath account.</p>
            <p>Click the button below to choose a new password. This link will expire in 24 hours.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{link}" style="background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;"><a href="{link}">{link}</a></p>
        </div>
        <div style="text-align: center; margin-top: 20px;">
            <p style="font-size: 12px; color: #999;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
        </div>
      </body>
    </html>
    """
    
    msg.set_content("Please enable HTML to view this email.")
    msg.add_alternative(html_content, subtype='html')
    
    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(email_user, email_pass)
            smtp.send_message(msg)
    except Exception as e:
        pass
