#!/usr/bin/env npx tsx
/**
 * Script to create a Stripe webhook endpoint for the production deployment.
 * Run with: npx tsx scripts/create-stripe-webhook.ts
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const VERCEL_URL = 'https://class-registration-system.vercel.app';
const WEBHOOK_ENDPOINT = `${VERCEL_URL}/api/webhooks/stripe`;

if (!STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY not found in .env.local');
    process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

async function main() {
    console.log('🔧 Creating Stripe webhook endpoint...');
    console.log(`   URL: ${WEBHOOK_ENDPOINT}`);

    try {
        // Check for existing webhooks first
        const existingWebhooks = await stripe.webhookEndpoints.list({ limit: 100 });
        const existingEndpoint = existingWebhooks.data.find(
            (wh) => wh.url === WEBHOOK_ENDPOINT
        );

        if (existingEndpoint) {
            console.log('⚠️  Webhook endpoint already exists!');
            console.log(`   ID: ${existingEndpoint.id}`);
            console.log(`   Status: ${existingEndpoint.status}`);
            console.log(`   Secret: (already configured, check Stripe Dashboard)`);
            return;
        }

        // Create new webhook endpoint
        const webhookEndpoint = await stripe.webhookEndpoints.create({
            url: WEBHOOK_ENDPOINT,
            enabled_events: [
                'checkout.session.completed',
                'checkout.session.expired',
                'charge.refunded',
            ],
            description: 'Class Registration System - Production Webhook',
        });

        console.log('✅ Webhook endpoint created successfully!');
        console.log(`   ID: ${webhookEndpoint.id}`);
        console.log(`   Status: ${webhookEndpoint.status}`);
        console.log('');
        console.log('🔐 IMPORTANT: Copy the signing secret below and add it to your Vercel environment variables as STRIPE_WEBHOOK_SECRET:');
        console.log(`   ${webhookEndpoint.secret}`);
        console.log('');
        console.log('👉 Next steps:');
        console.log('   1. Go to Vercel Dashboard → Settings → Environment Variables');
        console.log('   2. Add/Update STRIPE_WEBHOOK_SECRET with the value above');
        console.log('   3. Redeploy your application');

    } catch (error) {
        console.error('❌ Error creating webhook:', error);
        process.exit(1);
    }
}

main();
