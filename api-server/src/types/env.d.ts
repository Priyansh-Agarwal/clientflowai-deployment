declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: string;
      PORT: string;
      API_BASE_URL: string;
      JWT_SECRET: string;
      DATABASE_URL: string;
      REDIS_URL: string;
      SUPABASE_URL: string;
      SUPABASE_SERVICE_ROLE_KEY: string;
      TWILIO_ACCOUNT_SID: string;
      TWILIO_AUTH_TOKEN: string;
      TWILIO_SIGNING_SECRET: string;
      TWILIO_FROM: string;
      SENDGRID_API_KEY: string;
      SENDGRID_FROM: string;
      STRIPE_SECRET_KEY: string;
      STRIPE_WEBHOOK_SECRET: string;
      OPENAI_API_KEY: string;
      SENTRY_DSN: string;
      POSTHOG_KEY: string;
      GOOGLE_SVC_ACCOUNT_JSON_BASE64: string;
      VITE_PUBLIC_API_BASE_URL: string;
      VITE_PUBLIC_SUPABASE_URL: string;
      VITE_PUBLIC_SUPABASE_ANON_KEY: string;
      ON_CALL_PHONE: string;
    }
  }
}

export {};
