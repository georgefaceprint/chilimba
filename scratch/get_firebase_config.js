const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
const path = require('path');

async function getFirebaseConfig() {
  try {
    const saPath = path.resolve(__dirname, '../dont commit/musolemutesi29-lab-fb10cd3bfb9b.json');
    if (!fs.existsSync(saPath)) {
      console.error('Service account file not found!');
      return;
    }

    const auth = new GoogleAuth({
      keyFile: saPath,
      scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase']
    });

    const client = await auth.getClient();
    const projectId = 'musolemutesi29-lab';

    console.log('Fetching Web Apps...');
    const webAppsRes = await client.request({
      url: `https://firebase.googleapis.com/v1beta1/projects/${projectId}/webApps`
    });

    const apps = webAppsRes.data.apps || [];
    if (apps.length === 0) {
      console.log('No Web Apps found in this project. You need to create one first!');
      // Let's create one if it doesn't exist!
      console.log('Creating a Web App automatically...');
      const createRes = await client.request({
        url: `https://firebase.googleapis.com/v1beta1/projects/${projectId}/webApps`,
        method: 'POST',
        data: { displayName: 'Chilimba PWA' }
      });
      console.log('Created Web App:', createRes.data);
      // Wait for it to be created, it returns an Operation
      console.log('Please run this script again to get the config after creation is complete.');
      return;
    }

    const appId = apps[0].appId;
    console.log(`Found Web App: ${apps[0].displayName} (${appId})`);

    const configRes = await client.request({
      url: `https://firebase.googleapis.com/v1beta1/projects/${projectId}/webApps/${appId}/config`
    });

    console.log('\n--- FIREBASE CONFIG ---');
    console.log('const firebaseConfig =', configRes.data, ';');
    console.log('-----------------------\n');
    
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

getFirebaseConfig();
