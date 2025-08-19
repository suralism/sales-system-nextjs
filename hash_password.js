const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.log('Usage: node hash_password.js <your_password>');
  process.exit(1);
}

bcrypt.hash(password, 12)
  .then(hash => {
    console.log('Hashed Password:', hash);
  })
  .catch(err => {
    console.error('Error hashing password:', err);
  });
