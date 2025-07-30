import { buffer } from "micro";
import Stripe from "stripe";
import prisma from "../../../lib/prisma";

export const config = {
    api: { bodyParser: false },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    const buf = await buffer(req);
    const sig = req.headers["stripe-signature"];

    let event;

    try {
        event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    } catch (err) {
        console.error("⚠️ Webhook signature verification failed.", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const customerId = session.customer;

        console.log("✅ Stripe checkout completed for:", customerId);

        try {
            const updated = await prisma.user.updateMany({
                where: { stripeCustomerId: customerId },
                data: { isPro: true },
            });
            console.log(`🔁 Updated ${updated.count} user(s) to Pro`);
        } catch (error) {
            console.error("Error updating user to Pro:", error);
        }
    }

    res.json({ received: true });
}
