/**
 * SNACK CATEGORIES + PRESET CHIPS
 * --------------------------------
 * Edit freely. Presets are just suggestions; people can always type anything.
 *
 *  id      Stored in the database. Don't rename an id once requests exist
 *          (change the label instead). New ids are fine any time.
 *  label   What people see.
 *  emoji   Shown everywhere the category appears.
 *  color   Tile / tag background (light enough for dark text).
 *  quip    The little joke under the category name.
 *  presets The big tappable chips.
 */
export type Category = {
  id: string;
  label: string;
  emoji: string;
  color: string;
  quip: string;
  presets: string[];
};

export const CATEGORIES: Category[] = [
  {
    id: "salty",
    label: "Salty Snacks",
    emoji: "🍿",
    color: "#FFD95C",
    quip: "Crunch is a love language.",
    presets: ["Doritos", "Cheetos", "Goldfish", "Pretzels", "Popcorn", "Pringles", "Cheez-It", "Beef Jerky", "Tortilla Chips & Salsa", "Kettle Chips", "Takis", "Trail Mix"],
  },
  {
    id: "sweets",
    label: "Candy & Sweets",
    emoji: "🍫",
    color: "#FFA3B5",
    quip: "For the 3pm staff meeting slump.",
    presets: ["Sour Patch Kids", "Reese's", "M&M's", "Skittles", "Twizzlers", "Oreos", "Swedish Fish", "Kit Kat", "Snickers", "Gummy Bears", "Cookies", "Rice Krispies Treats"],
  },
  {
    id: "drinks",
    label: "Drinks",
    emoji: "🥤",
    color: "#8FD3FF",
    quip: "Hydration, technically.",
    presets: ["Dr Pepper", "Coke Zero", "Coca-Cola", "Diet Coke", "Sprite", "LaCroix", "Gatorade", "Bottled Water", "Sweet Tea", "Lemonade", "Orange Juice", "Sparkling Water"],
  },
  {
    id: "caffeine",
    label: "Coffee & Energy Drinks",
    emoji: "☕",
    color: "#D9B48F",
    quip: "Ministry runs on this.",
    presets: ["Celsius", "Red Bull", "Monster", "Cold Brew", "K-Cups", "Coffee Creamer", "Ground Coffee", "Starbucks Frappuccino", "Ghost Energy", "Chai"],
  },
  {
    id: "food",
    label: "Real Food",
    emoji: "🍕",
    color: "#FF9A76",
    quip: "Snacks can't do everything.",
    presets: ["Pizza", "Tacos", "Chick-fil-A Nuggets", "Sandwich Stuff", "Hot Dogs", "Burgers", "Mac & Cheese", "Rotisserie Chicken", "Chips & Queso", "Frozen Lasagna"],
  },
  {
    id: "breakfast",
    label: "Breakfast",
    emoji: "🥐",
    color: "#FFC982",
    quip: "Most important meal. Allegedly.",
    presets: ["Donuts", "Bagels & Cream Cheese", "Cereal", "Eggs", "Bacon", "Pancake Mix", "Pop-Tarts", "Muffins", "Yogurt", "Oatmeal", "Breakfast Burritos"],
  },
  {
    id: "healthy",
    label: "Healthy-ish",
    emoji: "🥗",
    color: "#A8E39A",
    quip: "Healthy choices are technically allowed.",
    presets: ["Granola Bars", "Bananas", "Apples", "Grapes", "Veggie Tray & Ranch", "Hummus", "Almonds", "Protein Bars", "Cheese Sticks", "Greek Yogurt", "Rice Cakes"],
  },
  {
    id: "other",
    label: "Other Random Necessities",
    emoji: "🤷",
    color: "#CDBFFF",
    quip: "Somebody has to think of the napkins.",
    presets: ["Ice", "Paper Plates", "Napkins", "Cups", "Paper Towels", "Ziploc Bags", "Gum", "Mints", "Hot Sauce", "Ketchup", "Tums"],
  },
];

/** Little one-tap add-ons for the optional details field. */
export const DETAIL_CHIPS = ["Family size", "Variety pack", "Diet / zero sugar", "The real stuff", "A LOT", "Just a few"];

export const FALLBACK_CATEGORY = "other";

export function getCategory(id: string): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES.find((c) => c.id === FALLBACK_CATEGORY)!;
}

/**
 * Which category a request is filed under:
 *  1. typed text exactly matches a preset ("Takis") -> that preset's category
 *  2. otherwise the category the person tapped
 *  3. otherwise a preset found inside the text ("Pizza rolls" -> Real Food)
 *  4. otherwise Other Random Necessities
 */
export function chooseCategory(text: string, tapped: string | null): string {
  const t = text.trim().toLowerCase();
  const exact = CATEGORIES.find((c) => c.presets.some((p) => p.toLowerCase() === t));
  if (exact) return exact.id;
  if (tapped && CATEGORIES.some((c) => c.id === tapped)) return tapped;
  const partial = CATEGORIES.find((c) => c.presets.some((p) => p.length >= 4 && t.includes(p.toLowerCase())));
  return partial?.id ?? FALLBACK_CATEGORY;
}
