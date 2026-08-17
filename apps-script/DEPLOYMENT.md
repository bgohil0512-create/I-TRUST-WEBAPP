# I-TRUST WEBAPP — Apps Script API Deployment

## 1. Create the Google Sheet
Create the main online database Google Sheet. Copy its spreadsheet ID from the URL.

## 2. Open Apps Script
Open **Extensions → Apps Script** from the Google Sheet, then copy the files from `apps-script/` in this repository into the Apps Script project.

## 3. Configure Spreadsheet ID
In Apps Script, open **Project Settings → Script Properties** and add:

`SPREADSHEET_ID` = your Google Spreadsheet ID

Do not put this ID in the React frontend.

## 4. Initialize database sheets
Run the `setupSchema` function once from the Apps Script editor and authorize the project. It creates the required sheets and header rows.

## 5. Deploy the API
Use **Deploy → New deployment → Web app**.

Recommended execution/access configuration for the API:
- Execute as: **Me**
- Who has access: choose the access level appropriate for your deployment/testing environment.

Copy the deployed **Web app URL** ending in `/exec`.

## 6. Connect the React app
Create the frontend `.env` file from `.env.example` and set:

`VITE_APPS_SCRIPT_API_URL=<your /exec URL>`

Then restart the frontend dev server after changing `.env`.

## 7. Important security rule
The deployed URL is an API endpoint, not a secret. Do not place `SPREADSHEET_ID`, service credentials, or password hashes in frontend code. Authorization and shop isolation must remain enforced in Apps Script.

## 8. First test
Call the `/exec` URL with GET. Expected response is JSON containing:

`success: true`

`service: I-TRUST-WEBAPP API`

After schema setup and an initial active Admin user exist, test `LOGIN` through the web app.
