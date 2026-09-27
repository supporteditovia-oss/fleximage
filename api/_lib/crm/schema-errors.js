/** Erreur PostgREST / Supabase quand la table ou le schéma n'existe pas encore. */
function isCrmSchemaMissingError(err) {
  if (!err) return false;
  const code = err.code || err.error?.code;
  const msg = String(err.message || err.error?.message || err.details || "");
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    /Could not find the table/i.test(msg) ||
    /relation .* does not exist/i.test(msg)
  );
}

module.exports = { isCrmSchemaMissingError };
