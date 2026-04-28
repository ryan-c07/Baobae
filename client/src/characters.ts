export type Character = {
  id: string;
  name: string;
  alias: string;
  roleNote: string;
  accentHex: string;
  gradient: string;
  videoSrc: string;
};

export const CHARACTERS: Character[] = [
  {
    id: "atlas",
    name: "Atlas",
    alias: "Skullpanda",
    roleNote: "Quiet confidence, late-night poet energy.",
    accentHex: "#8b7bff",
    gradient: "linear-gradient(135deg, #efeaff 0%, #b8abff 52%, #8876ff 100%)",
    videoSrc: "/videos/atlas.mp4",
  },
  {
    id: "milo",
    name: "Milo",
    alias: "Dimoo",
    roleNote: "Golden retriever heart and cozy charm.",
    accentHex: "#62c8ff",
    gradient: "linear-gradient(135deg, #e5f8ff 0%, #9be2ff 52%, #61c8ff 100%)",
    videoSrc: "/videos/milo.mp4",
  },
  {
    id: "kai",
    name: "Kai",
    alias: "Molly",
    roleNote: "Flirty wildcard who always brings drama.",
    accentHex: "#ff7ab6",
    gradient: "linear-gradient(135deg, #ffe8f1 0%, #ffb8d3 52%, #ff80b5 100%)",
    videoSrc: "/videos/kai.mp4",
  },
  {
    id: "noah",
    name: "Noah",
    alias: "Hirono",
    roleNote: "Stoic outside, softest confessions inside.",
    accentHex: "#ffb547",
    gradient: "linear-gradient(135deg, #fff0d6 0%, #ffd08a 52%, #ffb547 100%)",
    videoSrc: "/videos/noah.mp4",
  },
];

export const CHARACTER_IDS = CHARACTERS.map((character) => character.id);
