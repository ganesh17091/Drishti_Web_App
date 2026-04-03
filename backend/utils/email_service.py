import os
import smtplib
from email.message import EmailMessage

def send_verification_email(email, token):
    email_user = os.getenv('EMAIL_USER')
    email_pass = os.getenv('EMAIL_PASS')
    
    if not email_user or not email_pass:
        print("[MOCK] Verification Email:", f"http://localhost:5000/auth/verify/{token}")
        return
        
    msg = EmailMessage()
    msg['Subject'] = 'Verify Your Email Address'
    msg['From'] = email_user
    msg['To'] = email
    
    link = f"http://localhost:5000/auth/verify/{token}"
    msg.set_content(f"Welcome to FocusPath!\n\nPlease verify your email by clicking this link:\n{link}")
    
    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(email_user, email_pass)
            smtp.send_message(msg)
    except Exception as e:
        print(f"Failed to send email: {e}")

def send_reset_email(email, token):
    email_user = os.getenv('EMAIL_USER')
    email_pass = os.getenv('EMAIL_PASS')
    
    if not email_user or not email_pass:
        print("[MOCK] Reset Email:", f"http://localhost:3000/reset-password/{token}")
        return
        
    msg = EmailMessage()
    msg['Subject'] = 'Password Reset Request'
    msg['From'] = email_user
    msg['To'] = email
    
    link = f"http://localhost:3000/reset-password/{token}"
    msg.set_content(f"You requested a password reset.\n\nTo reset your password, visit the following link:\n{link}")
    
    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(email_user, email_pass)
            smtp.send_message(msg)
    except Exception as e:
        print(f"Failed to send email: {e}")
