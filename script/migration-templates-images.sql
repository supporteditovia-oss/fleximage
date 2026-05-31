-- Migration: Add image slot fields and output_label to prompt_templates
-- Run this in the Supabase SQL Editor

ALTER TABLE public.prompt_templates
  ADD COLUMN IF NOT EXISTS required_images INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS optional_images INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS output_label TEXT,
  ADD COLUMN IF NOT EXISTS image_labels TEXT;

-- Seed the 8 default larp templates
INSERT INTO public.prompt_templates (name, description, prompt_text, category, is_active, required_images, optional_images, output_label, image_labels)
VALUES
  ('Ticket d''amende', 'Un vrai PV de stationnement à ton nom', 'Génère une image ultra-réaliste d''un PV de stationnement officiel français posé sur un pare-brise. Le document doit comporter les logos officiels, un numéro de contravention, et un montant d''amende. Rendu photoréaliste, lumière naturelle extérieure.', 'situation', true, 1, 0, 'PV', '["ta voiture"]'),
  ('Fausse grossesse', 'Une écho ultra-réaliste pour choquer la famille', 'Génère une image ultra-réaliste d''une échographie de grossesse affichée sur un écran médical. L''image doit montrer un fœtus clairement visible avec les annotations médicales habituelles (semaines, mesures). Rendu médical professionnel.', 'humour', true, 0, 2, 'Echo', '["une écho existante","le visage de la personne"]'),
  ('Diplôme raté', 'Le relevé de notes qui fait peur', 'Génère une image ultra-réaliste d''un relevé de notes universitaire français avec des notes catastrophiques (entre 0 et 5/20 dans chaque matière). Le document doit avoir l''apparence officielle avec en-tête d''université, tampon, et mention "Ajourné".', 'humour', true, 1, 0, 'Relevé', '["le logo de ton université"]'),
  ('Rupture par SMS', 'Une capture d''écran qui fait tout péter', 'Génère une image ultra-réaliste d''une capture d''écran de conversation SMS/iMessage montrant un message de rupture brutal. L''interface doit ressembler exactement à l''app Messages d''un iPhone avec les bulles bleues et grises.', 'situation', true, 0, 1, 'SMS', '["une capture d''écran de conversation"]'),
  ('Invitation VIP', 'Soirée privée avec les stars', 'Génère une image ultra-réaliste d''une invitation VIP luxueuse pour une soirée privée exclusive. Le design doit être élégant avec dorures, typographie premium, et mentions "ACCÈS VIP", "Strictement confidentiel". Fond noir et or.', 'celebrite', true, 1, 0, 'Invite', '["ton visage"]'),
  ('Lettre de licenciement', 'Un courrier officiel très convaincant', 'Génère une image ultra-réaliste d''une lettre de licenciement officielle française sur papier à en-tête d''entreprise. Le document doit comporter la date, l''objet "Notification de licenciement", les références au Code du travail, et une signature.', 'situation', true, 1, 0, 'Lettre', '["le logo de ton entreprise"]'),
  ('Achat immobilier', 'Le compromis de vente de la villa', 'Génère une image ultra-réaliste d''un compromis de vente immobilier français pour une villa de luxe. Le document doit montrer les informations clés : prix (plusieurs millions), description du bien, signatures des parties, tampon notarial.', 'absurde', true, 0, 2, 'Contrat', '["la villa","ta signature"]'),
  ('Jackpot au loto', 'Le ticket gagnant à 2 millions', 'Génère une image ultra-réaliste d''un ticket de loterie Française des Jeux gagnant. Le ticket doit montrer les numéros cochés, la mention "GAGNANT" bien visible, et un montant de gains de 2 000 000€. Rendu photoréaliste sur une table.', 'humour', true, 1, 0, 'Ticket', '["un ticket de loto"]')
ON CONFLICT DO NOTHING;
