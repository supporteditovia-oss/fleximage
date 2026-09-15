/**
 * Poses réalistes par combinaison contexte + tenue + activité + mobilier.
 * Priorité : tenue / activité / mobilier / lieu — pas le genre seul.
 */

const POSE_FORBIDDEN_GLOBAL =
  "FORBIDDEN POSES (never): rigid mannequin or catalog posture; legs spread too wide or uncomfortably open; " +
  "torso locked square-front to camera like a runway still; arms hanging with no purpose; " +
  "handbag or props placed like a fashion advertisement; unstable balance; forced glamour pin-up; " +
  "any pose where the subject looks uncomfortable, stiff, or physically implausible.";

const COMFORT_RULE =
  "COMFORT RULE (mandatory): the subject must always look comfortable, stable, natural and occupied — " +
  "weight on furniture or ground must be believable; hands must interact with seat edge, cushion, railing, glass, phone, pocket or bag strap when visible.";

/** @typedef {{ id: string, score: number, pose_direction: string, activity: string, location_context: string, furniture: string, forbidden_extra: string }} ContextPosePlan */

const SCENARIO_PATTERNS = [
  {
    id: "yacht_elegant_dress",
    score: 10,
    test: (t) =>
      /\b(yacht|yatch|boat|bateau|catamaran|deck|pont|flybridge)\b/.test(t) &&
      /\b(robe|dress|gown|longue|long dress|evening dress|soirée|elegant|élégant|designer|luxury|luxe)\b/.test(
        t,
      ),
    plan: {
      pose_direction:
        "three-quarter seated on yacht banquette OR standing naturally near railing; knees and legs oriented same side, legs close together or ankles softly crossed; long dress falls with realistic folds; one hand resting naturally on cushion, seat edge or armrest; other hand lightly holding bag strap or resting on lap/thigh; relaxed shoulders, natural back, coherent body weight; gaze toward sea, slightly off-camera or toward friend taking photo; candid lifestyle snapshot, NOT fashion campaign",
      activity: "relaxing on yacht deck",
      location_context: "luxury yacht exterior or flybridge, sea visible",
      furniture: "banquette, cushion, seat edge, railing",
      forbidden_extra:
        "wide-legged seated pose; frontal mannequin stance; bag held away from body like product shot; legs dangling unnaturally",
    },
  },
  {
    id: "yacht_elegant_general",
    score: 8,
    test: (t) =>
      /\b(yacht|yatch|boat|bateau|catamaran|deck|pont)\b/.test(t) &&
      /\b(luxe|luxury|elegant|élégant|chic|designer|soirée)\b/.test(t),
    plan: {
      pose_direction:
        "elegant natural yacht pose: seated sideways on banquette OR light lean on railing; legs same direction, physically credible; hands on cushion, railing or drink; relaxed confident posture; look toward horizon or candid off-camera",
      activity: "yacht lifestyle moment",
      location_context: "yacht deck, marina or open sea",
      furniture: "banquette, railing, deck seating",
      forbidden_extra: "runway stance; stiff catalog legs-apart pose",
    },
  },
  {
    id: "evening_restaurant",
    score: 9,
    test: (t) =>
      /\b(restaurant|dîner|diner|dining|table|verre|wine|glass|brasserie|rooftop bar|bar)\b/.test(t) &&
      /\b(soirée|evening|elegant|élégant|robe|dress|suit|costume|tux|black tie|luxe|luxury)\b/.test(t),
    plan: {
      pose_direction:
        "seated upright but relaxed at table; hands naturally on table, glass stem, menu edge or one wrist resting; subtle three-quarter angle; believable dinner conversation energy; no stiff frontal mannequin",
      activity: "dining or drinks",
      location_context: "restaurant or upscale bar interior",
      furniture: "dining chair, table, glassware",
      forbidden_extra: "standing catalog pose at table; arms frozen away from furniture",
    },
  },
  {
    id: "streetwear_city",
    score: 8,
    test: (t) =>
      /\b(street|streetwear|urbain|urban|ville|city|avenue|quartier|rap|sneaker|hoodie|jordan|nike)\b/.test(
        t,
      ),
    plan: {
      pose_direction:
        "walking mid-step OR light lean against wall/railing; hands in pockets, adjusting jacket, holding phone naturally; relaxed shoulders; credible urban attitude without caricature or cliché",
      activity: "walking or waiting in city",
      location_context: "urban street, avenue, storefront",
      furniture: "wall, railing, curb, steps",
      forbidden_extra: "luxury hotel lobby pose; runway walk exaggeration",
    },
  },
  {
    id: "sport_field",
    score: 8,
    test: (t) =>
      /\b(sport|gym|fitness|run|running|football|basket|tennis|training|workout|terrain|stadium|golf|golfe)\b/.test(
        t,
      ),
    plan: {
      pose_direction:
        "active dynamic posture matched to equipment and activity; balanced athletic stance; hands on club, ball, racket or natural mid-action freeze; never elegant seated lounge pose",
      activity: "sport or athletic activity",
      location_context: "field, court, gym or outdoor sport setting",
      furniture: "sport equipment, bench if resting",
      forbidden_extra: "formal seated cross-legged lounge pose; handbag campaign posture",
    },
  },
  {
    id: "beach_boat_resort",
    score: 8,
    test: (t) =>
      /\b(plage|beach|mer|sea|ocean|bord de mer|resort|vacances|pool|piscine|sunset)\b/.test(t) &&
      /\b(boat|bateau|yacht|deck|hamac|sunbed|transat)\b/.test(t),
    plan: {
      pose_direction:
        "casual relaxed seated on deck or sunbed; legs naturally bent or crossed; gaze toward water; one hand on seat edge or sunglasses; spontaneous vacation energy",
      activity: "beach or boat leisure",
      location_context: "coastal, beach club or boat deck",
      furniture: "sunbed, deck chair, boat seating",
      forbidden_extra: "formal evening gown stance on sand; rigid frontal pose",
    },
  },
  {
    id: "beach_casual",
    score: 6,
    test: (t) => /\b(plage|beach|mer|sea|ocean|resort|vacances|pool|piscine)\b/.test(t),
    plan: {
      pose_direction:
        "relaxed spontaneous beach posture; seated or standing with natural leg bend; look toward water or friend with camera; comfortable and unforced",
      activity: "beach leisure",
      location_context: "beach or poolside",
      furniture: "sand, lounger, towel",
      forbidden_extra: "catalog mannequin stance",
    },
  },
  {
    id: "hotel_luxury_suit",
    score: 7,
    test: (t) =>
      /\b(hôtel|hotel|palace|lobby|suite|marble|luxury|luxe|five star|5 étoiles)\b/.test(t) &&
      /\b(suit|costume|tailleur|blazer|robe|dress|elegant|élégant)\b/.test(t),
    plan: {
      pose_direction:
        "refined but natural hotel lifestyle pose: walking through lobby, light lean on concierge desk or railing, or seated in lobby armchair with legs same direction; hands on bag, phone or armrest; not a static mannequin",
      activity: "arrival or lobby moment",
      location_context: "luxury hotel interior or entrance",
      furniture: "armchair, lobby seating, railing",
      forbidden_extra: "wide-legged power pose; arms away from body",
    },
  },
];

function matchContextPosePlan(userPrompt = "", sceneContext = "") {
  const text = `${userPrompt} ${sceneContext}`.toLowerCase();
  let best = null;
  for (const scenario of SCENARIO_PATTERNS) {
    if (!scenario.test(text)) continue;
    if (!best || scenario.score > best.score) {
      best = { id: scenario.id, score: scenario.score, ...scenario.plan };
    }
  }
  return best;
}

function enrichAnalysisWithContextPose(analysis, userPrompt = "", sceneContext = "") {
  const base = { ...analysis };
  const plan = matchContextPosePlan(userPrompt, sceneContext);
  if (!plan) return base;

  base.pose_direction = plan.pose_direction;
  base.activity = plan.activity || base.activity;
  base.location_context = plan.location_context || base.location_context;
  base.furniture_context = plan.furniture;
  base.pose_scenario = plan.id;
  base.pose_forbidden = `${POSE_FORBIDDEN_GLOBAL} ${plan.forbidden_extra || ""}`.trim();
  return base;
}

function buildContextPosePromptBlock(plan) {
  if (!plan) {
    return (
      "CONTEXT POSE PRIORITY: choose pose from outfit + activity + furniture + location — NOT from apparent gender alone. " +
      `${POSE_FORBIDDEN_GLOBAL} ${COMFORT_RULE}`
    );
  }

  const forbiddenExtra = plan.forbidden_extra
    ? `Scenario forbidden: ${plan.forbidden_extra}. `
    : "";
  return (
    `CONTEXT POSE SCENARIO (${plan.id}): ` +
    `furniture/props: ${plan.furniture}. ` +
    `pose_direction: ${plan.pose_direction}. ` +
    `${POSE_FORBIDDEN_GLOBAL} ${forbiddenExtra}${COMFORT_RULE}`
  );
}

module.exports = {
  POSE_FORBIDDEN_GLOBAL,
  COMFORT_RULE,
  matchContextPosePlan,
  enrichAnalysisWithContextPose,
  buildContextPosePromptBlock,
};
