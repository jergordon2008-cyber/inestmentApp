"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = exports.createPortalSession = exports.createCheckoutSession = void 0;
/**
 * InvestIQ Cloud Functions — Stripe subscription backend.
 *
 * Why this exists: Stripe's secret key and webhook signature verification
 * can never live in client code (the web app). This is the minimal server
 * needed to (1) start a checkout session and (2) receive Stripe's webhook
 * telling us a payment succeeded/failed/was cancelled, then update the
 * student's subscription status in Firestore accordingly.
 *
 * Sandbox/test mode only until explicitly told to switch to live keys.
 */
const https_1 = require("firebase-functions/v2/https");
const https_2 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
admin.initializeApp();
const db = admin.firestore();
const stripeSecretKey = (0, params_1.defineSecret)('STRIPE_SECRET_KEY');
const stripeWebhookSecret = (0, params_1.defineSecret)('STRIPE_WEBHOOK_SECRET');
// $4.99/month "InvestIQ Premium" — created in Stripe sandbox.
const PREMIUM_PRICE_ID = 'price_1U6KkHKtq9wxwuwDP5ewL9Qg';
function getStripe(key) {
    return new stripe_1.default(key, { apiVersion: '2024-11-20.acacia' });
}
/**
 * Called from the app when a student taps "Subscribe". Creates a Stripe
 * Checkout Session and returns its URL — the client redirects the browser
 * there. Stripe hosts the actual payment form; we never see card details.
 */
exports.createCheckoutSession = (0, https_1.onCall)({ secrets: [stripeSecretKey] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in to subscribe.');
    }
    const uid = request.auth.uid;
    const email = request.auth.token.email;
    const successUrl = request.data?.successUrl;
    const cancelUrl = request.data?.cancelUrl;
    if (!successUrl || !cancelUrl) {
        throw new https_1.HttpsError('invalid-argument', 'successUrl and cancelUrl are required.');
    }
    const stripe = getStripe(stripeSecretKey.value());
    try {
        // Reuse an existing Stripe customer for this uid if we've made one before.
        const userDoc = await db.collection('users').doc(uid).get();
        let customerId = userDoc.data()?.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email,
                metadata: { firebaseUid: uid },
            });
            customerId = customer.id;
            await db.collection('users').doc(uid).set({ stripeCustomerId: customerId }, { merge: true });
        }
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            line_items: [{ price: PREMIUM_PRICE_ID, quantity: 1 }],
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: { firebaseUid: uid },
            subscription_data: { metadata: { firebaseUid: uid } },
            // Managed Payments is on by default for this Stripe account and
            // requires every product to carry a tax_code, which ours doesn't —
            // without this, every session creation fails with a 400
            // ("the product tax code is missing").
            managed_payments: { enabled: false },
        });
        return { url: session.url };
    }
    catch (e) {
        console.error('[createCheckoutSession] Failed', e);
        throw new https_1.HttpsError('internal', 'Could not start checkout. Please try again.');
    }
});
/**
 * Called from the app's "Manage subscription" button. Creates a Stripe
 * Billing Portal session so the student can cancel or update payment
 * method without us building that UI ourselves.
 */
exports.createPortalSession = (0, https_1.onCall)({ secrets: [stripeSecretKey] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in.');
    }
    const uid = request.auth.uid;
    const returnUrl = request.data?.returnUrl;
    if (!returnUrl) {
        throw new https_1.HttpsError('invalid-argument', 'returnUrl is required.');
    }
    const stripe = getStripe(stripeSecretKey.value());
    const userDoc = await db.collection('users').doc(uid).get();
    const customerId = userDoc.data()?.stripeCustomerId;
    if (!customerId) {
        throw new https_1.HttpsError('failed-precondition', 'No subscription found for this account.');
    }
    const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
    });
    return { url: session.url };
});
/**
 * Stripe webhook — the only source of truth for subscription status.
 * Never trust the client to tell us a payment succeeded; Stripe tells us
 * directly, with a verified signature so we know it's really Stripe.
 */
exports.stripeWebhook = (0, https_2.onRequest)({ secrets: [stripeSecretKey, stripeWebhookSecret] }, async (req, res) => {
    const stripe = getStripe(stripeSecretKey.value());
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, stripeWebhookSecret.value());
    }
    catch (err) {
        console.error('[stripeWebhook] Signature verification failed', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    try {
        switch (event.type) {
            // checkout.session.completed fires the moment payment succeeds, but
            // the Checkout Session object itself doesn't carry plan/renewal
            // data — that only exists on the Subscription object, which Stripe
            // sends right after via customer.subscription.created. So this case
            // just logs; customer.subscription.created/updated below are the
            // real source of truth for status + renewal date.
            case 'checkout.session.completed': {
                const session = event.data.object;
                console.log('[stripeWebhook] checkout completed for uid', session.metadata?.firebaseUid);
                break;
            }
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const sub = event.data.object;
                const uid = sub.metadata?.firebaseUid;
                if (uid) {
                    const isActive = sub.status === 'active' || sub.status === 'trialing';
                    const priceId = sub.items.data[0]?.price?.id;
                    await db.collection('users').doc(uid).set({
                        subscription: isActive ? 'premium' : 'free',
                        subscriptionStatus: sub.status,
                        subscriptionPlan: priceId ?? null,
                        subscriptionRenewsAt: new Date(sub.current_period_end * 1000).toISOString(),
                        subscriptionCancelAtPeriodEnd: sub.cancel_at_period_end,
                        subscriptionUpdatedAt: new Date().toISOString(),
                    }, { merge: true });
                }
                break;
            }
            case 'customer.subscription.deleted': {
                const sub = event.data.object;
                const uid = sub.metadata?.firebaseUid;
                if (uid) {
                    await db.collection('users').doc(uid).set({
                        subscription: 'free',
                        subscriptionStatus: 'canceled',
                        subscriptionCancelAtPeriodEnd: false,
                        subscriptionUpdatedAt: new Date().toISOString(),
                    }, { merge: true });
                }
                break;
            }
            default:
                break;
        }
        res.json({ received: true });
    }
    catch (err) {
        console.error('[stripeWebhook] Handler error', err);
        res.status(500).send('Internal error');
    }
});
