# ClientFlow n8n Workflows (Plug & Play)

## How to Import
1. Open n8n → **Settings → Import from File**.
2. Import each JSON in numerical order (01 → 06) and **activate** after setting ENV.

## Set ENV node (first node in each flow)
- `API_BASE_URL` → your API root, e.g. `https://app.clientflow.ai/api`
- `ORG_ID` → your organization UUID
- `AUTH_TOKEN` → `Bearer <your_api_token>`
- Optional: `SLACK_WEBHOOK_URL`, `STRIPE_WEBHOOK_SECRET`
- **Booking flow** only: update the OpenAI node to use your key.

## Webhook URLs to configure
- **Twilio Inbound SMS** → `/webhook/clientflow/bookings`
- **Stripe Webhook** → `/webhook/clientflow/stripe`
- **Lead Capture** (forms/ads) → `/webhook/clientflow/leads`

## Notes
- These workflows call your API endpoints (`/automations/sms_inbound`, `/appointments`, `/messages/outbound`, `/sla/unanswered`). Make sure they exist.
- If keys (Twilio/SendGrid) aren't set, your API should return a `sandbox:true` response for outbound messages.