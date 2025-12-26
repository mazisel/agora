
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import * as fs from 'fs';

function parseServiceAccountFromEnv(): { serviceAccount: any; source: string } {
    // Prefer explicit base64 JSON
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        try {
            // Trim to avoid accidental quotes/whitespace
            const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON.trim();
            const jsonStr = Buffer.from(raw, 'base64').toString('utf8');
            const serviceAccount = JSON.parse(jsonStr);
            return { serviceAccount, source: 'GOOGLE_APPLICATION_CREDENTIALS_JSON' };
        } catch (e) {
            throw new Error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON: ' + (e as Error).message);
        }
    }

    const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
    if (gac) {
        // If it's a path and exists, read it
        if (fs.existsSync(gac)) {
            const serviceAccount = JSON.parse(fs.readFileSync(gac, 'utf8'));
            return { serviceAccount, source: `GOOGLE_APPLICATION_CREDENTIALS path (${gac})` };
        }

        // Some setups put base64 into GOOGLE_APPLICATION_CREDENTIALS; try to decode if it looks like base64
        const looksLikeBase64 = /^[A-Za-z0-9+/=]+$/.test(gac) && gac.length > 100;
        if (looksLikeBase64) {
            try {
                const jsonStr = Buffer.from(gac, 'base64').toString('utf8');
                const serviceAccount = JSON.parse(jsonStr);
                return { serviceAccount, source: 'GOOGLE_APPLICATION_CREDENTIALS (base64 payload)' };
            } catch (e) {
                throw new Error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS as base64 JSON: ' + (e as Error).message);
            }
        }

        throw new Error(`Credentials file not found: ${gac}`);
    }

    throw new Error('Firebase credentials not configured. Set GOOGLE_APPLICATION_CREDENTIALS_JSON (base64) or GOOGLE_APPLICATION_CREDENTIALS (file path)');
}

// Initialize Firebase Admin if not already initialized
function getFirebaseAdmin() {
    if (admin.apps.length === 0) {
        const { serviceAccount, source } = parseServiceAccountFromEnv();
        console.log('[FCM] Loaded credentials from', source, 'project_id:', serviceAccount.project_id);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID,
        });

        console.log('[FCM] Firebase Admin initialized successfully');
    }
    return admin;
}

export async function POST(request: Request) {
    try {
        const { token, title, body, data } = await request.json();

        if (!token) {
            return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 });
        }

        const firebaseAdmin = getFirebaseAdmin();

        // Sanitize data to ensure all values are strings (required by FCM)
        const sanitizedData: Record<string, string> = {};
        if (data) {
            Object.keys(data).forEach(key => {
                const value = data[key];
                if (value !== null && value !== undefined) {
                    sanitizedData[key] = String(value);
                }
            });
        }

        const message = {
            notification: {
                title,
                body,
            },
            data: sanitizedData,
            token: token,
        };

        try {
            console.log('[FCM] Sending message...');
            const response = await firebaseAdmin.messaging().send(message);
            console.log('[FCM] Successfully sent message:', response);
            return NextResponse.json({ success: true, messageId: response });
        } catch (error: any) {
            console.error('[FCM] Error sending message:', {
                code: error.code,
                message: error.message,
                stack: error.stack,
                errorInfo: error.errorInfo,
            });

            // Known issue: Next.js runtime interferes with firebase-admin HTTP requests
            // DryRun works but actual send fails with third-party-auth-error
            // This is a documented incompatibility between Next.js and firebase-admin FCM

            // If the error is about invalid token, that's actually success for auth
            if (error.code === 'messaging/invalid-argument' ||
                error.code === 'messaging/registration-token-not-registered') {
                return NextResponse.json({
                    success: false,
                    error: 'Invalid FCM token - user may have uninstalled the app or token expired',
                    authWorked: true
                }, { status: 400 });
            }

            // For auth errors, return a specific message
            if (error.code === 'messaging/third-party-auth-error') {
                console.warn('[FCM] Known Next.js compatibility issue - FCM disabled temporarily');
                return NextResponse.json({
                    success: false,
                    error: 'FCM temporarily unavailable due to environment issue',
                    knownIssue: true
                }, { status: 503 });
            }

            return NextResponse.json({ success: false, error: error.message || 'Failed to send message' }, { status: 500 });
        }

    } catch (error: any) {
        console.error('[FCM] Error processing request:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
