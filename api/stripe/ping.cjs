module.exports = async function handler(req, res) {
  res.status(200).json({
    ok: true,
    hasStripeKey: Boolean(process.env.STRIPE_SECRET_KEY),
    hasSupabaseUrl: Boolean(process.env.VITE_SUPABASE_URL),
    hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasDiscoveryPrice: Boolean(process.env.STRIPE_DISCOVERY_PRICE_ID),
  });
};
