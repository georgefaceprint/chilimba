const firestore = require('./backend/firestore');
async function check() {
  const users = await firestore.query('users');
  const christine = users.find(u => u.name && u.name.includes('Christine'));
  console.log('Christine:', christine);
  const user = users.find(u => u.phone === '+260970370302' || u.phone === '260970370302' || u.phone === '0970370302' || u.phone === '970370302');
  console.log('User by phone:', user);
  const byPasscode = users.find(u => u.passcode === '47183');
  console.log('User by passcode 47183:', byPasscode);
}
check();
