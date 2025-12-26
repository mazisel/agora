
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            console.log('Explicitly loading cert from:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
            try {
                const fs = require('fs');
                if (fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
                    console.log('Credential file exists and is accessible.');
                    // Parse file just to get Project ID for the app options (optional but good for safety)
                    const serviceAccount = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
                    console.log('Service Account Project ID:', serviceAccount.project_id);

                    admin.initializeApp({
                        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
                        projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID,
                    });
                } else {
                    console.error('CRITICAL: Credential file NOT FOUND at path:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
                }
            } catch (err) {
                console.error('Error reading/parsing credential file:', err);
            }
        } else {
            const projectId = process.env.FIREBASE_PROJECT_ID;
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

            // Handle both literal \n and real newlines
            let privateKey = process.env.FIREBASE_PRIVATE_KEY;
            if (privateKey) {
                privateKey = privateKey.replace(/\\n/g, '\n');
            }

            console.log('Initializing Firebase Admin with manual env vars:');
            console.log('Project ID:', projectId);
            console.log('Client Email:', clientEmail);
            console.log('Private Key details:', {
                length: privateKey?.length,
                hasRealNewlines: privateKey?.includes('\n'),
                hasLiteralSlashN: privateKey?.includes('\\n'),
                firstChars: privateKey?.substring(0, 30),
                lastChars: privateKey?.substring(privateKey.length - 30)
            });

            if (!privateKey || !clientEmail || !projectId) {
                console.error('Missing Firebase credentials');
            }

            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
                projectId: projectId,
            });
        }
        console.log('Firebase Admin initialized successfully');
    } catch (error) {
        console.error('Firebase Admin initialization failed:', error);
    }
}

export const firebaseAdmin = admin;
