// src/constants.js

export const CUSTOM_FIREBASE_CONFIG = {
  apiKey: "AIzaSyC6sj2eCAbg-IZTUYHxbSzEnAnUfba_gQ4",
  authDomain: "mpl-predictor-1ec.firebaseapp.com",
  projectId: "mpl-predictor-1ec",
  storageBucket: "mpl-predictor-1ec.firebasestorage.app",
  messagingSenderId: "224310331537",
  appId: "1:224310331537:web:4a5de42403b753b326d730",
};

export const CUSTOM_APP_ID = "mpl-draft-app-custom";
export const SPREADSHEET_API_URL = "https://script.google.com/macros/s/AKfycbxczfPr7NShN7B8Tw1PPMOLFpLtF-SJ7XWIwOFLhmd3nlO6GqaPEcYTY2Iza4Aq5hWC/exec";

export const TM = {
  ONIC: "ONIC", BTR: "Bigetron Vitality", EVOS: "EVOS", DEWA: "Dewa United Esports",
  TLID: "Team Liquid ID", AE: "Alter Ego", GEEK: "Geek Fam ID", NAVI: "Natus Vincere", RRQ: "RRQ Hoshi",
};

export const TEAMS = Object.values(TM);

export const TEAM_ABBR = {
  ONIC: "ONIC", "Bigetron Vitality": "BTR", EVOS: "EVOS", "Dewa United Esports": "DEWA",
  "Team Liquid ID": "TLID", "Alter Ego": "AE", "Geek Fam ID": "GEEK", "Natus Vincere": "NAVI", "RRQ Hoshi": "RRQ",
};

export const FALLBACK_LOGOS = {
  ONIC: "https://i.imgur.com/wdQSIZa.png", "Bigetron Vitality": "https://i.imgur.com/E9W0qHf.png",
  EVOS: "https://i.imgur.com/lLE2NZA.png", "Dewa United Esports": "https://i.imgur.com/PTQ85rP.png",
  "Team Liquid ID": "https://i.imgur.com/UxD4Qgd.png", "Alter Ego": "https://i.imgur.com/XxfnK7G.png",
  "Geek Fam ID": "https://i.imgur.com/jQvLfiP.png", "Natus Vincere": "https://i.imgur.com/Av7GEqT.png",
  "RRQ Hoshi": "https://i.imgur.com/03ZgNUW.png",
};

export const MAP_LIST = ["Broken Walls", "Dangerous Grass", "Expanding River", "Flying Cloud"];

export const HERO_ROLES = {
  "EXP Lane": ["Aldous", "Alice", "Argus", "Arlott", "Badang", "Benedetta", "Chou", "Cici", "Dyrroth", "Edith", "Esmeralda", "Freya", "Gloo", "Guinevere", "Lapu-Lapu", "Lukas", "Masha", "Minsitthar", "Paquito", "Phoveus", "Ruby", "Silvanna", "Sora", "Sun", "Terizla", "Thamuz", "Uranus", "X.Borg", "Yu Zhong", "Zilong"],
  Jungle: ["Aamon", "Alpha", "Alucard", "Aulus", "Balmond", "Bane", "Barats", "Baxia", "Fanny", "Fredrinn", "Gusion", "Hanzo", "Harley", "Hayabusa", "Helcurt", "Joy", "Julian", "Karina", "Lancelot", "Leomord", "Ling", "Martis", "Natalia", "Nolan", "Popol and Kupa", "Roger", "Saber", "Suyou", "Yi Sun-shin", "Yin"],
  "Mid Lane": ["Aurora", "Cecilion", "Chang'e", "Cyclops", "Eudora", "Faramis", "Gord", "Kadita", "Kagura", "Kimmy", "Lunox", "Luo Yi", "Lylia", "Nana", "Novaria", "Odette", "Pharsa", "Selena", "Vale", "Valentina", "Valir", "Vexana", "Xavier", "Yve", "Zetian", "Zhask", "Zhuxin"],
  "Gold Lane": ["Beatrix", "Brody", "Bruno", "Claude", "Clint", "Granger", "Hanabi", "Harith", "Irithel", "Ixia", "Karrie", "Layla", "Lesley", "Melissa", "Miya", "Moskov", "Natan", "Obsidia", "Wanwan"],
  Roam: ["Akai", "Angela", "Atlas", "Belerick", "Carmilla", "Chip", "Diggie", "Estes", "Floryn", "Franco", "Gatotkaca", "Grock", "Hilda", "Hylos", "Jawhead", "Johnson", "Kaja", "Kalea", "Khaleed", "Khufra", "Lolita", "Marcel", "Mathilda", "Minotaur", "Rafaela", "Tigreal"],
};

const historyRaw = [
  [1, 1, "BTR", "AE", 2, 1], [2, 1, "NAVI", "RRQ", 2, 0], [3, 1, "EVOS", "GEEK", 2, 0],
  // ... (Salin semua array historyRaw dari kode asli di sini) ...
  [40, 5, "DEWA", "TLID", 2, 0]
];

export const history = historyRaw.map((m) => ({
  id: m[0], w: m[1], t1: m[2], t2: m[3], s1: m[4], s2: m[5],
}));

export const schedule = [
  { w: 6, m: [["NAVI", "DEWA"], ["AE", "GEEK"], ["EVOS", "AE"], ["TLID", "ONIC"], ["RRQ", "BTR"], ["NAVI", "TLID"], ["ONIC", "RRQ"], ["GEEK", "EVOS"]] },
  // ... (Salin semua array schedule dari kode asli di sini) ...
  { w: 9, m: [["BTR", "DEWA"], ["TLID", "AE"], ["GEEK", "TLID"], ["AE", "RRQ"], ["BTR", "ONIC"], ["RRQ", "DEWA"], ["ONIC", "EVOS"], ["NAVI", "GEEK"]] },
];
