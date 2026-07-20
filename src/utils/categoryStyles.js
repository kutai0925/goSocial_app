export const CATEGORY_STYLES = {
  Party: { bg: "#FF4458", text: "#FFFFFF" },
  Food: { bg: "#FFA84C", text: "#2A1240" },
  Sports: { bg: "#4C9AFF", text: "#FFFFFF" },
  Art: { bg: "#8F4CC7", text: "#FFFFFF" },
  Meetup: { bg: "#FFD93C", text: "#2A1240" },
};

const DEFAULT_CATEGORY_STYLE = { bg: "#8F4CC7", text: "#FFFFFF" };

export function getCategoryStyle(category) {
  return CATEGORY_STYLES[category] || DEFAULT_CATEGORY_STYLE;
}
