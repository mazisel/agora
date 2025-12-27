
import * as admin from 'firebase-admin';

function parseServiceAccount(): admin.ServiceAccount | null {
    // Try GOOGLE_APPLICATION_CREDENTIALS_JSON first (base64 encoded)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        try {
            const decoded = Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON, 'base64').toString('utf8');
            const serviceAccount = JSON.parse(decoded);

            // Fix private key format - replace literal \n with real newlines
            if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }

            console.log('[FCM] Loaded credentials from GOOGLE_APPLICATION_CREDENTIALS_JSON project_id:', serviceAccount.project_id);
            return serviceAccount;
        } catch (error) {
            console.error('[FCM] Error parsing GOOGLE_APPLICATION_CREDENTIALS_JSON:', error);
        }
    }

    // Try GOOGLE_APPLICATION_CREDENTIALS file path
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        try {
            const fs = require('fs');
            if (fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
                const serviceAccount = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));

                // Fix private key format
                if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
                    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
                }

                console.log('[FCM] Loaded credentials from file:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
                return serviceAccount;
            }
        } catch (error) {
            console.error('[FCM] Error reading credential file:', error);
        }
    }

    // Try individual env vars
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
        // Fix private key format
        privateKey = privateKey.replace(/\\n/g, '\n');

        console.log('[FCM] Using individual Firebase env vars');
        return {
            projectId,
            clientEmail,
            privateKey,
        } as admin.ServiceAccount;
    }

    console.error('[FCM] No valid Firebase credentials found');
    return null;
}

if (!admin.apps.length) {
    try {
        const serviceAccount = parseServiceAccount();

        if (serviceAccount) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.projectId || process.env.FIREBASE_PROJECT_ID,
            });
            console.log('[FCM] Firebase Admin initialized successfully');
        } else {
            console.error('[FCM] Firebase Admin initialization skipped - no valid credentials');
        }
    } catch (error) {
        console.error('[FCM] Firebase Admin initialization failed:', error);
    }
}

export function getFirebaseAdmin() {
    return admin;
}

export const firebaseAdmin = admin;
