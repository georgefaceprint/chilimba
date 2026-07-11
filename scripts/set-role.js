const { db } = require('../backend/firestore');

async function setRole(identifier, role) {
  if (!identifier || !role) {
    console.error('Usage: node set-role.js <phone_number_or_email> <ROLE>');
    console.log('Example: node set-role.js +260972879100 AGENT');
    process.exit(1);
  }

  try {
    let usersRef = db.collection('users');
    let snapshot;

    // Check if identifier is an email or phone number
    if (identifier.includes('@')) {
      snapshot = await usersRef.where('email', '==', identifier).limit(1).get();
    } else {
      snapshot = await usersRef.where('phone_number', '==', identifier).limit(1).get();
    }

    if (snapshot.empty) {
      console.log(`No user found with identifier: ${identifier}`);
      console.log('Creating a new user with this identifier...');
      
      const newUser = {
        role: role.toUpperCase(),
        created_at: new Date().toISOString()
      };
      
      if (identifier.includes('@')) {
        newUser.email = identifier;
      } else {
        newUser.phone_number = identifier;
      }
      
      const docRef = await usersRef.add(newUser);
      console.log(`Created new user (${docRef.id}) and assigned role: ${role.toUpperCase()}`);
    } else {
      const userDoc = snapshot.docs[0];
      await usersRef.doc(userDoc.id).update({ role: role.toUpperCase() });
      console.log(`Successfully updated user ${identifier} to role: ${role.toUpperCase()}`);
    }
  } catch (error) {
    console.error('Error updating role:', error);
  } finally {
    process.exit(0);
  }
}

const args = process.argv.slice(2);
setRole(args[0], args[1]);
