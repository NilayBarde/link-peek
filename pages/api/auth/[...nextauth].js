import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import prisma from "../../../lib/prisma";

export default NextAuth({
    providers: [
        GitHubProvider({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET,
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
        async session({ session }) {
            if (session?.user?.email) {
                const user = await prisma.user.findUnique({
                    where: { email: session.user.email },
                });
                session.user.isPro = user?.isPro || false;
            }
            return session;
        },
        async signIn({ user }) {
            // On first sign in, create user in DB if not exist
            const existingUser = await prisma.user.findUnique({
                where: { email: user.email },
            });
            if (!existingUser) {
                await prisma.user.create({
                    data: { email: user.email },
                });
            }
            return true;
        },
    },
});
