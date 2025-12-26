
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import { JWT } from 'google-auth-library';

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

async function sendHttpV1(serviceAccount: any, token: string, title: string, body: string, data?: Record<string, string>) {
    if (!serviceAccount?.client_email || !serviceAccount?.private_key || !serviceAccount?.project_id) {
        throw new Error('Service account missing required fields for HTTP v1 FCM call');
    }

    const jwtClient = new JWT({
        email: serviceAccount.client_email,
        key: serviceAccount.private_key,
        scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });

    const accessToken = await jwtClient.getAccessToken();
    if (!accessToken || !accessToken.token) {
        throw new Error('Failed to obtain access token for FCM HTTP v1');
    }

    const message = {
        message: {
            token,
            notification: { title, body },
            data,
        },
    };

    const resp = await fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken.token}`,
        },
        body: JSON.stringify(message),
    });

    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
        console.error('[FCM] HTTP v1 API error:', resp.status, json);
        throw new Error(`FCM HTTP v1 error: ${resp.status}`);
    }

    console.log('[FCM] HTTP v1 API success:', json);
    return json;
}

export async function POST(request: Request) {
    try {
        const { token, title, body, data } = await request.json();

        if (!token) {
            return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 });
        }

        const parsed = parseServiceAccountFromEnv();
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

            // Fallback to HTTP v1 API using service account directly
            const retryable = error.code === 'messaging/third-party-auth-error' || error.code === 'app/network-timeout';
            if (retryable) {
                try {
                    const v1 = await sendHttpV1(parsed.serviceAccount, token, title, body, sanitizedData);
                    return NextResponse.json({ success: true, via: 'http_v1', response: v1 });
                } catch (v1err: any) {
                    console.error('[FCM] HTTP v1 fallback failed:', v1err);
                }
            }

            // Fallback: use legacy HTTP API with server key if available
            const serverKey = process.env.FCM_SERVER_KEY;
            if (serverKey) {
                try {
                    console.log('[FCM] Trying legacy HTTP API fallback');
                    const legacyRes = await fetch('https://fcm.googleapis.com/fcm/send', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `key=${serverKey}`,
                        },
                        body: JSON.stringify({
                            to: token,
                            notification: { title, body },
                            data: sanitizedData,
                        }),
                    });

                    const legacyJson = await legacyRes.json().catch(() => ({}));
                    if (!legacyRes.ok) {
                        console.error('[FCM] Legacy API error:', legacyRes.status, legacyJson);
                        return NextResponse.json({
                            success: false,
                            legacy: true,
                            status: legacyRes.status,
                            error: legacyJson,
                        }, { status: 500 });
                    }

                    console.log('[FCM] Legacy API success:', legacyJson);
                    return NextResponse.json({ success: true, legacy: true, response: legacyJson });
                } catch (legacyErr: any) {
                    console.error('[FCM] Legacy API fallback failed:', legacyErr);
                    // continue to known issue response below
                }
            }

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
