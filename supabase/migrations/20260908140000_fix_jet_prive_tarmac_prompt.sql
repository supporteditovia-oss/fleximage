-- Jet privé: enforce outdoor tarmac boarding (not interior staircase / cabin default).
update public.templates
set
  description = 'Embarquement VIP sur tarmac avec jet privé visible et escalier mobile.',
  prompt_text = 'Transforme la photo source en scene ultra-realiste EXTERIEURE sur tarmac d aeroport ou terminal prive VIP: ciel visible et horizon degage, sol de tarmac avec marquages de piste, cones de securite, vehicule de service eloigne, jet prive clairement visible dans la meme image (fuselage, ailes, hublots), escalier d embarquement mobile contre la porte de l avion, sujet marchant vers l avion ou montant l escalier, lumiere naturelle golden hour, valise premium, cadrage vertical 9:16, rendu photo naturel. INTERDIT ABSOLU: interieur de batiment, salle, couloir, gymnase, escalier interieur beton, cage d escalier, appartement, hotel, studio, escalier sans avion, decor abstrait, scene sans piste d aeroport.',
  updated_at = now()
where slug = 'jet-prive';
