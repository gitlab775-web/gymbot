# RK Gym WhatsApp MVP

Node.js + Express MVP for gym memberships over WhatsApp.

This first version can run in dummy/local mode:

- No real WhatsApp account needed
- No real Razorpay account needed
- Google Sheet is optional
- Member data is saved in `data/members.json` unless Google Sheets is enabled

## Features

- Customer says `Hi`
- Bot shows plans:
  - Monthly - Rs 600
  - Quarterly - Rs 1500
  - Half Yearly - Rs 2700
- Bot asks for full name
- Bot creates a payment link
- Dummy payment activates membership
- Member data follows Google Sheet columns:
  `memberId | name | phone | plan | amount | startDate | endDate | status | reminder3Days | reminderToday | lastPaymentId`
- Daily cron runs at 9 AM for renewal reminders
- Admin member list available as JSON
- Excel export is available only in local JSON mode

## Folder Structure

```text
src/
  app.js
  server.js
  config/
  controllers/
  middleware/
  routes/
  services/
  utils/
data/
  members.json
```

## Start

```powershell
npm install
Copy-Item .env.example .env
npm start
```

Open:

```text
http://localhost:3000/health
```

## Test Dummy Bot

Send `Hi`:

```powershell
Invoke-RestMethod http://localhost:3000/dev/message -Method POST -ContentType "application/json" -Body '{"phone":"9876543210","text":"Hi"}'
```

Choose monthly:

```powershell
Invoke-RestMethod http://localhost:3000/dev/message -Method POST -ContentType "application/json" -Body '{"phone":"9876543210","text":"1"}'
```

Send name:

```powershell
Invoke-RestMethod http://localhost:3000/dev/message -Method POST -ContentType "application/json" -Body '{"phone":"9876543210","text":"Vikas Jadhav"}'
```

The reply contains a dummy payment link. Open it in the browser to activate membership.

## Real Integrations Later

Add these one by one:

1. Twilio WhatsApp Sandbox
2. Razorpay credentials and webhook
3. Google Sheets service account
4. Production hosting on Render or Railway

## Google Sheets Setup

Use Google Sheets instead of Excel/JSON:

1. Create a Google Sheet.
2. Rename the first tab to:

```text
Members
```

3. Add this header row in row 1:

```text
memberId | name | phone | plan | amount | startDate | endDate | status | reminder3Days | reminderToday | lastPaymentId
```

4. Create a Google Cloud service account.
5. Enable Google Sheets API for that Google Cloud project.
6. Create a JSON key for the service account.
7. Share your Google Sheet with the service account email as Editor.
8. Put these values in `.env`:

```env
GOOGLE_SHEETS_ENABLED=true
GOOGLE_SHEET_ID=your_sheet_id_from_url
GOOGLE_SHEET_RANGE=Members!A:K
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

After this, `/members`, reminders, pending members, and payment activation use Google Sheets as the database. `/export` opens the Google Sheet instead of creating an Excel file.

## Twilio WhatsApp Setup

Twilio is the recommended testing path for this MVP.

1. Create/open a Twilio account.
2. Go to Messaging > Try it out > Send a WhatsApp message.
3. Join the Twilio WhatsApp Sandbox from your personal WhatsApp.
4. Copy these values into `.env`:

```env
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_PLAN_CONTENT_SID=
```

5. Put this webhook in Twilio Sandbox:

```text
https://YOUR-PUBLIC-URL/twilio/webhook
```

Use HTTP `POST`.

Then send:

```text
Hi
```

to the Twilio Sandbox WhatsApp number.

Twilio webhook URL:

- Messages: `POST /twilio/webhook`

### Optional Tap Buttons

To let members tap a plan instead of typing `1`, `2`, or `3`:

1. In Twilio Console, open Messaging > Content Template Builder.
2. Create a `twilio/quick-reply` content template.
3. Body example:

```text
Welcome to RK Gym
Choose membership:
```

4. Add three quick reply buttons:

```text
Monthly
Quarterly
Half Yearly
```

5. Copy the template Content SID, beginning with `HX...`.
6. Put it in `.env`:

```env
TWILIO_PLAN_CONTENT_SID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

When a user sends `Hi`, the app sends that quick-reply template. When they tap a button, Twilio sends the button text back to the webhook and the bot continues the same payment flow.

WhatsApp Cloud API webhook URLs:

- Verify: `GET /webhook`
- Messages: `POST /webhook`

## WhatsApp Cloud API Setup

1. Go to Meta Developers and create an app.
2. Add the WhatsApp product.
3. Open WhatsApp > API Setup.
4. Copy these into `.env`:
   - `WHATSAPP_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
5. Add your personal WhatsApp number as a test recipient in Meta.
6. Start a public tunnel:

```powershell
ngrok http 3000
```

7. Update `.env`:

```env
PUBLIC_BASE_URL=https://YOUR-NGROK-URL
WHATSAPP_VERIFY_TOKEN=abc-gym-local-token
```

8. In Meta Developers > WhatsApp > Configuration, set:

```text
Callback URL: https://YOUR-NGROK-URL/webhook
Verify token: abc-gym-local-token
```

9. Subscribe the webhook to the `messages` field.

Now message the Meta test WhatsApp number from your verified recipient number and send:

```text
Hi
```

Razorpay webhook URL:

- `POST /razorpay-webhook`

## Owner Manual Reminders

Set owner phone in `.env`:

```env
OWNER_PHONE=+917385928150
OWNER_REMINDER_DAYS=7
```

The owner can send this WhatsApp command to the bot:

```text
remind expiring
```

It sends renewal reminders to active members whose memberships end within `OWNER_REMINDER_DAYS`.

You can also trigger it by API:

```powershell
Invoke-RestMethod http://localhost:3000/owner/reminders -Method POST -ContentType "application/json" -Body '{"days":7}'
```
