import prisma from "../../lib/prisma";
import { getSession } from "next-auth/react";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).end();
    }

    const session = await getSession({ req });
    if (!session?.user?.email) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    // Find user in DB
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    // Create or reuse stripe customer
    let customerId = user?.stripeCustomerId;

    if (!customerId) {
        const customer = await stripe.customers.create({
            email: session.user.email,
        });
        customerId = customer.id;

        await prisma.user.upsert({
            where: { email: session.user.email },
            update: { stripeCustomerId: customerId },
            create: {
                email: session.user.email,
                stripeCustomerId: customerId,
            },
        });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        customer: customerId,
        line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
        success_url: `${process.env.NEXTAUTH_URL}/success`,
    });

    res.status(200).json({ url: checkoutSession.url });
}
