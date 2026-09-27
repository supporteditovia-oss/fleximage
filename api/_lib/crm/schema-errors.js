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

function crmSchemaNotReadyError() {
  return Object.assign(
    new Error(
      "Base CRM non initialisée — appliquez les migrations Supabase (npm run crm:db:apply ou SQL Editor).",
    ),
    { status: 503, code: "CRM_SCHEMA_MISSING" },
  );
}

module.exports = { isCrmSchemaMissingError, crmSchemaNotReadyError };
