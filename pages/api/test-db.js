// pages/api/debug-env.js
export default function handler(req, res) {
    res.json({
        DATABASE_URL: process.env.DATABASE_URL ? "set" : "missing",
        NEXTAUTH_URL: process.env.NEXTAUTH_URL ? "set" : "missing",
        GITHUB_ID: process.env.GITHUB_ID ? "set" : "missing",
        GITHUB_SECRET: process.env.GITHUB_SECRET ? "set" : "missing",
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "set" : "missing",
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? "set" : "missing",
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET
            ? "set"
            : "missing",
    });
}
