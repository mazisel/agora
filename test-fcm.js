
const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccountPath = '/Users/oguzart/Downloads/agora-cea40-firebase-adminsdk-fbsvc-049c195c5d.json';

try {
    console.log('Reading service account file...');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    console.log('Project ID:', serviceAccount.project_id);
    console.log('Client Email:', serviceAccount.client_email);

    console.log('Initializing Firebase Admin...');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
    });

    // Use a placeholder token - we expect "invalid-argument" error if auth works
    const message = {
        notification: {
            title: 'Test Notification',
            body: 'This is a test',
        },
        token: 'test_invalid_token_12345'
    };

    console.log('\n=== Testing with dryRun=true ===');
    admin.messaging().send(message, true) // dryRun = true
        .then((response) => {
            console.log('DryRun succeeded:', response);
        })
        .catch((error) => {
            console.log('DryRun error:', error.code, error.message);
            if (error.code === 'messaging/invalid-argument') {
                console.log('✅ DryRun: AUTH WORKS, token is invalid (expected)');
            }
        })
        .then(() => {
            console.log('\n=== Testing with dryRun=false (actual send) ===');
            return admin.messaging().send(message, false); // dryRun = false
        })
        .then((response) => {
            console.log('Actual send succeeded:', response);
        })
        .catch((error) => {
            console.log('Actual send error:', error.code, error.message);
            if (error.code === 'messaging/invalid-argument') {
                console.log('✅ Actual send: AUTH WORKS, token is invalid (expected)');
            } else if (error.code === 'messaging/third-party-auth-error') {
                console.log('❌ Actual send: AUTH FAILED - same issue as Next.js!');
            }
        });

} catch (error) {
    console.error('Script failed:', error);
}
