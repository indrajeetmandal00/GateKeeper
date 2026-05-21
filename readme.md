# 🛡️ GateKeeper

A robust and secure Authentication API built with Node.js, Express, and MongoDB. 

## ✨ Features
- **🔐 Secure Authentication:** Password hashing using native Node.js `crypto`.
- **🎟️ JWT Sessions:** Short-lived access tokens and long-lived refresh tokens stored securely in `httpOnly` cookies.
- **📧 Email Verification:** OTP-based email verification using Nodemailer and Google OAuth2.
- **📱 Device Management:** Session tracking with the ability to logout from a single device or revoke access across *all* devices simultaneously.

## 🛠️ Tech Stack
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Mongoose)
- **Security:** JSON Web Tokens (JWT), Cryptography
- **Mailing:** Nodemailer (Gmail OAuth2 integration)

## 🛣️ API Endpoints
- `POST /api/auth/register` - Create an account and receive an OTP via email.
- `POST /api/auth/verify-email` - **Verify account using the emailed OTP.**
- `POST /api/auth/login` - Login to receive JWT access and refresh tokens.
- `GET /api/auth/get-user` - Get authenticated user details.
- `GET /api/auth/refresh-token` - Renew access token using the `httpOnly` refresh cookie.
- `GET /api/auth/logout` - Securely logout from the current device.
- `GET /api/auth/logout-all` - Revoke access across all devices simultaneously.

## � Getting Started
1. Clone the repository.
2. Install dependencies: `npm install`
3. Configure your `.env` file with MongoDB and Google OAuth credentials.
4. Start the development server: `npm run dev`