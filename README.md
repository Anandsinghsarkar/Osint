# India API Suite

Next.js Pages Router starter for Vercel with Firebase Authentication/Firestore, admin-managed API tools, credits, QR payment requests, and optional Razorpay checkout.

## Vercel setup

1. Import this GitHub repository into Vercel and deploy using the default Next.js settings.
2. In Firebase Console, create a project, enable **Authentication → Google**, and create a **Cloud Firestore** database.
3. In Firebase Authentication → Settings → Authorized domains, add your Vercel domain.
4. In Vercel → Project → Settings → Environment Variables, add all values from `.env.example`.
   - `NEXT_PUBLIC_FIREBASE_*`: Firebase web app config.
   - `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`: service account values. For the private key, paste the full PEM key; keep it server-only.
   - `ADMIN_EMAILS`: email(s) allowed to access admin, comma-separated. Example: `owner@example.com`.
   - Razorpay values are optional until you enable checkout.
5. Redeploy after adding or changing environment variables.
6. In Firebase Console, publish the included Firestore rules. They deny direct client reads/writes; the app accesses data through authenticated server routes.
7. Sign in using an email listed in `ADMIN_EMAILS`, then visit `/admin`.

## Features

- Google sign-in with Firebase Authentication.
- First server-verified sign-in creates the Firestore user profile with 1 free credit.
- Admin email allowlist from `ADMIN_EMAILS`.
- Admin-managed tools: add, edit, publish/hide, delete, set GET/POST and credit cost.
- Credit deduction via server-side Firestore transaction.
- Admin user list and credit adjustment.
- QR image upload stored in Firestore settings; manual credit-pack requests are held for admin approval.
- Optional Razorpay order creation and signature verification.
- Firestore collections: `users`, `tools`, `creditLogs`, `settings`, `paymentRequests`, `paymentOrders`.

## Important

- Add only APIs you own or are authorized to use. Tool URLs must use HTTPS and private/local addresses are rejected.
- Tool APIs currently support GET and POST JSON requests; API-specific keys/headers and custom request fields are not configurable in the UI yet.
- A failed upstream request does not automatically refund credits; review failed requests before production use.
- Razorpay is a live payment integration: test in Razorpay Test Mode first. Never expose `RAZORPAY_KEY_SECRET` or Firebase service-account private keys in any `NEXT_PUBLIC_*` variable.
- Review your Firestore rules and test the full sign-in/payment flows before public launch.
