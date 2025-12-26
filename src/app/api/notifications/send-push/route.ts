
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import * as fs from 'fs';

// Initialize Firebase Admin if not already initialized
function getFirebaseAdmin() {
    if (admin.apps.length === 0) {
        const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        if (!credPath) {
            throw new Error('GOOGLE_APPLICATION_CREDENTIALS not set');
        }

        console.log('[FCM] Loading credentials from:', credPath);

        if (!fs.existsSync(credPath)) {
            throw new Error(`Credentials file not found: ${credPath}`);
        }

        const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
        console.log('[FCM] Project ID:', serviceAccount.project_id);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
            projectId: serviceAccount.project_id,
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
