with seed_templates (
  category_slug,
  slug,
  name,
  description,
  prompt_text,
  keywords,
  icon,
  display_order,
  is_featured
) as (
  values
    (
      'luxury-lifestyle',
      'shopping-luxe-full-black',
      'Shopping luxe full black',
      'Scene de sortie shopping premium, sacs visibles et tenue noire.',
      'Transforme la photo source en scene ultra-realiste de sortie shopping luxe, avec plusieurs sacs premium, tenue full black, lumiere urbaine elegante, cadrage vertical 9:16, rendu photo naturel, sans texte illisible.',
      array['shopping','luxury','full black','boutique','sacs']::text[],
      'ShoppingBag',
      10,
      true
    ),
    (
      'supercars',
      'supercar-monaco',
      'Supercar a Monaco',
      'Portrait lifestyle au volant ou pres d une supercar.',
      'Transforme la photo source en image ultra-realiste devant une supercar de luxe a Monaco, ambiance casino, carrosserie brillante, tenue premium, lumiere naturelle, cadrage vertical 9:16, rendu photo haut de gamme.',
      array['supercar','monaco','voiture','casino','luxe']::text[],
      'Car',
      20,
      true
    ),
    (
      'luxury-lifestyle',
      'restaurant-luxe',
      'Restaurant luxe',
      'Diner premium avec table elegante et details lifestyle.',
      'Transforme la photo source en scene de diner dans un restaurant de luxe, table elegante, lumiere chaude, tenue soignee, details premium discrets, rendu ultra-realiste, cadrage vertical 9:16.',
      array['restaurant','diner','luxe','premium','lifestyle']::text[],
      'UtensilsCrossed',
      30,
      true
    ),
    (
      'travel-tourism',
      'hotel-monaco',
      'Hotel iconique',
      'Photo devant un grand hotel de destination premium.',
      'Transforme la photo source en portrait realiste devant un hotel de luxe a Monaco, architecture elegante, ambiance quiet luxury, lumiere de fin d apres-midi, cadrage vertical 9:16, rendu naturel.',
      array['hotel','monaco','travel','quiet luxury','destination']::text[],
      'Landmark',
      40,
      true
    ),
    (
      'travel-tourism',
      'jet-prive',
      'Jet prive',
      'Scene embarquement VIP avec avion prive.',
      'Transforme la photo source en scene ultra-realiste d embarquement dans un jet prive, ambiance VIP, tarmac propre, lumiere golden hour, valise premium, cadrage vertical 9:16, rendu photo naturel.',
      array['jet','voyage','vip','avion','dubai']::text[],
      'Plane',
      50,
      true
    ),
    (
      'business-hustle',
      'dashboard-revenus',
      'Dashboard revenus',
      'Ecran laptop avec dashboard business impressionnant.',
      'Cree une image ultra-realiste montrant la personne avec un laptop ouvert sur un dashboard de revenus impressionnant, interface moderne mais non marquee, ambiance bureau premium, lumiere naturelle, cadrage vertical 9:16.',
      array['dashboard','revenus','business','laptop','hustle']::text[],
      'BarChart3',
      60,
      true
    ),
    (
      'luxury-lifestyle',
      'montre-premium',
      'Montre premium',
      'Gros plan lifestyle avec montre et accessoires premium.',
      'Transforme la photo source en scene lifestyle realiste avec une montre premium au poignet, accessoires de luxe discrets, tenue elegante, profondeur de champ photo, cadrage vertical 9:16.',
      array['montre','watch','luxe','accessoires','premium']::text[],
      'Trophy',
      70,
      true
    ),
    (
      'social-proof',
      'table-vip',
      'Table VIP',
      'Ambiance nightlife premium et table reservee.',
      'Transforme la photo source en scene de table VIP dans un club elegant, bouteilles lumineuses, ambiance festive premium, groupe floute en arriere-plan, rendu ultra-realiste, cadrage vertical 9:16.',
      array['vip','nightlife','club','social','party']::text[],
      'Sparkles',
      80,
      true
    )
)
insert into public.templates (
  category_id,
  slug,
  name,
  description,
  prompt_text,
  generation_type,
  input_schema,
  keywords,
  icon,
  display_order,
  is_featured,
  is_active
)
select
  c.id,
  s.slug,
  s.name,
  s.description,
  s.prompt_text,
  'image',
  jsonb_build_object(
    'image_slots',
    jsonb_build_array(
      jsonb_build_object('label', 'Photo source', 'required', false)
    ),
    'text_fields',
    jsonb_build_array()
  ),
  s.keywords,
  s.icon,
  s.display_order,
  s.is_featured,
  true
from seed_templates s
left join public.template_categories c on c.slug = s.category_slug
on conflict (slug) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  prompt_text = excluded.prompt_text,
  generation_type = excluded.generation_type,
  input_schema = excluded.input_schema,
  keywords = excluded.keywords,
  icon = excluded.icon,
  display_order = excluded.display_order,
  is_featured = excluded.is_featured,
  is_active = excluded.is_active,
  updated_at = now();
