// hashPassword.js
const bcrypt = require('bcrypt');

async function hashPassword() {
  const password = "admin123"; // <-- choose any password you want
  const hashed = await bcrypt.hash(password, 10);
  console.log("Hashed password:", hashed);
}

hashPassword();
