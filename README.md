# Candidate Registration & Resume Portal

A standalone, mobile-responsive web portal for walk-in and online candidates to register, scan, and submit their resumes. 

Submissions connect directly to the live HR CRM backend API, instantly appearing in the **HR Inbox** of the internal dashboard.

---

## 🚀 How to Run Locally

```bash
cd candidate-portal
npm install
npm run dev
```

---

## 🌐 How to Deploy on Netlify (1-Click)

1. Create a new GitHub repository (e.g. `Radiaant-Candidate-Portal`) and push this folder:
   ```bash
   cd candidate-portal
   git init
   git add .
   git commit -m "Initial commit of Candidate Portal"
   git branch -M main
   git remote add origin https://github.com/<YOUR_GITHUB>/Radiaant-Candidate-Portal.git
   git push -u origin main
   ```
2. Log into [Netlify](https://app.netlify.com).
3. Click **Add new site** → **Import an existing project** → **GitHub**.
4. Select `Radiaant-Candidate-Portal`.
5. Netlify will automatically detect `netlify.toml`:
   * **Build command**: `npm run build`
   * **Publish directory**: `dist`
6. Click **Deploy Site**!

---

## 📱 Walk-in Interview QR Code Setup

1. Copy your live Netlify URL (e.g., `https://radiaant-careers.netlify.app`).
2. Generate a QR code using any free generator (or Chrome's "Create QR Code" button).
3. Print the QR code and display it at your office reception for candidates to scan.
