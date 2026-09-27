// Usage : node lib/scripts/hash-password.cjs "monMotDePasse"
// Copie le hash généré dans ADMIN_PASSWORD_HASH (fichier .env.local)
const bcrypt = require("bcryptjs");

const password = process.argv[2];
if (!password) {
  console.error("Usage: node hash-password.js <mot-de-passe>");
  process.exit(1);
}

bcrypt.hash(password, 12).then((hash) => {
  console.log("\nADMIN_PASSWORD_HASH=" + hash + "\n");
});
