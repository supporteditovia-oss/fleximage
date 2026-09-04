#!/usr/bin/env node
/**
 * Sauvegarde et synchronise le travail en une commande.
 *
 * Le site se déploie depuis GitHub : tout ce qui n'est pas poussé n'existe
 * nulle part ailleurs que sur la machine où il a été écrit. Cette commande
 * récupère ce qui vient du téléphone, puis envoie ce qui a été fait ici.
 *
 *   npm run save
 *   npm run save -- "message libre"
 */

import { execFileSync } from "node:child_process";

function git(args, { quiet = false } = {}) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: quiet ? ["ignore", "pipe", "pipe"] : ["ignore", "pipe", "inherit"],
  }).trim();
}

function tryGit(args) {
  try {
    return { ok: true, out: git(args, { quiet: true }) };
  } catch (error) {
    return { ok: false, out: String(error.stderr || error.message || error) };
  }
}

const branch = git(["rev-parse", "--abbrev-ref", "HEAD"], { quiet: true });
if (branch === "HEAD") {
  console.error("Tu n'es sur aucune branche (HEAD détaché). Rien n'a été fait.");
  process.exit(1);
}

console.log(`Branche : ${branch}`);

// 1. Récupérer d'abord ce qui a été fait ailleurs (téléphone, agent, autre PC).
const stash = git(["status", "--porcelain"], { quiet: true })
  ? tryGit(["stash", "push", "-u", "-m", "save-auto"])
  : { ok: false };

const pull = tryGit(["pull", "--rebase", "origin", branch]);
if (!pull.ok && !/couldn't find remote ref|no such ref/i.test(pull.out)) {
  console.error("Impossible de récupérer la version distante :\n" + pull.out);
  if (stash.ok) tryGit(["stash", "pop"]);
  process.exit(1);
}

if (stash.ok) {
  const pop = tryGit(["stash", "pop"]);
  if (!pop.ok) {
    console.error(
      "Conflit en réappliquant tes modifications locales :\n" + pop.out,
    );
    process.exit(1);
  }
}

// 2. Envoyer ce qui a été fait ici.
git(["add", "-A"]);

if (!git(["status", "--porcelain"], { quiet: true })) {
  console.log("Rien de nouveau à sauvegarder.");
} else {
  const custom = process.argv.slice(2).join(" ").trim();
  const stamp = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
  git(["commit", "-m", custom || `Sauvegarde du ${stamp}`]);
  console.log("Modifications enregistrées.");
}

const push = tryGit(["push", "-u", "origin", branch]);
if (!push.ok) {
  console.error("L'envoi vers GitHub a échoué :\n" + push.out);
  process.exit(1);
}

console.log(`Tout est sauvegardé sur GitHub (${branch}).`);
console.log("Le téléphone verra ces changements immédiatement.");
