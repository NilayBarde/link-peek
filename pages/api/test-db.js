export default function handler(req, res) {
    const dbUrl = process.env.DATABASE_URL || "Not set";
    res.status(200).json({ dbUrl: dbUrl.slice(0, 40) + "..." });
}
