import prisma from "../../lib/prisma";

export default async function handler(req, res) {
    try {
        await prisma.$connect();
        const userCount = await prisma.user.count();
        res.status(200).json({ success: true, userCount });
    } catch (error) {
        console.error("DB connection error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
            stack: error.stack,
        });
    } finally {
        await prisma.$disconnect();
    }
}
