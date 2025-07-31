// pages/api/test-prisma.js
import prisma from "../../lib/prisma";

export default async function handler(req, res) {
    try {
        const users = await prisma.user.findMany();
        res.json({ users });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
