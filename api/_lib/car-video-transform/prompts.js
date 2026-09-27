const VEHICLE_LABELS = {
  luxury_black_suv: "photorealistic luxury black SUV with premium OEM design",
  premium_black_sedan: "photorealistic premium black executive sedan",
  red_sports: "photorealistic red high-performance sports car",
  premium_white_suv: "photorealistic premium white SUV",
};

const INTERIOR_LABELS = {
  black_leather: "black leather",
  beige_leather: "beige leather",
  carbon_sport: "carbon sport",
};

const EXTERIOR_BASE =
  "Replace only the existing vehicle with a photorealistic {SELECTED_VEHICLE}. Preserve the exact camera movement, original environment, framing, scale, lens perspective, lighting direction, reflections, shadows, road contact and all unmodified content. Keep the replacement vehicle visually consistent throughout the entire video. Photorealistic automotive commercial footage. No logo, no text, no watermark, no extra vehicles, no distorted wheels, no floating vehicle and no changing background.";

const INTERIOR_BASE =
  "Transform only the visible compact-car interior into a consistent {SELECTED_INTERIOR_STYLE} premium luxury vehicle interior, with high-quality materials, a modern dashboard, refined center console and matching seats. Preserve the exact camera motion, hands, people, windows, outside scenery, lighting, reflections, geometry and perspective. Keep the interior design consistent throughout the video. Photorealistic automotive commercial footage. No logos, no text, no watermark, no distorted hands, no warped steering wheel and no extra controls.";

function buildCarVideoPrompt({ planType, selectedVehicle, selectedInteriorStyle }) {
  if (planType === "interior") {
    const style =
      INTERIOR_LABELS[selectedInteriorStyle] ||
      INTERIOR_LABELS.black_leather;
    return INTERIOR_BASE.replace("{SELECTED_INTERIOR_STYLE}", style);
  }
  const vehicle =
    VEHICLE_LABELS[selectedVehicle] || VEHICLE_LABELS.luxury_black_suv;
  return EXTERIOR_BASE.replace("{SELECTED_VEHICLE}", vehicle);
}

module.exports = {
  buildCarVideoPrompt,
  VEHICLE_LABELS,
  INTERIOR_LABELS,
};
