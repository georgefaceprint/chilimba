const firestore = require('./backend/firestore');
const crypto = require('crypto');

async function create() {
  const passcode = '47183';
  const saltStr = 'chilimba_agent_salt_2026';
  const passcodeHash = crypto.createHash('sha256').update(saltStr + passcode).digest('hex');

  const user = {
    display_name: 'Christine',
    phone_number: '+260970370302',
    passcode_hash: passcodeHash,
    role: 'AGENT',
    account_status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    shops: [
      { id: 'christines_shop', name: 'Christine\'s Shop' }
    ]
  };
  await firestore.db.collection('users').doc('+260970370302').set(user);
  console.log('Christine recreated correctly in Firestore!');
}
create();
