
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import dns from 'node:dns';
import { Agent, fetch as undiciFetch } from 'undici';
import { createSign } from 'node:crypto';

// Prefer IPv4 to avoid IPv6 timeouts in some environments
dns.setDefaultResultOrder('ipv4first');
const ipv4Agent = new Agent({ connect: { family: 4, timeout: 10000 } });

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
        console.error('[FCM] Service account missing fields:', {
            hasClientEmail: !!serviceAccount?.client_email,
            hasPrivateKey: !!serviceAccount?.private_key,
            hasProjectId: !!serviceAccount?.project_id,
        });
        throw new Error('Service account missing required fields for HTTP v1 FCM call');
    }

    // Fix private key format - replace literal \n with real newlines
    let privateKey = serviceAccount.private_key;
    if (typeof privateKey === 'string') {
        privateKey = privateKey.replace(/\\n/g, '\n');
    }

    console.log('[FCM] Service account debug:', {
        clientEmail: serviceAccount.client_email,
        projectId: serviceAccount.project_id,
        privateKeyLength: privateKey?.length,
        privateKeyStart: privateKey?.substring(0, 40),
        privateKeyEnd: privateKey?.substring(privateKey.length - 40),
        hasBeginMarker: privateKey?.includes('-----BEGIN PRIVATE KEY-----'),
        hasEndMarker: privateKey?.includes('-----END PRIVATE KEY-----'),
    });

    // Build JWT assertion manually to control transport (IPv4)
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600;
    const scope = 'https://www.googleapis.com/auth/firebase.messaging';
    const aud = 'https://oauth2.googleapis.com/token';

    const base64url = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const header = { alg: 'RS256', typ: 'JWT' };
    const claimSet = {
        iss: serviceAccount.client_email,
        scope,
        aud,
        exp,
        iat,
    };
    const unsigned = `${base64url(header)}.${base64url(claimSet)}`;

    let signature: string;
    try {
        const signer = createSign('RSA-SHA256');
        signer.update(unsigned);
        signature = signer.sign(privateKey, 'base64url');
    } catch (signError: any) {
        console.error('[FCM] JWT signing error:', signError.message);
        throw new Error(`JWT signing failed: ${signError.message}`);
    }

    const assertion = `${unsigned}.${signature}`;

    const tokenResp = await undiciFetch(aud, {
        method: 'POST',
        dispatcher: ipv4Agent,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion,
        }).toString(),
    });

    const tokenJson: any = await tokenResp.json().catch(() => ({}));
    if (!tokenResp.ok || !tokenJson.access_token) {
        console.error('[FCM] OAuth token error:', tokenResp.status, tokenJson);
        throw new Error(`FCM token error: ${tokenResp.status}`);
    }

    const message = {
        message: {
            token,
            notification: { title, body },
            data,
        },
    };

    const resp = await undiciFetch(
        `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
        {
            method: 'POST',
            dispatcher: ipv4Agent,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${tokenJson.access_token}`,
            },
            body: JSON.stringify(message),
        }
    );

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

        // Try HTTP v1 API first (more reliable in Docker environments)
        try {
            const parsed = parseServiceAccountFromEnv();
            console.log('[FCM] Trying HTTP v1 API first...');
            const v1Result = await sendHttpV1(parsed.serviceAccount, token, title, body, sanitizedData);
            return NextResponse.json({ success: true, via: 'http_v1', response: v1Result });
        } catch (v1Error: any) {
            console.warn('[FCM] HTTP v1 API failed, trying Firebase Admin SDK:', v1Error.message);
        }

        // Fallback to Firebase Admin SDK
        try {
            const firebaseAdmin = getFirebaseAdmin();
            const message = {
                notification: { title, body },
                data: sanitizedData,
                token: token,
            };

            console.log('[FCM] Sending message via Firebase Admin SDK...');
            const response = await firebaseAdmin.messaging().send(message);
            console.log('[FCM] Successfully sent message:', response);
            return NextResponse.json({ success: true, messageId: response });
        } catch (sdkError: any) {
            console.error('[FCM] Firebase Admin SDK error:', {
                code: sdkError.code,
                message: sdkError.message,
            });

            // If the error is about invalid token, that's actually success for auth
            if (sdkError.code === 'messaging/invalid-argument' ||
                sdkError.code === 'messaging/registration-token-not-registered') {
                return NextResponse.json({
                    success: false,
                    error: 'Invalid FCM token - user may have uninstalled the app or token expired',
                    authWorked: true
                }, { status: 400 });
            }

            // Try legacy HTTP API with server key if available
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
                }
            }

            // Return error
            if (sdkError.code === 'messaging/third-party-auth-error' || sdkError.code === 'app/network-timeout') {
                console.warn('[FCM] Known Docker/Next.js compatibility issue');
                return NextResponse.json({
                    success: false,
                    error: 'FCM temporarily unavailable due to network/environment issue',
                    knownIssue: true
                }, { status: 503 });
            }

            return NextResponse.json({ success: false, error: sdkError.message || 'Failed to send message' }, { status: 500 });
        }

    } catch (error: any) {
        console.error('[FCM] Error processing request:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
