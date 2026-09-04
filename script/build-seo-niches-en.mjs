/**
 * Builds shared/seo-niches-en.json from the French catalog + English copy overrides.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FR_PATH = path.join(ROOT, "shared", "seo-niches.json");
const EN_PATH = path.join(ROOT, "shared", "seo-niches-en.json");

const fr = JSON.parse(fs.readFileSync(FR_PATH, "utf8"));

const categoryCopy = {
  generation: {
    label: "AI image generation",
    description:
      "TikTok and Google searches around AI image generation — from Dimash Lux to lifestyle flex.",
  },
  vehicules: {
    label: "Luxury vehicles",
    description: "Sports cars, private jets and yachts — flex in one click.",
  },
  voyages: {
    label: "Travel & places",
    description:
      "Dubai, Michelin-star restaurants and ultra-realistic palace suites.",
  },
  pranks: {
    label: "Pranks & social",
    description: "Fake girlfriend, celebrities, VIP parties and TV appearances.",
  },
  lifestyle: {
    label: "Lifestyle & flex",
    description: "Luxury shopping, watches, Rolex, glow-up and cash flex.",
  },
};

/** English text overrides keyed by niche slug (same slugs as FR). */
const nicheCopy = {
  "generation-image-ia": {
    h1: "Realistic AI image generation with LuxeFlexIA",
    metaTitle: "Realistic AI Image Generation — LuxeFlexIA",
    metaDescription:
      "Generate an ultra-realistic AI image from your photo with LuxeFlexIA. AI image tool for flex, lifestyle, pranks and social media.",
    heroSubtitle:
      "Upload a photo, describe the scene — LuxeFlexIA generates a believable AI image in seconds.",
    intro:
      "Looking for AI image generation that actually looks like you? LuxeFlexIA turns your selfie into a premium lifestyle photo: luxury car, restaurant, watch, travel, VIP night out. Perfect if you search “AI image generation”, “generate AI photo” or “realistic AI photo” on Google or TikTok.",
    bullets: [
      "Your face stays recognizable in the generated scene",
      "Formats suited to stories and TikTok (9:16 portrait)",
      "Luxury, travel, prank and lifestyle scenes in one tool",
      "Share-ready results without complicated software",
    ],
    promptIdeas: [
      "Me in a fine-dining restaurant, warm light, elegant outfit, ultra realistic",
      "Me driving a sports car in Monaco at night, lifestyle photo",
      "Me with a luxury watch on my wrist, wrist + face framing, premium detail",
    ],
    faqs: [
      {
        question: "How do I generate an AI image with my photo?",
        answer:
          "Create a LuxeFlexIA account, upload a clear photo of yourself, describe the scene you want, then start generation. The AI produces a realistic image in seconds.",
      },
      {
        question: "Is LuxeFlexIA good for TikTok “AI image generation” searches?",
        answer:
          "Yes. Many users look for exactly this after seeing flex, Dimash Lux or prank videos on TikTok. LuxeFlexIA is built for those scenes.",
      },
    ],
    searchPhrases: [
      "AI image generation",
      "generate AI photo",
      "realistic AI photo",
      "AI image creation",
    ],
  },
  "generation-dimash-lux": {
    h1: "Dimash Lux generation: TikTok-style AI flex photos",
    metaTitle: "Dimash Lux AI Generation — LuxeFlexIA",
    metaDescription:
      "Create a Dimash Lux generation with LuxeFlexIA: ultra-realistic luxury flex AI photos, TikTok style. Upload your photo and build your Dimash Lux scene.",
    heroSubtitle:
      "Dimash Lux style in one click: premium flex, realistic render, TikTok-ready.",
    intro:
      "“Dimash Lux generation” is one of the top searches after TikTok AI flex videos. LuxeFlexIA lets you create that look: you in a luxury scene (car, watch, restaurant, jet) with a believable render. No random tool hunting — start here.",
    bullets: [
      "Dimash Lux scenes: car, watch, jet, restaurant, palace",
      "Face preserved for a credible flex",
      "Perfect for TikTok and Instagram stories",
      "Simple workflow: photo + prompt + generate",
    ],
    promptIdeas: [
      "Dimash Lux style: me in front of a black supercar at night, neon lights, ultra realistic",
      "Dimash Lux: me at a VIP restaurant table, champagne, golden light",
      "Dimash Lux: me in a private jet, leather cabin, window view",
    ],
    faqs: [
      {
        question: "What is a Dimash Lux generation?",
        answer:
          "An AI photo in a luxury flex style popularized on TikTok: supercars, watches, travel, VIP restaurants. LuxeFlexIA produces these scenes from your photo.",
      },
      {
        question: "Can I do Dimash Lux without writing a prompt?",
        answer:
          "Yes. Pick an idea (car, watch, restaurant…) or paste one of the examples on this page. LuxeFlexIA handles the render.",
      },
    ],
    searchPhrases: [
      "dimash lux generation",
      "dimash lux",
      "dimash lux AI",
      "dimash generation",
    ],
  },
  "generation-dimash-prank": {
    h1: "Dimash Prank generation: fool your friends with AI",
    metaTitle: "Dimash Prank AI Generation — LuxeFlexIA",
    metaDescription:
      "Create a hyper-realistic Dimash Prank with LuxeFlexIA. TikTok-style flex prank AI: fake wealth, fake party, fake date — for laughs with people you know.",
    heroSubtitle:
      "The ultimate Dimash Prank: an AI photo so real your friends believe it.",
    intro:
      "Saw a Dimash Prank on TikTok and want the same effect? LuxeFlexIA generates convincing prank photos: fake VIP night, fake luxury car, fake vacation. Use them to laugh with friends — not to scam anyone.",
    bullets: [
      "Dimash pranks ready for TikTok and Snap",
      "Realistic render for maximum reactions",
      "Flex, couple, VIP and travel scenes",
      "Entertainment use only",
    ],
    promptIdeas: [
      "Dimash prank: me in a VIP club with reserved table, flash, cash vibe",
      "Dimash prank: me leaving a yacht in Monaco, sun, selfie",
      "Dimash prank: me with luxury shopping bags, premium street",
    ],
    faqs: [
      {
        question: "How do I make a Dimash Prank generation?",
        answer:
          "Upload your photo on LuxeFlexIA, pick a flex scene (VIP, car, yacht…) and generate. Send the result to friends for the prank.",
      },
      {
        question: "Is Dimash Prank legal / OK to post?",
        answer:
          "Yes for entertainment and pranks between consenting adults. Avoid impersonating real people or deceiving for money.",
      },
    ],
    searchPhrases: [
      "dimash prank generation",
      "dimash prank",
      "dimash prank AI",
      "flex prank AI",
    ],
  },
  "generation-watch-lux": {
    h1: "Watch Lux generation: luxury watch on your wrist by AI",
    metaTitle: "Watch Lux / Luxury Watch AI Generation — LuxeFlexIA",
    metaDescription:
      "Watch Lux generation with LuxeFlexIA: add a realistic luxury watch to your wrist. Ideal for “watch lux generation”, Rolex flex and TikTok content.",
    heroSubtitle:
      "Watch Lux in AI: shiny dial, wrist detail, credible horology flex.",
    intro:
      "Searches for “watch lux generation” and “luxury watch generation” are exploding on Google and TikTok. LuxeFlexIA places a prestige watch on your wrist while keeping your identity. Perfect for a subtle flex or a prank between friends.",
    bullets: [
      "Targets Watch Lux / luxury watch / Rolex flex",
      "Ultra-sharp wrist detail",
      "Vertical story compatible",
      "Pairs with luxury shopping or restaurant scenes",
    ],
    promptIdeas: [
      "Watch Lux: close-up wrist with luxury watch, me visible in background, natural light",
      "Me arms crossed, prestige watch, dark suit, ultra realistic",
      "Casual selfie with visible luxury watch, premium café terrace",
    ],
    faqs: [
      {
        question: "What’s the difference between Watch Lux and luxury watch?",
        answer:
          "Same intent: an AI photo with a prestige watch. “Watch Lux” is the TikTok English wording; LuxeFlexIA covers both.",
      },
      {
        question: "Can I do a Rolex / premium watch generation?",
        answer:
          "Yes — describe the watch style you want in the prompt. LuxeFlexIA generates a realistic lifestyle render.",
      },
    ],
    searchPhrases: [
      "watch lux generation",
      "watch lux",
      "luxury watch generation",
      "Rolex watch AI photo",
    ],
  },
  "generation-fille-ia": {
    h1: "AI girl image generation: portrait & fashion lifestyle",
    metaTitle: "AI Girl Image / Portrait Generation — LuxeFlexIA",
    metaDescription:
      "Realistic AI girl image generation with LuxeFlexIA: lifestyle portraits, fashion, restaurant or travel outings. Upload a photo and create a premium scene.",
    heroSubtitle:
      "Female portrait and lifestyle AI: fashion, nights out, travel — polished and realistic.",
    intro:
      "Many search “AI girl image generation” for lifestyle portraits, fashion looks or night-out scenes. LuxeFlexIA generates realistic photos from a real picture: elegant outfit, restaurant, travel, shopping. Lifestyle content only — no explicit material.",
    bullets: [
      "Realistic lifestyle and fashion portraits",
      "Restaurant, travel, shopping, party scenes",
      "Identity preserved from the source photo",
      "Responsible use, SFW content only",
    ],
    promptIdeas: [
      "Lifestyle portrait, elegant dress, chic restaurant, soft light, ultra realistic",
      "Luxury street fashion look, shopping bags, sunny day",
      "Dubai travel selfie, premium outfit, skyline background",
    ],
    faqs: [
      {
        question: "Can I generate an AI image of a girl from my photo?",
        answer:
          "Yes if you upload a photo of yourself (or one you have rights to). LuxeFlexIA creates a realistic portrait / lifestyle scene.",
      },
      {
        question: "Is it suited to TikTok “AI girl generation” searches?",
        answer: "Yes for lifestyle, fashion and flex. Explicit content is refused.",
      },
    ],
    searchPhrases: [
      "AI girl image generation",
      "AI girl generation",
      "AI girl lifestyle photo",
      "AI fashion portrait",
    ],
  },
  "generation-restaurant": {
    h1: "Restaurant generation: AI photo in a fine-dining restaurant",
    metaTitle: "Restaurant Photo AI Generation — LuxeFlexIA",
    metaDescription:
      "Restaurant generation with LuxeFlexIA: create an AI photo of you in a Michelin-star restaurant. Ideal for lifestyle flex, storytelling and “restaurant generation” searches.",
    heroSubtitle:
      "Set table, warm light, gastronomic vibe — your dinner out in AI.",
    intro:
      "Want a convincing restaurant generation? LuxeFlexIA places you in a fine-dining or VIP table scene. Perfect if you search “restaurant generation”, “AI restaurant photo” or a lifestyle dinner flex.",
    bullets: [
      "Michelin-star / VIP restaurant vibe",
      "Great for food & lifestyle stories",
      "Pairs with luxury watch or shopping",
      "Credible photo for pranks between friends",
    ],
    promptIdeas: [
      "Me at a fine-dining table, signature dish, warm light",
      "VIP dinner, champagne, elegant outfit, lifestyle photo",
      "Palace brunch, terrace, natural light, ultra realistic",
    ],
    faqs: [
      {
        question: "How do I make a restaurant AI generation?",
        answer:
          "Upload your photo, mention fine-dining / VIP table in the prompt, generate with LuxeFlexIA.",
      },
      {
        question: "Does it work for a “fake Michelin restaurant” prank?",
        answer:
          "Yes — many use it to surprise friends. Keep it in the entertainment frame.",
      },
    ],
    searchPhrases: [
      "restaurant generation",
      "AI restaurant photo",
      "luxury restaurant generation",
      "fake restaurant photo",
    ],
  },
  "photo-ia-realiste": {
    h1: "Realistic AI photo from your selfie",
    metaTitle: "Realistic AI Photo (Selfie → Scene) — LuxeFlexIA",
    metaDescription:
      "Create a realistic AI photo with LuxeFlexIA. Turn your selfie into a luxury, travel or prank scene. AI photo generator built for a credible look.",
    heroSubtitle:
      "Rule #1: it must look real. LuxeFlexIA targets lifestyle realism.",
    intro:
      "If your criterion is “realistic AI photo”, you’re in the right place. LuxeFlexIA is built for credible scenes — not cartoon illustrations. Upload a sharp selfie and describe the scene.",
    bullets: [
      "Photo realism first",
      "Luxury, travel, social, lifestyle scenes",
      "Mobile-friendly workflow",
      "Results suited to TikTok / Instagram",
    ],
    promptIdeas: [
      "Ultra realistic photo of me in a palace suite, natural light",
      "Realistic selfie in a private jet, premium cabin",
      "Realistic portrait VIP night, light bokeh",
    ],
    faqs: [
      {
        question: "Why isn’t my AI photo realistic enough?",
        answer:
          "Use a clear, front-facing source photo with good light. Avoid blurry or heavily filtered selfies. Describe the scene precisely.",
      },
      {
        question: "Does LuxeFlexIA do illustration or real photo?",
        answer:
          "The goal is a realistic lifestyle photo render, not a cartoon style.",
      },
    ],
    searchPhrases: [
      "realistic AI photo",
      "realistic AI image",
      "realistic photo generator",
      "selfie to AI photo",
    ],
  },
  "generer-photo-ia": {
    h1: "Generate an AI photo in seconds",
    metaTitle: "Generate an AI Photo — LuxeFlexIA",
    metaDescription:
      "Generate an AI photo easily with LuxeFlexIA: upload, describe, generate. Simple tool for flex, prank and lifestyle on TikTok.",
    heroSubtitle: "No expertise needed: 3 steps to generate your AI photo.",
    intro:
      "“Generate AI photo” is a clear intent: you want a result now. LuxeFlexIA reduces friction — account, photo, prompt, generate. Then share on TikTok, Snap or Instagram.",
    bullets: [
      "Simple mobile flow",
      "Ready-to-paste prompt ideas",
      "Popular TikTok scenes built in",
      "Thematic generator directory",
    ],
    promptIdeas: [
      "Generate a photo of me in a sports car, Monaco, night",
      "Generate a photo of me luxury shopping, premium bags",
      "Generate a photo of me in a villa with pool, sunset",
    ],
    faqs: [
      {
        question: "How long to generate an AI photo?",
        answer:
          "Usually a few seconds after sending the photo and prompt.",
      },
      {
        question: "Do I need a PC?",
        answer:
          "No. LuxeFlexIA works on your phone — where most TikTok searches start.",
      },
    ],
    searchPhrases: [
      "generate AI photo",
      "generate AI image",
      "create AI photo",
      "AI photo generation tool",
    ],
  },
  "generation-luxe-flex": {
    h1: "Luxury flex generation: simulate a premium life in AI",
    metaTitle: "Luxury Flex AI Generation — LuxeFlexIA",
    metaDescription:
      "Luxury flex generation with LuxeFlexIA: supercars, watches, jets, restaurants, shopping. Create your TikTok-style AI flex.",
    heroSubtitle:
      "All the luxury flex in one generator: car, watch, jet, restaurant, palace.",
    intro:
      "“Luxury flex” is the heart of LuxeFlexIA. Whether you search luxury generation, AI flex or premium lifestyle, you can chain scenes and publish content that matches TikTok trends.",
    bullets: [
      "Ready-made flex scene catalog",
      "Face consistency from scene to scene",
      "Perfect for TikTok flex series",
      "Links to Dimash Lux, Watch Lux, restaurant…",
    ],
    promptIdeas: [
      "Full luxury flex: me + supercar + watch + Monaco sunset",
      "Premium lifestyle: shopping + restaurant same evening",
      "Travel flex: private jet then Dubai villa",
    ],
    faqs: [
      {
        question: "What is a luxury flex generation?",
        answer:
          "An AI image showing you in a premium setting (wealth, travel, fashion) for social content or a prank.",
      },
      {
        question: "Where should I start?",
        answer:
          "Try Dimash Lux, Watch Lux or Sports Car — they’re the most requested scenes.",
      },
    ],
    searchPhrases: [
      "luxury flex generation",
      "AI flex",
      "luxury generation",
      "TikTok flex photo",
    ],
  },
  "prank-ia-tiktok": {
    h1: "TikTok AI prank: photos that fool your friends",
    metaTitle: "TikTok AI Prank — Convincing Photos | LuxeFlexIA",
    metaDescription:
      "Create a TikTok AI prank with LuxeFlexIA: fake wealth, fake girlfriend, fake trip. Realistic prank generations ready to post.",
    heroSubtitle:
      "The TikTok prank that works: an AI photo too real to ignore.",
    intro:
      "AI pranks dominate TikTok. LuxeFlexIA gives you scenes that work: Dimash Prank, fake girlfriend, VIP party, TV appearance. Generate, send, film the reaction.",
    bullets: [
      "TikTok-proven prank scenes",
      "Realistic render = better reactions",
      "Mobile-first",
      "Fun between people you know only",
    ],
    promptIdeas: [
      "TikTok prank: me on red carpet, paparazzi, flash",
      "Prank: me at fake VIP club table",
      "Prank: me on Dubai villa pool vacation",
    ],
    faqs: [
      {
        question: "Which AI prank works best on TikTok?",
        answer:
          "Dimash Lux / Dimash Prank, fake wealth (car, watch) and fake travel are among the most viral.",
      },
      {
        question: "Can I post the prank publicly?",
        answer:
          "Yes if presented as entertainment. Respect the privacy of people you film.",
      },
    ],
    searchPhrases: [
      "TikTok AI prank",
      "AI prank generation",
      "AI prank photo",
      "flex prank TikTok",
    ],
  },
  "voiture-luxe": {
    h1: "Sports car photo generator with LuxeFlexIA",
    metaTitle: "AI Sports Car Photo Generator — LuxeFlexIA",
    metaDescription:
      "Create a fake hyper-realistic photo of you driving a sports car with LuxeFlexIA. Upload a photo and generate your car flex in seconds.",
    heroSubtitle:
      "Get behind the wheel of a supercar in AI: realistic, premium, share-ready.",
    intro:
      "Luxury car / supercar generation is a TikTok flex classic. LuxeFlexIA places you driving or next to an ultra-realistic sports car — perfect for Dimash Lux auto or a friends prank.",
    bullets: [
      "Supercar, sport car, night drive",
      "Compatible with Dimash Lux generation",
      "Photo render for vertical stories",
      "Great combo with wrist watch",
    ],
    promptIdeas: [
      "Me driving a black sports car, Monaco, night, neon",
      "Me leaning on a red supercar, sunset, premium outfit",
      "Leather interior selfie, sport steering wheel, city lights",
    ],
    faqs: [
      {
        question: "Can I choose the car model?",
        answer:
          "Describe the style (matte black, red, convertible…). LuxeFlexIA generates a coherent lifestyle scene.",
      },
      {
        question: "Works for a “I got a new car” prank?",
        answer:
          "Yes — very common use. Then reveal it was a prank.",
      },
    ],
    searchPhrases: [
      "luxury car generation",
      "AI supercar photo",
      "fake sports car photo",
      "car flex generation",
    ],
  },
  "jet-prive": {
    h1: "Fake private jet photo generated by AI",
    metaTitle: "Fake Private Jet Photo by AI — LuxeFlexIA",
    metaDescription:
      "Generate an ultra-realistic photo of you in a private jet with LuxeFlexIA. Perfect AI tool for travel flex or a prank between friends.",
    heroSubtitle:
      "Settle into a private cabin: premium light, VIP vibe, stunning render.",
    intro:
      "Private jet generation is a flex search hit. With LuxeFlexIA, create a credible VIP cabin photo for TikTok, Snap or Dimash Lux travel.",
    bullets: [
      "Leather cabin, window, champagne",
      "Perfect for travel prank",
      "Combo with Dubai / yacht",
      "Realistic mobile render",
    ],
    promptIdeas: [
      "Me in a private jet, beige cabin, window, soft light",
      "Private jet selfie with champagne, elegant outfit",
      "Sitting facing camera in private jet, night vibe",
    ],
    faqs: [
      {
        question: "How do I make a fake private jet photo?",
        answer:
          "Upload your photo on LuxeFlexIA and ask for a private jet / VIP cabin scene.",
      },
      {
        question: "Good for Dimash Lux travel?",
        answer: "Yes — private jet + villa or Dubai is a very popular combo.",
      },
    ],
    searchPhrases: [
      "private jet generation",
      "fake private jet photo",
      "private jet AI",
      "private plane flex",
    ],
  },
  "yacht-monaco": {
    h1: "Luxury yacht photo in Monaco by AI",
    metaTitle: "Monaco Luxury Yacht AI Photo — LuxeFlexIA",
    metaDescription:
      "Create a fake photo of you on a luxury yacht in Monaco with LuxeFlexIA. AI generator for lifestyle, flex and credible pranks.",
    heroSubtitle:
      "Sunny deck, Mediterranean horizon — your yacht scene ready instantly.",
    intro:
      "Monaco + yacht = the ultimate flex scene. LuxeFlexIA generates your luxury yacht photo for TikTok content or a Dimash prank.",
    bullets: [
      "Monaco / Mediterranean vibe",
      "Yacht deck, sun, sea",
      "Credible premium lifestyle",
      "Prank and flex compatible",
    ],
    promptIdeas: [
      "Me on a yacht deck in Monaco, sun, sea horizon",
      "Luxury yacht selfie, champagne, sunny day",
      "White yacht lifestyle photo, Monaco, premium summer outfit",
    ],
    faqs: [
      {
        question: "Can I do yacht without being in Monaco?",
        answer:
          "Yes — that’s the point of AI generation. Describe Monaco or a luxury marina.",
      },
      {
        question: "Viral combo idea?",
        answer:
          "Monaco yacht then Watch Lux close-up for a TikTok series.",
      },
    ],
    searchPhrases: [
      "Monaco yacht generation",
      "luxury yacht AI photo",
      "yacht flex",
      "fake Monaco photo",
    ],
  },
  "vacances-dubai": {
    h1: "Fake Dubai trip generated by artificial intelligence",
    metaTitle: "Fake Dubai Trip by AI — LuxeFlexIA",
    metaDescription:
      "Simulate a Dubai vacation with hyper-realistic AI photos via LuxeFlexIA. Create your travel alibi or a convincing prank in a few clicks.",
    heroSubtitle:
      "Skyline, desert or pool villa — invent your Dubai getaway in AI.",
    intro:
      "“Dubai generation” and fake AI travel are highly searched. LuxeFlexIA creates realistic Dubai vacation photos for flex or prank.",
    bullets: [
      "Skyline, desert, pool villa",
      "Perfect “I’m in Dubai” prank",
      "Private jet + villa combo",
      "Vertical stories ready",
    ],
    promptIdeas: [
      "Me in front of Dubai skyline at sunset, premium outfit",
      "Dubai villa pool selfie, sunny day",
      "Dubai desert, luxury 4x4, chic safari outfit",
    ],
    faqs: [
      {
        question: "How do I simulate a Dubai trip in AI?",
        answer:
          "Upload your photo and ask for Dubai skyline, villa or desert. LuxeFlexIA generates the scene.",
      },
      {
        question: "Works for a TikTok travel series?",
        answer: "Yes: chain private jet, Dubai, restaurant, yacht.",
      },
    ],
    searchPhrases: [
      "Dubai generation",
      "fake Dubai trip AI",
      "Dubai AI photo",
      "Dubai vacation prank",
    ],
  },
  "restaurant-etoile": {
    h1: "Fine-dining restaurant photo generated by AI",
    metaTitle: "Fine-Dining Restaurant AI Photo — LuxeFlexIA",
    metaDescription:
      "Generate a fake photo of you in a Michelin-star restaurant with LuxeFlexIA. Ideal for lifestyle flex, social storytelling or pranks.",
    heroSubtitle:
      "Set table, signature plates, ultra-credible gastronomic atmosphere.",
    intro:
      "Michelin-star restaurant, VIP table, fine dinner: LuxeFlexIA covers “restaurant generation” and AI restaurant photo with a premium lifestyle render.",
    bullets: [
      "Credible gastronomic vibe",
      "Lifestyle dinner flex",
      "Prank “I was at a star restaurant”",
      "Linked to restaurant generation",
    ],
    promptIdeas: [
      "Fine-dining restaurant, elegant table, warm light, me in smart outfit",
      "VIP table, champagne, signature dish",
      "Rooftop restaurant, skyline, evening",
    ],
    faqs: [
      {
        question: "Difference vs Restaurant generation page?",
        answer:
          "Same product intent. This page also targets “Michelin / fine-dining”; the other targets “restaurant generation”.",
      },
      {
        question: "Can I add a watch in the scene?",
        answer: "Yes — mention Watch Lux / wrist watch in the prompt.",
      },
    ],
    searchPhrases: [
      "fine dining AI photo",
      "Michelin restaurant photo",
      "luxury restaurant generation",
      "VIP dinner AI",
    ],
  },
  "suite-palace": {
    h1: "Fake luxury suite photo by AI",
    metaTitle: "Fake Luxury Suite AI Photo — LuxeFlexIA",
    metaDescription:
      "Create a hyper-realistic photo of you in a palace suite with LuxeFlexIA. AI generator for luxury hotel decor, flex and social content.",
    heroSubtitle:
      "Sea-view suite, marble and soft light — the palace version in AI.",
    intro:
      "Palace suite, 5-star hotel, premium villa: a travel flex classic. LuxeFlexIA places your face in a credible palace setting.",
    bullets: [
      "Suite, palace, premium villa",
      "Dubai / Monaco travel combo",
      "Great for hotel flex stories",
      "Realistic photo render",
    ],
    promptIdeas: [
      "Me in a palace suite, sea view, soft light",
      "Luxury hotel room, robe, breakfast",
      "Premium villa living room, pool through window",
    ],
    faqs: [
      {
        question: "Villa instead of suite?",
        answer: "Yes — specify pool villa or palace suite in the prompt.",
      },
      {
        question: "TikTok series idea?",
        answer: "Palace suite → restaurant → Watch Lux in a video chain.",
      },
    ],
    searchPhrases: [
      "palace suite generation",
      "luxury hotel AI photo",
      "fake suite photo",
      "premium villa AI",
    ],
  },
  "prank-fausse-copine": {
    h1: "Fake girlfriend / fake date generator (prank) with LuxeFlexIA",
    metaTitle: "Fake Girlfriend / Fake Date Prank Generator — LuxeFlexIA",
    metaDescription:
      "Create a fake couple or date photo for a prank with LuxeFlexIA. Hyper-realistic fake girlfriend / fake date AI generator — for laughs with people you know.",
    heroSubtitle:
      "The ultimate social prank: a convincing date photo, generated in seconds.",
    intro:
      "Fake girlfriend / fake date pranks stay viral. LuxeFlexIA generates a realistic couple lifestyle scene to surprise friends — entertainment only, no malicious deepfakes.",
    bullets: [
      "Couple / date lifestyle prank",
      "Realistic render for max reactions",
      "Fun between adults",
      "TikTok AI prank compatible",
    ],
    promptIdeas: [
      "Date photo chic restaurant, couple vibe, warm light",
      "Duo selfie premium café terrace",
      "Movie night, casual elegant look, couple selfie",
    ],
    faqs: [
      {
        question: "Can I use someone else’s photo?",
        answer:
          "Only with consent. Do not create non-consensual deepfakes.",
      },
      {
        question: "Linked to Dimash Prank?",
        answer:
          "Yes — many combine Dimash wealth prank with social / couple pranks.",
      },
    ],
    searchPhrases: [
      "fake girlfriend generation",
      "fake date AI prank",
      "AI couple prank photo",
      "fake girlfriend generator",
    ],
  },
  "prank-rencontre-star": {
    h1: "Fake celebrity photo generated by AI",
    metaTitle: "Fake Celebrity Photo AI — LuxeFlexIA",
    metaDescription:
      "Generate a fake meet-a-star photo with LuxeFlexIA. Realistic AI prank to surprise friends on social media.",
    heroSubtitle:
      "VIP selfie with a celebrity: the prank that gets attention.",
    intro:
      "Celebrity meet prank: a TikTok classic. LuxeFlexIA creates a credible VIP scene around your photo for a wow effect.",
    bullets: [
      "Red carpet / backstage vibe",
      "Viral TikTok prank",
      "VIP party combo",
      "Responsible entertainment",
    ],
    promptIdeas: [
      "Me backstage celebrity vibe, paparazzi flash",
      "Red carpet selfie, elegant outfit, event lights",
      "VIP after-party photo, bokeh, star atmosphere",
    ],
    faqs: [
      {
        question: "Can I name a real celebrity?",
        answer:
          "Prefer a “celebrity style / red carpet” vibe for responsible prank use.",
      },
      {
        question: "Works on mobile?",
        answer: "Yes — LuxeFlexIA is built for mobile TikTok.",
      },
    ],
    searchPhrases: [
      "fake celebrity photo",
      "meet a star AI prank",
      "celebrity photo generation",
      "VIP selfie AI",
    ],
  },
  "prank-soiree-vip": {
    h1: "Insert yourself into a VIP party with AI",
    metaTitle: "VIP Party AI Photo Prank — LuxeFlexIA",
    metaDescription:
      "Create an ultra-realistic fake VIP party photo with LuxeFlexIA. Place yourself in a club, red carpet or after-party vibe in one click.",
    heroSubtitle:
      "Lights, velvet rope, champagne — your VIP entrance generated by AI.",
    intro:
      "VIP party, club, after-party: ideal generation for Dimash Prank or social flex. LuxeFlexIA places your face in a cash atmosphere.",
    bullets: [
      "VIP club / after-party",
      "Flash, velvet rope, champagne",
      "TikTok prank ready",
      "Watch Lux combo possible",
    ],
    promptIdeas: [
      "Me in VIP club, reserved table, purple and gold lights",
      "Velvet rope entrance, black outfit, flash",
      "Rooftop after-party, skyline, champagne",
    ],
    faqs: [
      {
        question: "Best for what content?",
        answer: "Dimash prank, lifestyle flex, “I was in VIP” stories.",
      },
      {
        question: "Can I chain several scenes?",
        answer: "Yes: VIP → restaurant → car for a full story.",
      },
    ],
    searchPhrases: [
      "VIP party generation",
      "VIP club AI photo",
      "after-party prank",
      "club flex AI",
    ],
  },
  "prank-tv": {
    h1: "Fake TV appearance generated by AI",
    metaTitle: "Fake TV Appearance AI — LuxeFlexIA",
    metaDescription:
      "Simulate a fake TV appearance with a hyper-realistic AI photo via LuxeFlexIA. Perfect for a prank, meme or credible social storytelling.",
    heroSubtitle:
      "TV set, cameras, studio light — your media moment in AI.",
    intro:
      "Fake TV / talk-show appearance: an AI prank with strong reactions. LuxeFlexIA generates studio atmosphere around your photo.",
    bullets: [
      "TV set / studio",
      "Meme prank ready",
      "Realistic studio lighting",
      "Stories and TikTok",
    ],
    promptIdeas: [
      "Me on a TV set, cameras, studio light",
      "TV interview, blurred background, mic, smart outfit",
      "Lifestyle TV show, premium decor",
    ],
    faqs: [
      {
        question: "Works for a meme?",
        answer:
          "Yes — fake TV appearances are often used in memes or story pranks.",
      },
      {
        question: "Need a long prompt?",
        answer: "No — “TV set, cameras, studio light” is often enough.",
      },
    ],
    searchPhrases: [
      "fake TV appearance AI",
      "TV set generation",
      "television prank AI",
      "TV studio photo",
    ],
  },
  "shopping-luxe": {
    h1: "Luxury shopping bags (Rolex, Vuitton) photo by AI",
    metaTitle: "Luxury Shopping AI Photo (Vuitton, Rolex) — LuxeFlexIA",
    metaDescription:
      "Generate a luxury shopping photo with premium bags and accessories via LuxeFlexIA. Realistic AI flex for social and lifestyle pranks.",
    heroSubtitle:
      "Iconic bags, prestige storefront — shopping flex in AI version.",
    intro:
      "Luxury shopping, prestige bags, full black look: a highly requested lifestyle generation. Combine with Watch Lux for a full TikTok flex.",
    bullets: [
      "Bags / premium shopping",
      "Rolex / watch combo",
      "Realistic luxury street",
      "Prank and flex",
    ],
    promptIdeas: [
      "Me with luxury shopping bags, premium street, sunny day",
      "All-black shopping, prestige storefront, selfie",
      "Boutique outing, bags + watch on wrist",
    ],
    faqs: [
      {
        question: "Can I aim for iconic Vuitton / shopping style?",
        answer:
          "Describe the prestige shopping style you want. LuxeFlexIA generates a coherent lifestyle scene.",
      },
      {
        question: "Link to Watch Lux generation?",
        answer: "Yes — shopping + watch is a viral duo.",
      },
    ],
    searchPhrases: [
      "luxury shopping generation",
      "luxury bags AI photo",
      "Vuitton flex AI",
      "prestige shopping AI",
    ],
  },
  "montre-luxe": {
    h1: "Luxury watch on your wrist photo by AI",
    metaTitle: "Luxury Wrist Watch AI Photo — LuxeFlexIA",
    metaDescription:
      "Add an ultra-realistic luxury watch to your wrist with LuxeFlexIA. AI generator for horology flex, Watch Lux, premium lifestyle and social content.",
    heroSubtitle:
      "Shiny dial, wrist detail — prestige watch generated by AI.",
    intro:
      "Luxury wrist watch = the sister query to “watch lux generation”. LuxeFlexIA details wrist and dial for a credible horology flex.",
    bullets: [
      "French alias of Watch Lux",
      "Premium wrist detail",
      "Suit / smart casual combo",
      "TikTok flex ready",
    ],
    promptIdeas: [
      "Close-up luxury watch wrist, me blurred in background",
      "Arms crossed, prestige watch, suit",
      "Café selfie, visible watch, natural light",
    ],
    faqs: [
      {
        question: "Watch Lux or luxury watch?",
        answer:
          "Same product. Use the Watch Lux page if you want the TikTok English wording.",
      },
      {
        question: "Rolex style?",
        answer: "Yes — describe a prestige / sport luxury watch in the prompt.",
      },
    ],
    searchPhrases: [
      "luxury watch generation",
      "AI watch photo",
      "Rolex flex AI",
      "wrist watch AI",
    ],
  },
  "glow-up-muscu": {
    h1: "Fake muscular body (glow-up) generated by AI",
    metaTitle: "Fake Muscular Glow-Up AI Prank — LuxeFlexIA",
    metaDescription:
      "Create a hyper-realistic fake gym glow-up with LuxeFlexIA. AI generator for body transformation pranks or convincing lifestyle content.",
    heroSubtitle:
      "Before/after gym in one click — the AI glow-up that surprises everyone.",
    intro:
      "Gym glow-up / fake muscular body: a highly searched transformation prank. LuxeFlexIA generates a credible lifestyle version to surprise friends.",
    bullets: [
      "Body transformation prank",
      "Realistic lifestyle render",
      "Before/after stories",
      "Responsible entertainment",
    ],
    promptIdeas: [
      "Gym glow-up, sporty lifestyle photo, natural light",
      "Confident portrait, athletic silhouette, premium street outfit",
      "Aesthetic gym selfie, transformation look",
    ],
    faqs: [
      {
        question: "For serious fitness content?",
        answer:
          "Mostly prank / lifestyle. Don’t present results as real medical transformation.",
      },
      {
        question: "Viral combo?",
        answer: "Glow-up + Watch Lux + car for a TikTok flex series.",
      },
    ],
    searchPhrases: [
      "glow-up generation",
      "fake muscular body AI",
      "transformation prank AI",
      "gym glow up AI",
    ],
  },
  "generation-rolex": {
    h1: "Rolex generation: prestige watch flex by AI",
    metaTitle: "Rolex / Prestige Watch AI Generation — LuxeFlexIA",
    metaDescription:
      "Rolex and prestige watch flex generation with LuxeFlexIA. Create an AI photo with a luxury watch on your wrist, TikTok Watch Lux style.",
    heroSubtitle:
      "The watch flex that hits: Rolex / prestige generation in AI.",
    intro:
      "Many search “Rolex generation” or “Rolex AI photo” after TikTok videos. LuxeFlexIA creates a realistic horology flex (prestige watch) from your photo.",
    bullets: [
      "Targets Rolex / prestige watch",
      "Linked to Watch Lux and luxury watch",
      "Dial / wrist detail",
      "Prank and TikTok flex",
    ],
    promptIdeas: [
      "Me with prestige sport luxury watch on wrist, close-up",
      "Suit selfie, shiny watch, premium office light",
      "Arm on supercar steering wheel, visible watch",
    ],
    faqs: [
      {
        question: "Is it a real Rolex in the photo?",
        answer:
          "No — it’s AI lifestyle generation for entertainment and social flex, not brand advertising.",
      },
      {
        question: "Where if I want Watch Lux?",
        answer: "See the Watch Lux generation page — same scene family.",
      },
    ],
    searchPhrases: [
      "Rolex generation",
      "Rolex AI photo",
      "Rolex flex TikTok",
      "prestige watch AI",
    ],
  },
  "generation-villa-luxe": {
    h1: "Luxury villa generation: pool, sunset, house flex AI",
    metaTitle: "Luxury Villa AI Generation — LuxeFlexIA",
    metaDescription:
      "Luxury villa generation with LuxeFlexIA: pool, sunset, premium home. Create an AI photo of you in a dream villa.",
    heroSubtitle:
      "Villa with pool, golden sunset — the house flex in AI version.",
    intro:
      "Luxury villa, pool house, Instagram sunset: a highly requested travel/lifestyle generation, often after Dimash Lux real-estate flex.",
    bullets: [
      "Villa / pool / sunset",
      "Dubai or Monaco combo",
      "Real-estate flex stories",
      "Prank “I bought a villa”",
    ],
    promptIdeas: [
      "Me in front of luxury villa with pool, sunset",
      "Poolside selfie, modern villa, golden light",
      "Villa terrace sea view, premium summer outfit",
    ],
    faqs: [
      {
        question: "Villa or palace suite?",
        answer:
          "Villa = exterior / pool. Palace suite = hotel interior. Both exist on LuxeFlexIA.",
      },
      {
        question: "Good for Dimash Lux?",
        answer: "Yes — luxury villa is a classic Dimash scene.",
      },
    ],
    searchPhrases: [
      "luxury villa generation",
      "pool villa AI photo",
      "house flex AI",
      "fake villa TikTok",
    ],
  },
  "generation-argent-flex": {
    h1: "Cash flex generation: dashboard, cash lifestyle AI",
    metaTitle: "Cash Flex / Dashboard AI Generation — LuxeFlexIA",
    metaDescription:
      "Cash flex generation with LuxeFlexIA: success vibe, dashboard, cash lifestyle. AI photos for TikTok motivation / prank (entertainment).",
    heroSubtitle:
      "Success and cash lifestyle vibe — for content, not to deceive.",
    intro:
      "Searches around cash flex / revenue dashboard are frequent on TikTok. LuxeFlexIA generates “success” lifestyle scenes for entertainment or storytelling — never to scam.",
    bullets: [
      "Success / cash lifestyle vibe",
      "Entertainment and storytelling only",
      "Watch Lux + car combo",
      "No fraudulent use",
    ],
    promptIdeas: [
      "Me in premium office, screens, city night light, success vibe",
      "Discreet cash lifestyle: watch + suit + skyline",
      "Luxury car selfie, entrepreneur vibe",
    ],
    faqs: [
      {
        question: "Can I invent fake income?",
        answer:
          "For pranks between friends or fiction storytelling, yes. Never deceive anyone for real money.",
      },
      {
        question: "Link to Dimash Lux?",
        answer: "Yes — cash flex is often part of Dimash series.",
      },
    ],
    searchPhrases: [
      "cash flex generation",
      "dashboard flex AI",
      "success photo AI",
      "rich prank AI",
    ],
  },
  "generation-couple-ia": {
    h1: "Couple AI generation: realistic duo lifestyle photo",
    metaTitle: "Couple AI / Duo Photo Generation — LuxeFlexIA",
    metaDescription:
      "Couple AI generation with LuxeFlexIA: create a realistic duo lifestyle photo for prank or storytelling. Responsible entertainment only.",
    heroSubtitle:
      "Duo lifestyle, date, travel for two — couple generation in AI.",
    intro:
      "Beyond fake girlfriend pranks, many want couple AI lifestyle (restaurant, travel, party). LuxeFlexIA covers these scenes ethically.",
    bullets: [
      "Duo / date / travel scenes",
      "Prank or storytelling",
      "Consent required",
      "Linked to fake girlfriend / Dimash Prank",
    ],
    promptIdeas: [
      "Couple photo chic restaurant, warm light",
      "Duo Dubai travel, skyline, premium outfit",
      "Couple selfie VIP night, bokeh",
    ],
    faqs: [
      {
        question: "Need two photos?",
        answer:
          "Depends on flow: start with your photo and describe the duo scene. Always respect consent.",
      },
      {
        question: "Difference vs fake girlfriend?",
        answer:
          "Fake girlfriend = prank angle. Couple generation = broader duo / lifestyle angle.",
      },
    ],
    searchPhrases: [
      "couple AI generation",
      "duo AI photo",
      "couple image generation",
      "couple prank TikTok",
    ],
  },
  "generation-selfie-ia": {
    h1: "Selfie AI generation: turn your selfie into a luxury scene",
    metaTitle: "Selfie AI → Luxury Scene — LuxeFlexIA",
    metaDescription:
      "Selfie AI generation with LuxeFlexIA: start from a selfie and get an ultra-realistic luxury, travel or prank scene.",
    heroSubtitle:
      "A sharp selfie is enough to start a Dimash Lux or lifestyle flex generation.",
    intro:
      "Most TikTok generations start from a simple selfie. LuxeFlexIA is optimized for that: clear selfie → Dimash Lux, restaurant, watch, villa scene.",
    bullets: [
      "Optimized for phone selfies",
      "Toward luxury / prank scenes",
      "Mobile-first",
      "Prompt ideas included",
    ],
    promptIdeas: [
      "From my selfie: fine-dining restaurant scene",
      "From my selfie: Watch Lux on wrist",
      "From my selfie: Monaco night supercar",
    ],
    faqs: [
      {
        question: "Which selfie works best?",
        answer:
          "Well-lit face, front or 3/4 angle, no heavy filter, simple background.",
      },
      {
        question: "Blurry selfie = bad result?",
        answer: "Often yes. Retake a sharp photo before generating.",
      },
    ],
    searchPhrases: [
      "selfie AI generation",
      "selfie to AI photo",
      "transform selfie AI",
      "selfie photo generation",
    ],
  },
};

const categories = fr.categories.map((category) => ({
  ...category,
  ...(categoryCopy[category.id] ?? {}),
}));

const niches = fr.niches.map((niche) => {
  const copy = nicheCopy[niche.slug];
  if (!copy) {
    throw new Error(`Missing English copy for niche slug: ${niche.slug}`);
  }
  return { ...niche, ...copy };
});

fs.writeFileSync(EN_PATH, `${JSON.stringify({ categories, niches }, null, 2)}\n`, "utf8");
console.log(`Wrote ${EN_PATH} (${niches.length} niches)`);
