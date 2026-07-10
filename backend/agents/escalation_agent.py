import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

class MultiChannelEscalationAgent:
    """
    AGENT 08: MULTI-CHANNEL ESCALATION AGENT
    Handles dispatching recovery alerts and Shamir key shards to trustees
    via SMTP Email and Twilio SMS/WhatsApp when a switch is fully compromised.
    """
    def __init__(self):
        # Load API keys from environment
        self.twilio_sid = os.environ.get("TWILIO_ACCOUNT_SID")
        self.twilio_auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
        self.twilio_number = os.environ.get("TWILIO_PHONE_NUMBER")
        
        self.smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        self.smtp_user = os.environ.get("SMTP_USER")
        self.smtp_password = os.environ.get("SMTP_PASSWORD")
        
    def send_email(self, to_email: str, subject: str, message_body: str) -> bool:
        print(f"[AG-08] Attempting email dispatch to '{to_email}'...")
        
        if not self.smtp_user or not self.smtp_password:
            print(f"[AG-08] [Offline Log] SMTP credentials missing. Message body:\n{message_body}")
            return True
            
        try:
            msg = MIMEMultipart()
            msg['From'] = self.smtp_user
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(message_body, 'plain'))
            
            server = smtplib.SMTP(self.smtp_host, self.smtp_port)
            server.starttls()
            server.login(self.smtp_user, self.smtp_password)
            server.sendmail(self.smtp_user, to_email, msg.as_string())
            server.quit()
            print(f"[AG-08] Email successfully dispatched to '{to_email}'.")
            return True
        except Exception as e:
            print(f"[AG-08] SMTP Email Dispatch failed: {e}")
            return False
            
    def send_sms(self, to_phone: str, message: str) -> bool:
        print(f"[AG-08] Attempting Twilio SMS dispatch to '{to_phone}'...")
        
        if not self.twilio_sid or not self.twilio_auth_token:
            print(f"[AG-08] [Offline Log] Twilio credentials missing. SMS body:\n{message}")
            return True
            
        try:
            from twilio.rest import Client
            client = Client(self.twilio_sid, self.twilio_auth_token)
            client.messages.create(
                body=message,
                from_=self.twilio_number,
                to=to_phone
            )
            print(f"[AG-08] Twilio SMS successfully dispatched to '{to_phone}'.")
            return True
        except Exception as e:
            print(f"[AG-08] Twilio SMS Dispatch failed: {e}")
            return False
            
    def trigger_vault_compromised_alert(self, owner_name: str, vault_name: str, trustees: list):
        """
        Main trigger when the countdown expires. Alerts all trustees and gives decryption links.
        """
        print(f"[AG-08] Escalation Triggered! Vault '{vault_name}' has expired grace limits.")
        
        for trustee in trustees:
            name = trustee.get("name", "Trustee")
            email = trustee.get("email")
            phone = trustee.get("phone")
            recovery_link = f"http://localhost:5173/trustee/decrypt?vault={trustee.get('vault_id', 'demo')}"
            
            subject = f"ACTION REQUIRED: DeadDrop Security Release: '{vault_name}'"
            body = (
                f"Hello {name},\n\n"
                f"This is an automated security broadcast from DeadDrop.\n"
                f"The owner ({owner_name}) has failed to check in to their secure vault '{vault_name}'.\n"
                f"Your pre-assigned decryption key share has been released.\n\n"
                f"Please click the link below to access the decryption terminal and download the files:\n"
                f"{recovery_link}\n\n"
                f"Regards,\nDeadDrop Security System"
            )
            
            # Send via Email
            if email:
                self.send_email(email, subject, body)
            # Send via SMS
            if phone:
                self.send_sms(phone, f"DeadDrop: Vault '{vault_name}' keys released. Open: {recovery_link}")
