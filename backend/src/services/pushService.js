const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

let publicKey = process.env.VAPID_PUBLIC_KEY;
let privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:support@punchup.app';

if (!publicKey || !privateKey) {
  // Fallback to generated keys if not provided in environment
  const generated = webpush.generateVAPIDKeys();
  publicKey = generated.publicKey;
  privateKey = generated.privateKey;
  console.log('[Push Service] Generated ephemeral VAPID keys for development/testing.');
}

try {
  webpush.setVapidDetails(subject, publicKey, privateKey);
  console.log('[Push Service] Web Push configured with VAPID details.');
} catch (err) {
  console.error('[Push Service] Error configuring VAPID:', err.message);
}

const getPublicKey = () => publicKey;

/**
 * Send push notification to all subscriptions for a specific user
 * Automatically cleans up invalid/expired subscriptions (404/410 Gone)
 */
const sendPushToUser = async (userId, payload) => {
  try {
    const subscriptions = await PushSubscription.find({ user: userId });
    if (!subscriptions || subscriptions.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    let sent = 0;
    let failed = 0;

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          };

          await webpush.sendNotification(pushSubscription, payloadString);
          sent++;
        } catch (error) {
          failed++;
          // 404 Not Found or 410 Gone indicates subscription has expired or unsubscribed
          if (error.statusCode === 404 || error.statusCode === 410) {
            console.log(`[Push Service] Cleaning up expired subscription ${sub._id} (${error.statusCode})`);
            await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
          } else {
            console.warn(`[Push Service] Error sending push notification: ${error.message} (status: ${error.statusCode})`);
          }
        }
      })
    );

    return { sent, failed };
  } catch (error) {
    console.error('[Push Service] Failed to send push to user:', error.message);
    return { sent: 0, failed: 0, error: error.message };
  }
};

module.exports = {
  getPublicKey,
  sendPushToUser,
};
