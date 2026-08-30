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
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

admin.initializeApp();
const db = admin.firestore();

const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');

// $4.99/month "InvestIQ Premium" — created in Stripe sandbox.
const PREMIUM_PRICE_ID = 'price_1U6KkHKtq9wxwuwDP5ewL9Qg';

function getStripe(key: string): Stripe {
  return new Stripe(key, { apiVersion: '2024-11-20.acacia' as any });
}

/**
 * Called from the app when a student taps "Subscribe". Creates a Stripe
 * Checkout Session and returns its URL — the client redirects the browser
 * there. Stripe hosts the actual payment form; we never see card details.
 */
export const createCheckoutSession = onCall(
  { secrets: [stripeSecretKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in to subscribe.');
    }
    const uid = request.auth.uid;
    const email = request.auth.token.email as string | undefined;
    const successUrl = request.data?.successUrl as string;
    const cancelUrl = request.data?.cancelUrl as string;
    if (!successUrl || !cancelUrl) {
      throw new HttpsError('invalid-argument', 'successUrl and cancelUrl are required.');
    }

    const stripe = getStripe(stripeSecretKey.value());

    try {
      // Reuse an existing Stripe customer for this uid if we've made one before.
      const userDoc = await db.collection('users').doc(uid).get();
      let customerId = userDoc.data()?.stripeCustomerId as string | undefined;

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
      } as Stripe.Checkout.SessionCreateParams);
      return { url: session.url };
    } catch (e: any) {
      console.error('[createCheckoutSession] Failed', e);
      throw new HttpsError('internal', 'Could not start checkout. Please try again.');
    }
  }
);

/**
 * Called from the app's "Manage subscription" button. Creates a Stripe
 * Billing Portal session so the student can cancel or update payment
 * method without us building that UI ourselves.
 */
export const createPortalSession = onCall(
  { secrets: [stripeSecretKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.');
    }
    const uid = request.auth.uid;
    const returnUrl = request.data?.returnUrl as string;
    if (!returnUrl) {
      throw new HttpsError('invalid-argument', 'returnUrl is required.');
    }

    const stripe = getStripe(stripeSecretKey.value());
    const userDoc = await db.collection('users').doc(uid).get();
    const customerId = userDoc.data()?.stripeCustomerId as string | undefined;
    if (!customerId) {
      throw new HttpsError('failed-precondition', 'No subscription found for this account.');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }
);

/**
 * Stripe webhook — the only source of truth for subscription status.
 * Never trust the client to tell us a payment succeeded; Stripe tells us
 * directly, with a verified signature so we know it's really Stripe.
 */
export const stripeWebhook = onRequest(
  { secrets: [stripeSecretKey, stripeWebhookSecret] },
  async (req, res) => {
    const stripe = getStripe(stripeSecretKey.value());
    const sig = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, stripeWebhookSecret.value());
    } catch (err: any) {
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
          const session = event.data.object as Stripe.Checkout.Session;
          console.log('[stripeWebhook] checkout completed for uid', (session.metadata as any)?.firebaseUid);
          break;
        }
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const sub = event.data.object as Stripe.Subscription;
          const uid = (sub.metadata as any)?.firebaseUid;
          if (uid) {
            const isActive = sub.status === 'active' || sub.status === 'trialing';
            const priceId = sub.items.data[0]?.price?.id;
            await db.collection('users').doc(uid).set(
              {
                subscription: isActive ? 'premium' : 'free',
                subscriptionStatus: sub.status,
                subscriptionPlan: priceId ?? null,
                subscriptionRenewsAt: new Date(sub.current_period_end * 1000).toISOString(),
                subscriptionCancelAtPeriodEnd: sub.cancel_at_period_end,
                subscriptionUpdatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
          }
          break;
        }
        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription;
          const uid = (sub.metadata as any)?.firebaseUid;
          if (uid) {
            await db.collection('users').doc(uid).set(
              {
                subscription: 'free',
                subscriptionStatus: 'canceled',
                subscriptionCancelAtPeriodEnd: false,
                subscriptionUpdatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
          }
          break;
        }
        default:
          break;
      }
      res.json({ received: true });
    } catch (err) {
      console.error('[stripeWebhook] Handler error', err);
      res.status(500).send('Internal error');
    }
  }
);
