<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Voltx EV Vault

A smart expense tracker and inventory management app for Voltx EV.

## Features
- **Expense Tracking**: Scan and extract data from invoices/receipts using Gemini AI.
- **Inventory Management**: Track stock levels, stock movements, and production.
- **Sales**: Generate and manage sales invoices, credit notes, and delivery challans.
- **Data Persistence**: Uses Firebase Firestore for reliable cloud storage.

## Setup

### Prerequisites
- Node.js (v18+)
- Firebase Project

### Installation

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Configure Environment:
    - Create a `.env` file (or use `.env.local`):
      ```
      GEMINI_API_KEY=your_gemini_api_key_here
      ```

3.  Configure Firebase:
    - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com/)
    - Enable **Firestore Database**.
    - Copy your web app configuration from Project Settings.
    - Update `services/firebase.ts` with your config:
      ```typescript
      const firebaseConfig = {
        apiKey: "...",
        authDomain: "...",
        projectId: "...",
        // ...
      };
      ```

4.  Run Locally:
    ```bash
    npm run dev
    ```

## Deployment

This app is configured for Firebase Hosting.

1.  Login to Firebase CLI:
    ```bash
    npx firebase login
    ```

2.  Deploy:
    ```bash
    npm run build
    npx firebase deploy
    ```

## Architecture
- **Frontend**: React + Vite + Tailwind CSS
- **AI**: Google Gemini (via `@google/generative-ai`)
- **Database**: Firebase Firestore
- **Hosting**: Firebase Hosting
