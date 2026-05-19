export interface EmailGenerationParams {
  userId: string;
  jobDescription: string;
  hrEmail?: string;
}

export interface GeneratedEmail {
  subject: string;
  greeting: string;
  body: string;
  closing: string;
  fullContent: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

export interface EmailToSend {
  to: string;
  subject: string;
  body: string;
}

export interface SendResult {
  success: boolean;
  timestamp?: Date;
  recipientEmail?: string;
  error?: string;
}

export interface ConfigResult {
  success: boolean;
  error?: string;
}
