import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";

const CUSTOM_FIREBASE_CONFIG = {
  apiKey: "AIzaSyC6sj2eCAbg-IZTUYHxbSzEnAnUfba_gQ4",
  authDomain: "mpl-predictor-1ec.firebaseapp.com",
  databaseURL: "https://mpl-predictor-1ec-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mpl-predictor-1ec",
  storageBucket: "mpl-predictor-1ec.firebasestorage.app",
  messagingSenderId: "224310331537",
  appId: "1:224310331537:web:4a5de42403b753b326d730"
};
const CUSTOM_APP_ID = "mpl-kh";
const GLOBAL_COLL = "mpl_kh_global";

const app = getApps().length ? getApps()[0] : initializeApp(CUSTOM_FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = CUSTOM_APP_ID;

const SPREADSHEET_API_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRSFs3iML3UQZtr7-EbtMaWbMZO295Xa52dpHawkbxTkcqsHyf_yhGmHbZ0XNhoPJflhrwbHkOzkJ9g/pub?gid=87535649&single=true&output=csv";

// MPL CAMBODIA TEAMS
const TM = { SYS: "See You Soon", FLKH: "Team Flash KH", CFU: "CFU Gaming", PRO: "PRO Esports", DUCK: "Duck Rice Esports", GXL: "Galaxy Legends", VAL: "Valhalla", EEE: "Evil Eye Esports", GXP: "Galaxy Phoenix", VA: "Vigor Apex" };
const TEAMS = Object.values(TM);
const TEAM_ABBR = { "See You Soon": "SYS", "Team Flash KH": "FLKH", "CFU Gaming": "CFU", "PRO Esports": "PRO", "Duck Rice Esports": "DUCK", "Galaxy Legends": "GXL", "Valhalla": "VAL", "Evil Eye Esports": "EEE", "Galaxy Phoenix": "GXP", "Vigor Apex": "VA" };
const FALLBACK_LOGOS = { "See You Soon": "", "Team Flash KH": "", "CFU Gaming": "", "PRO Esports": "", "Duck Rice Esports": "", "Galaxy Legends": "", "Valhalla": "", "Evil Eye Esports": "", "Galaxy Phoenix": "", "Vigor Apex": "" };

const HERO_ROLES = { 
  "EXP Lane": ["Aldous", "Alice", "Argus", "Arlott", "Badang", "Benedetta", "Chou", "Cici", "Dyrroth", "Edith", "Esmeralda", "Freya", "Gloo", "Guinevere", "Lapu-Lapu", "Lukas", "Masha", "Minsitthar", "Paquito", "Phoveus", "Ruby", "Silvanna", "Sora", "Sun", "Terizla", "Thamuz", "Uranus", "X.Borg", "Yu Zhong", "Zilong"], 
  Jungle: ["Aamon", "Alpha", "Alucard", "Aulus", "Balmond", "Bane", "Barats", "Baxia", "Fanny", "Fredrinn", "Gusion", "Hanzo", "Harley", "Hayabusa", "Helcurt", "Joy", "Julian", "Karina", "Lancelot", "Leomord", "Ling", "Martis", "Natalia", "Nolan", "Popol and Kupa", "Roger", "Saber", "Suyou", "Yi Sun-shin", "Yin"], 
  "Mid Lane": ["Aurora", "Cecilion", "Chang'e", "Cyclops", "Eudora", "Faramis", "Gord", "Kadita", "Kagura", "Kimmy", "Lunox", "Luo Yi", "Lylia", "Nana", "Novaria", "Odette", "Pharsa", "Selena", "Vale", "Valentina", "Valir", "Vexana", "Xavier", "Yve", "Zetian", "Zhask", "Zhuxin"], 
  "Gold Lane": ["Beatrix", "Brody", "Bruno", "Claude", "Clint", "Granger", "Hanabi", "Harith", "Irithel", "Ixia", "Karrie", "Layla", "Lesley", "Melissa", "Miya", "Moskov", "Natan", "Obsidia", "Wanwan"], 
  Roam: ["Akai", "Angela", "Atlas", "Belerick", "Carmilla", "Chip", "Diggie", "Estes", "Floryn", "Franco", "Gatotkaca", "Grock", "Hilda", "Hylos", "Jawhead", "Johnson", "Kaja", "Kalea", "Khaleed", "Khufra", "Lolita", "Marcel", "Mathilda", "Minotaur", "Rafaela", "Tigreal"] 
};
const MAP_LIST = ["Broken Walls", "Dangerous Grass", "Expanding Rivers", "Flying Cloud"];

function calculate(matches) {
  let s = {}; TEAMS.forEach((t) => (s[t] = { n: t, mw: 0, ml: 0, gw: 0, gl: 0, h2h: {}, form: [] }));
  TEAMS.forEach((t1) => TEAMS.forEach((t2) => (s[t1].h2h[t2] = 0)));
  matches.forEach((m) => {
    if (!s[m.t1] || !s[m.t2]) return;
    if (typeof m.s1 === "number" && typeof m.s2 === "number") {
      s[m.t1].gw += m.s1; s[m.t1].gl += m.s2; s[m.t2].gw += m.s2; s[m.t2].gl += m.s1;
      if (m.s1 === 2 || m.s2 === 2) {
        if (m.s1 > m.s2) { s[m.t1].mw++; s[m.t2].ml++; s[m.t1].h2h[m.t2]++; s[m.t1].form.push({ res: "W", opp: m.t2 }); s[m.t2].form.push({ res: "L", opp: m.t1 }); } 
        else if (m.s2 > m.s1) { s[m.t2].mw++; s[m.t1].ml++; s[m.t2].h2h[m.t1]++; s[m.t2].form.push({ res: "W", opp: m.t1 }); s[m.t1].form.push({ res: "L", opp: m.t2 }); }
      }
    }
  });
  TEAMS.forEach((t) => { s[t].form = s[t].form.slice(-5); });
  return Object.values(s).sort((a, b) => {
    if (b.mw !== a.mw) return b.mw - a.mw; let gdA = a.gw - a.gl, gdB = b.gw - b.gl; if (gdB !== gdA) return gdB - gdA;
    let h2hDiff = b.h2h[a.n] - a.h2h[b.n]; if (h2hDiff !== 0) return h2hDiff; return a.n.localeCompare(b.n);
  });
}

function getDisplayMatches(currentState, focusTeam, filter, currentList, curWeek) {
  let matches = currentState;
  if (focusTeam) {
    matches = matches.filter((m) => m.t1 === focusTeam || m.t2 === focusTeam);
    if (filter === "win") matches = matches.filter((m) => { let my = m.t1 === focusTeam ? m.s1 : m.s2; let opp = m.t1 === focusTeam ? m.s2 : m.s1; return my > opp; });
    else if (filter === "lose") matches = matches.filter((m) => { let my = m.t1 === focusTeam ? m.s1 : m.s2; let opp = m.t1 === focusTeam ? m.s2 : m.s1; return my < opp && (m.s1 > 0 || m.s2 > 0 || m.fixed); });
  } else { matches = matches.filter((m) => m.w === curWeek); }
  return matches.map((m) => {
    let encounters = currentState.filter((x) => x.fixed && ((x.t1 === m.t1 && x.t2 === m.t2) || (x.t1 === m.t2 && x.t2 === m.t1))).sort((a, b) => a.id - b.id);
    let h2hText = encounters.length > 0 ? encounters.map((enc, idx) => `Leg ${idx + 1}: ${TEAM_ABBR[enc.s1 > enc.s2 ? enc.t1 : enc.t2]} ${Math.max(enc.s1, enc.s2)}-${Math.min(enc.s1, enc.s2)}`).join("\n") : "Belum bertemu";
    let rankT1 = currentList.find((t) => t.n === m.t1)?.trueRank || 0; let rankT2 = currentList.find((t) => t.n === m.t2)?.trueRank || 0;
    let isCrucial = !m.fixed && rankT1 >= 4 && rankT1 <= 8 && rankT2 >= 4 && rankT2 <= 8 && Math.abs(rankT1 - rankT2) <= 2;
    let focusResult = null;
    if (focusTeam && (m.s1 > 0 || m.s2 > 0 || m.fixed)) { let focusScore = m.t1 === focusTeam ? m.s1 : m.s2; let oppScore = m.t1 === focusTeam ? m.s2 : m.s1; if (focusScore > oppScore) focusResult = "WIN"; else if (focusScore < oppScore) focusResult = "LOSE"; }
    let borderClass = "border-slate-700 bg-[#121826] hover:bg-[#1a2333]";
    let isFocusCard = focusTeam && (m.t1 === focusTeam || m.t2 === focusTeam);
    if (isFocusCard) borderClass = "border-yellow-500/50 bg-yellow-900/10 hover:bg-yellow-900/20 shadow-[0_0_15px_rgba(234,179,8,0.05)]";
    return { ...m, h2hText, isCrucial, focusResult, borderClass, isFocusCard };
  });
}

function getStateSeed(state) { return state.map((m) => `${m.id}-${m.s1}-${m.s2}`).join(""); }
function mulberry32(a) { let seed = 0; for (let i = 0; i < a.length; i++) seed = (Math.imul(31, seed) + a.charCodeAt(i)) | 0; return function () { var t = (seed += 0x6d2b79f5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function getHeroIcon(name) { return `https://cdn.jsdelivr.net/gh/Davton90/Js-Hero@main/Hero%20icon/${encodeURIComponent(name)}.png`; }

const MatchCard = ({ m, highlightedTeam, teamLogos, clearMatch, openDraftModal, showPreview, updatePreviewPos, hidePreview, onDropdownScore }) => {
  const isPredicted = m.s1 > 0 || m.s2 > 0;
  return (
    <div className={`p-3.5 rounded-2xl border mb-4 transition-all relative ${m.borderClass}`}>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{highlightedTeam ? `W${m.w} / Match ${m.id}` : `Match ${m.id}`}</span>{m.isCrucial && (<span className="bg-gradient-to-r from-orange-600 to-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded ml-2 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse">🔥 KRUSIAL</span>)}</div>
        <div className="flex items-center gap-2">
          {isPredicted && !m.fixed && (<button onClick={(e) => { e.stopPropagation(); clearMatch(m.id); }} className="text-[10px] text-slate-400 hover:text-red-400 transition hover:bg-red-500/10 rounded-full p-1" title="Clear Prediksi"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>)}
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${m.fixed ? "bg-slate-800 text-emerald-400 border border-emerald-900/50" : isPredicted ? "bg-blue-900/50 text-blue-400" : "bg-[#1a2333] text-slate-400"}`}>{m.fixed && (<div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>)}{m.fixed ? "LOCKED / FINAL" : isPredicted ? "PREDICTED" : "UPCOMING"}</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 flex justify-end items-center gap-3">
          <span className={`text-sm font-black text-right truncate ${m.t1 === highlightedTeam ? "text-yellow-400" : "text-slate-200"}`}>{TEAM_ABBR[m.t1] || m.t1}</span>
          {teamLogos[m.t1] ? (<img src={teamLogos[m.t1]} className="w-6 h-6 object-contain drop-shadow-md shrink-0" alt="logo" />) : (<div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black shadow-sm shrink-0 bg-slate-800">{TEAM_ABBR[m.t1] ? TEAM_ABBR[m.t1].substring(0, 3) : m.t1.substring(0, 3).toUpperCase()}</div>)}
        </div>
        <div className="flex-none flex flex-col items-center justify-center min-w-[90px] relative z-20">
          {m.focusResult === "WIN" && (<span className="absolute -top-5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-black tracking-widest shadow-sm pointer-events-none">WIN</span>)}
          {m.focusResult === "LOSE" && (<span className="absolute -top-5 bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded text-[10px] font-black tracking-widest shadow-sm pointer-events-none">LOSE</span>)}
          {m.fixed ? (
            <div className="bg-slate-900/80 px-2 py-1 rounded-xl border border-emerald-900/40 shadow-inner flex items-center gap-1.5 cursor-pointer hover:bg-slate-800 transition-all relative z-20 group" onClick={(e) => { openDraftModal(m); e.stopPropagation(); }} onMouseEnter={(e) => showPreview(m, e)} onMouseMove={updatePreviewPos} onMouseLeave={hidePreview}>
              <span className={`font-black text-sm w-4 text-center pointer-events-none ${m.s1 > m.s2 ? "text-emerald-400" : "text-slate-500"}`}>{m.s1}</span>
              <span className="bg-slate-700/80 text-[9px] text-white px-2 py-1 rounded-md font-bold shadow border border-slate-600/50 group-hover:border-blue-500 pointer-events-none transition-colors">VS</span>
              <span className={`font-black text-sm w-4 text-center pointer-events-none ${m.s2 > m.s1 ? "text-emerald-400" : "text-slate-500"}`}>{m.s2}</span>
            </div>
          ) : (
            <div className={`p-1 rounded-xl border flex items-center gap-1.5 transition-all relative z-20 cursor-pointer hover:bg-slate-800 ${isPredicted ? "border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.15)] bg-[#1a2333]" : "border-slate-700 bg-slate-900/80 shadow-inner"}`} onClick={(e) => { openDraftModal(m); e.stopPropagation(); }} onMouseEnter={(e) => showPreview(m, e)} onMouseMove={updatePreviewPos} onMouseLeave={hidePreview}>
              <select value={m.s1} onClick={(e) => e.stopPropagation()} onChange={(e) => { onDropdownScore({ id: m.id, team: 1, val: e.target.value }); e.stopPropagation(); }} className={`appearance-none bg-slate-800 text-white text-center font-bold rounded py-1 w-6 text-sm border hover:bg-slate-700 outline-none cursor-pointer relative z-30 ${m.s1 > 0 ? "border-blue-500/50 text-blue-400" : "border-slate-600"}`} style={{ textAlignLast: "center" }}><option value="0">0</option><option value="1">1</option><option value="2">2</option></select>
              <span className="bg-slate-700/80 text-[9px] text-white px-2 py-1 rounded-md font-bold shadow border border-slate-600/50 transition-all pointer-events-none">VS</span>
              <select value={m.s2} onClick={(e) => e.stopPropagation()} onChange={(e) => { onDropdownScore({ id: m.id, team: 2, val: e.target.value }); e.stopPropagation(); }} className={`appearance-none bg-slate-800 text-white text-center font-bold rounded py-1 w-6 text-sm border hover:bg-slate-700 outline-none cursor-pointer relative z-30 ${m.s2 > 0 ? "border-blue-500/50 text-blue-400" : "border-slate-600"}`} style={{ textAlignLast: "center" }}><option value="0">0</option><option value="1">1</option><option value="2">2</option></select>
            </div>
          )}
          <span className="text-slate-400 text-[8.5px] font-bold mt-1.5 tracking-wider text-center leading-tight max-w-[130px] whitespace-pre-line pointer-events-none">{m.h2hText}</span>
        </div>
        <div className="flex-1 flex justify-start items-center gap-3">
          {teamLogos[m.t2] ? (<img src={teamLogos[m.t2]} className="w-6 h-6 object-contain drop-shadow-md shrink-0" alt="logo" />) : (<div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black shadow-sm shrink-0 bg-slate-800">{TEAM_ABBR[m.t2] ? TEAM_ABBR[m.t2].substring(0, 3) : m.t2.substring(0, 3).toUpperCase()}</div>)}
          <span className={`text-sm font-black text-left truncate ${m.t2 === highlightedTeam ? "text-yellow-400" : "text-slate-200"}`}>{TEAM_ABBR[m.t2] || m.t2}</span>
        </div>
      </div>
    </div>
  );
};

export default function MplPredictor() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("standings");
  const [state, setState] = useState([]);
  const [curWeek, setCurWeek] = useState(1);
  const [probs, setProbs] = useState({});
  const [highlightedTeam, setHighlightedTeam] = useState(null);
  const [focusFilter, setFocusFilter] = useState("all");
  const [teamLogos, setTeamLogos] = useState(FALLBACK_LOGOS);
  const [sortCol, setSortCol] = useState("default");
  const [sortAsc, setSortAsc] = useState(true);
  const [draftState, setDraftState] = useState({});
  const [draftModalMatch, setDraftModalMatch] = useState(null);
  const [hoveredMatchPreview, setHoveredMatchPreview] = useState(null);
  const [previewX, setPreviewX] = useState(0);
  const [previewY, setPreviewY] = useState(0);
  const [heroSortCol, setHeroSortCol] = useState("pb_rate");
  const [heroSortAsc, setHeroSortAsc] = useState(false);
  const [heroDetailModal, setHeroDetailModal] = useState(null);
  const [heroDetailMapFilter, setHeroDetailMapFilter] = useState("All");
  const [heroSearchQuery, setHeroSearchQuery] = useState("");
  const [heroRoleFilter, setHeroRoleFilter] = useState("All");
  const [heroMapFilter, setHeroMapFilter] = useState("All");
  const [quadrantMapFilter, setQuadrantMapFilter] = useState("All");
  const [compareMapFilter, setCompareMapFilter] = useState("All");
  
  const [customComboHeroes, setCustomComboHeroes] = useState([]);
  const [customComboInput, setCustomComboInput] = useState("");
  const [showComboDropdown, setShowComboDropdown] = useState(false);
  const [comboSideFilter, setComboSideFilter] = useState("All");
  const [comboMapFilter, setComboMapFilter] = useState("All");
  const [comboTeamFilter, setComboTeamFilter] = useState("All");
  
  const [teamSignatureModal, setTeamSignatureModal] = useState(null);
  const [teamSigMapFilter, setTeamSigMapFilter] = useState("All");
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareTeamA, setCompareTeamA] = useState(TEAMS[0]);
  const [compareTeamB, setCompareTeamB] = useState(TEAMS[1] || TEAMS[0]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Menyambungkan Database...");
  const [syncColor, setSyncColor] = useState("text-slate-400");
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [isToastError, setIsToastError] = useState(false);
  const [currentAiInsight, setCurrentAiInsight] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [globalScores, setGlobalScores] = useState({});

  const officialMatchesRef = useRef([]);
  const insightCacheRef = useRef({});
  const weekNavRef = useRef(null);

  const heroRoleKeys = useMemo(() => Object.keys(HERO_ROLES), []);
  const allHeroes = useMemo(() => Object.values(HERO_ROLES).flat().sort(), []);
  const isHistoryMatch = useCallback((id) => false, []);

  const baseList = useMemo(() => calculate(state), [state]);

  const sortedList = useMemo(() => {
    let temp = [...baseList];
    temp.forEach((t, i) => (t.trueRank = i + 1));
    if (sortCol !== "default") {
      temp.sort((a, b) => {
        let valA = parseFloat(probs[a.n]?.[sortCol] || 0); let valB = parseFloat(probs[b.n]?.[sortCol] || 0);
        if (valA === valB) return a.trueRank - b.trueRank; return sortAsc ? valA - valB : valB - valA;
      });
    } else if (!sortAsc) temp.reverse();
    return temp;
  }, [baseList, sortCol, sortAsc, probs]);

  const activeTeamData = useMemo(() => highlightedTeam ? sortedList.find((t) => t.n === highlightedTeam) : null, [highlightedTeam, sortedList]);
  const teamMatchesRaw = useMemo(() => state.filter((m) => m.t1 === highlightedTeam || m.t2 === highlightedTeam), [state, highlightedTeam]);
  const upcomingMatchesAll = useMemo(() => teamMatchesRaw.filter((m) => !m.fixed), [teamMatchesRaw]);
  const remOpponents = useMemo(() => upcomingMatchesAll.map((m) => (m.t1 === highlightedTeam ? m.t2 : m.t1)), [upcomingMatchesAll, highlightedTeam]);

  const focusStats = useMemo(() => {
    const team = highlightedTeam;
    if (!team) return { mWin: 0, mLose: 0, mWR: 0, gWin: 0, gLose: 0, gWR: 0 };
    let mWin = 0, mLose = 0, gWin = 0, gLose = 0;
    state.forEach((m) => {
      if ((m.s1 > 0 || m.s2 > 0 || m.fixed) && (m.t1 === team || m.t2 === team)) {
        let isT1 = m.t1 === team; let myScore = isT1 ? m.s1 : m.s2; let oppScore = isT1 ? m.s2 : m.s1;
        if (myScore > oppScore) mWin++; else if (myScore < oppScore) mLose++;
        gWin += myScore; gLose += oppScore;
      }
    });
    let mTotal = mWin + mLose; let gTotal = gWin + gLose;
    return { mWin, mLose, mWR: mTotal > 0 ? Math.round((mWin / mTotal) * 100) : 0, gWin, gLose, gWR: gTotal > 0 ? Math.round((gWin / gTotal) * 100) : 0, };
  }, [highlightedTeam, state]);

  const displayMatches = useMemo(() => getDisplayMatches(state, highlightedTeam, focusFilter, sortedList, curWeek), [state, highlightedTeam, focusFilter, sortedList, curWeek]);

  const filteredDraftState = useMemo(() => {
    const mapFilter = heroMapFilter; const original = draftState;
    if (mapFilter === "All") return original;
    const filtered = {};
    Object.entries(original).forEach(([mId, games]) => { const matchedGames = games.filter((g) => g.map === mapFilter); if (matchedGames.length > 0) filtered[parseInt(mId)] = matchedGames; });
    return filtered;
  }, [heroMapFilter, draftState]);

  const quadrantDraftState = useMemo(() => {
    const mapFilter = quadrantMapFilter; const original = draftState;
    if (mapFilter === "All") return original;
    const filtered = {};
    Object.entries(original).forEach(([mId, games]) => { const matchedGames = games.filter((g) => g.map === mapFilter); if (matchedGames.length > 0) filtered[parseInt(mId)] = matchedGames; });
    return filtered;
  }, [quadrantMapFilter, draftState]);

  const getTotalGamesPlayed = useCallback(() => { let count = 0; Object.values(filteredDraftState).forEach((games) => (count += games.length)); return count; }, [filteredDraftState]);
  const getRole = useCallback((heroName) => { for (const [r, list] of Object.entries(HERO_ROLES)) { if (list.includes(heroName)) return r; } return "Unknown"; }, []);

  const processedHeroData = useMemo(() => {
    const stats = {}; const roleMap = ["EXP Lane", "Jungle", "Mid Lane", "Gold Lane", "Roam"];
    Object.values(HERO_ROLES).flat().forEach((h) => { stats[h] = { name: h, picks: 0, bans: 0, wins: 0, losses: 0, bPicks: 0, bWins: 0, bLosses: 0, rPicks: 0, rWins: 0, rLosses: 0, roleCounts: { "EXP Lane": 0, Jungle: 0, "Mid Lane": 0, "Gold Lane": 0, Roam: 0 }, role: getRole(h) }; });
    let totalGames = 0;
    Object.values(filteredDraftState).forEach((matchDrafts) => {
      matchDrafts.forEach((game) => {
        totalGames++;
        const processPicks = (picks, side, res) => {
          picks.forEach((h, idx) => {
            if (!h) return; stats[h].picks++; if (res === "W") stats[h].wins++; else if (res === "L") stats[h].losses++;
            if (side === "blue") { stats[h].bPicks++; if (res === "W") stats[h].bWins++; else if (res === "L") stats[h].bLosses++; } else { stats[h].rPicks++; if (res === "W") stats[h].rWins++; else if (res === "L") stats[h].rLosses++; }
            if (idx >= 0 && idx < 5) stats[h].roleCounts[roleMap[idx]]++;
          });
        };
        processPicks(game.t1Picks, game.t1Side, game.t1Result); processPicks(game.t2Picks, game.t2Side, game.t2Result);
        const processBans = (bans) => { bans.forEach((h) => { if (h) stats[h].bans++; }); };
        processBans(game.t1Bans); processBans(game.t2Bans);
      });
    });
    const tg = Math.max(1, totalGames);
    let arr = Object.values(stats).filter((h) => h.picks + h.bans > 0).map((h) => {
      let pb_rate = parseFloat((((h.picks + h.bans) / tg) * 100).toFixed(2)); let w_rate = h.picks > 0 ? parseFloat(((h.wins / h.picks) * 100).toFixed(2)) : 0;
      let label = "💤 Niche / Weak";
      if (pb_rate >= 25 && w_rate >= 50) label = "🔥 Meta Dominant"; else if (pb_rate >= 25 && w_rate < 50) label = "⚠️ Overrated"; else if (pb_rate < 25 && w_rate >= 55 && h.picks >= 2) label = "💎 Hidden Gem";
      let impact = parseFloat((h.picks * (w_rate / 100) + h.bans * 1.2).toFixed(1));
      let finalRole = h.role, maxRoleVal = 0; for (const [rName, count] of Object.entries(h.roleCounts)) { if (count > maxRoleVal) { maxRoleVal = count; finalRole = rName; } }
      return { ...h, role: finalRole, p_rate: parseFloat(((h.picks / tg) * 100).toFixed(2)), b_rate: parseFloat(((h.bans / tg) * 100).toFixed(2)), pb_count: h.picks + h.bans, pb_rate, w_rate, impact, label, b_winrate: h.bPicks > 0 ? parseFloat(((h.bWins / h.bPicks) * 100).toFixed(2)) : 0, r_winrate: h.rPicks > 0 ? parseFloat(((h.rWins / h.rPicks) * 100).toFixed(2)) : 0 };
    });
    const col = heroSortCol; const asc = heroSortAsc;
    arr.sort((a, b) => {
      if (a[col] === b[col]) return a.name.localeCompare(b.name);
      if (typeof a[col] === "number") return asc ? a[col] - b[col] : b[col] - a[col];
      return asc ? a[col].localeCompare(b[col]) : b[col].localeCompare(a[col]);
    });
    return arr;
  }, [filteredDraftState, getRole, heroSortCol, heroSortAsc]);

  const filteredHeroData = useMemo(() => {
    let data = processedHeroData; const q = heroSearchQuery.toLowerCase(); const r = heroRoleFilter;
    if (q) data = data.filter((h) => h.name.toLowerCase().includes(q)); if (r !== "All") data = data.filter((h) => h.role === r);
    return data;
  }, [processedHeroData, heroSearchQuery, heroRoleFilter]);

  const quadrantHeroData = useMemo(() => {
    const stats = {}; const roleMap = ["EXP Lane", "Jungle", "Mid Lane", "Gold Lane", "Roam"];
    Object.values(HERO_ROLES).flat().forEach((h) => { stats[h] = { name: h, picks: 0, bans: 0, wins: 0, losses: 0, bPicks: 0, bWins: 0, bLosses: 0, rPicks: 0, rWins: 0, rLosses: 0, roleCounts: { "EXP Lane": 0, Jungle: 0, "Mid Lane": 0, "Gold Lane": 0, Roam: 0 }, role: getRole(h) }; });
    let totalGames = 0;
    Object.values(quadrantDraftState).forEach((matchDrafts) => {
      matchDrafts.forEach((game) => {
        totalGames++;
        const processPicks = (picks, side, res) => {
          picks.forEach((h, idx) => {
            if (!h) return; stats[h].picks++; if (res === "W") stats[h].wins++; else if (res === "L") stats[h].losses++;
            if (side === "blue") { stats[h].bPicks++; if (res === "W") stats[h].bWins++; else if (res === "L") stats[h].bLosses++; } else { stats[h].rPicks++; if (res === "W") stats[h].rWins++; else if (res === "L") stats[h].rLosses++; }
            if (idx >= 0 && idx < 5) stats[h].roleCounts[roleMap[idx]]++;
          });
        };
        processPicks(game.t1Picks, game.t1Side, game.t1Result); processPicks(game.t2Picks, game.t2Side, game.t2Result);
        const processBans = (bans) => { bans.forEach((h) => { if (h) stats[h].bans++; }); };
        processBans(game.t1Bans); processBans(game.t2Bans);
      });
    });
    const tg = Math.max(1, totalGames);
    let arr = Object.values(stats).filter((h) => h.picks + h.bans > 0).map((h) => {
      let pb_rate = parseFloat((((h.picks + h.bans) / tg) * 100).toFixed(2)); let w_rate = h.picks > 0 ? parseFloat(((h.wins / h.picks) * 100).toFixed(2)) : 0;
      let label = "💤 Niche / Weak";
      if (pb_rate >= 25 && w_rate >= 50) label = "🔥 Meta Dominant"; else if (pb_rate >= 25 && w_rate < 50) label = "⚠️ Overrated"; else if (pb_rate < 25 && w_rate >= 55 && h.picks >= 2) label = "💎 Hidden Gem";
      let impact = parseFloat((h.picks * (w_rate / 100) + h.bans * 1.2).toFixed(1));
      let finalRole = h.role, maxRoleVal = 0; for (const [rName, count] of Object.entries(h.roleCounts)) { if (count > maxRoleVal) { maxRoleVal = count; finalRole = rName; } }
      return { ...h, role: finalRole, p_rate: parseFloat(((h.picks / tg) * 100).toFixed(2)), b_rate: parseFloat(((h.bans / tg) * 100).toFixed(2)), pb_count: h.picks + h.bans, pb_rate, w_rate, impact, label, b_winrate: h.bPicks > 0 ? parseFloat(((h.bWins / h.bPicks) * 100).toFixed(2)) : 0, r_winrate: h.rPicks > 0 ? parseFloat(((h.rWins / h.rPicks) * 100).toFixed(2)) : 0 };
    });
    const q = heroSearchQuery.toLowerCase(); const r = heroRoleFilter;
    if (q) arr = arr.filter((h) => h.name.toLowerCase().includes(q)); if (r !== "All") arr = arr.filter((h) => h.role === r);
    return arr;
  }, [quadrantDraftState, getRole, heroSearchQuery, heroRoleFilter]);

  const analyticsInsights = useMemo(() => {
    const data = processedHeroData;
    return {
      totalMatches: getTotalGamesPlayed(), uniquePicks: data.filter((h) => h.picks > 0).length,
      topPick: [...data].sort((a, b) => b.picks - a.picks)[0], topBan: [...data].sort((a, b) => b.bans - a.bans)[0],
      topMeta: data.filter((h) => h.label === "🔥 Meta Dominant").sort((a, b) => b.impact - a.impact).slice(0, 5),
      hiddenGems: data.filter((h) => h.label === "💎 Hidden Gem").sort((a, b) => b.w_rate - a.w_rate).slice(0, 5),
      overrated: data.filter((h) => h.label === "⚠️ Overrated").sort((a, b) => b.picks - a.picks).slice(0, 5),
      mustBan: [...data].sort((a, b) => b.bans - a.bans).slice(0, 5),
    };
  }, [processedHeroData, getTotalGamesPlayed]);

  const mapOverviewStats = useMemo(() => {
    let totalGames = 0, blueWins = 0, redWins = 0, totalDur = 0, maxDur = 0, minDur = 999999;
    const heroPicks = {}; const heroBans = {};
    Object.values(filteredDraftState).forEach((games) => {
      games.forEach((g) => {
        totalGames++;
        if (g.t1Side === "blue" && g.t1Result === "W") blueWins++;
        if (g.t2Side === "blue" && g.t2Result === "W") blueWins++;
        if (g.t1Side === "red" && g.t1Result === "W") redWins++;
        if (g.t2Side === "red" && g.t2Result === "W") redWins++;
        
        if (g.duration) {
          const parts = g.duration.split(":");
          if (parts.length === 2) {
            const secs = parseInt(parts[0]) * 60 + parseInt(parts[1]);
            totalDur += secs; if (secs > maxDur) maxDur = secs; if (secs < minDur) minDur = secs;
          }
        }
        [...g.t1Picks, ...g.t2Picks].forEach(h => { if (h) heroPicks[h] = (heroPicks[h] || 0) + 1; });
        [...g.t1Bans, ...g.t2Bans].forEach(h => { if (h) heroBans[h] = (heroBans[h] || 0) + 1; });
      });
    });
    if (totalGames === 0) return null;
    const formatDur = (secs) => { if (secs === 999999 || secs === 0) return "-"; const m = Math.floor(secs / 60); const s = secs % 60; return `${m}:${s.toString().padStart(2, "0")}`; };
    const topPick = Object.entries(heroPicks).sort((a, b) => b[1] - a[1])[0] || ["-", 0];
    const topBan = Object.entries(heroBans).sort((a, b) => b[1] - a[1])[0] || ["-", 0];
    return {
      totalGames, bWr: Math.round((blueWins / totalGames) * 100) || 0, rWr: Math.round((redWins / totalGames) * 100) || 0,
      avgDur: formatDur(Math.round(totalDur / totalGames)), fastestDur: formatDur(minDur), longestDur: formatDur(maxDur),
      topPick: { name: topPick[0], count: topPick[1] }, topBan: { name: topBan[0], count: topBan[1] }
    };
  }, [filteredDraftState]);

  const mapAssistant = useMemo(() => {
    const data = filteredHeroData;
    const recPicks = [...data].filter((h) => h.picks >= 1).sort((a, b) => b.w_rate * Math.log10(b.picks + 1) - a.w_rate * Math.log10(a.picks + 1)).slice(0, 4);
    const recBans = [...data].sort((a, b) => b.bans - a.bans).slice(0, 4);
    const sTier = [...data].filter((h) => h.pb_rate >= 20 && h.w_rate >= 55).sort((a, b) => b.impact - a.impact).slice(0, 6);
    const actualSTier = sTier.length > 0 ? sTier : [...data].sort((a, b) => b.impact - a.impact).slice(0, 6);
    const aTier = [...data].filter((h) => h.pb_rate >= 10 && h.w_rate >= 50 && !actualSTier.includes(h)).sort((a, b) => b.impact - a.impact).slice(0, 6);
    const actualATier = aTier.length > 0 ? aTier : [...data].filter((h) => !actualSTier.includes(h)).sort((a, b) => b.impact - a.impact).slice(0, 6);
    return { recPicks, recBans, sTier: actualSTier, aTier: actualATier };
  }, [filteredHeroData]);

  const teamSignatures = useMemo(() => {
    let td = {}; const roleMap = ["EXP", "JUG", "MID", "GOLD", "ROAM"];
    TEAMS.forEach((t) => { td[TEAM_ABBR[t] || t] = { picks: {}, bans: {} }; });
    Object.entries(filteredDraftState).forEach(([mId, games]) => {
      let match = state.find((x) => x.id == parseInt(mId)); if (!match) return;
      games.forEach((g) => {
        let processPicks = (team, picks) => { let t = TEAM_ABBR[team] || team; picks.forEach((p, idx) => { if (!p) return; if (!td[t].picks[p]) td[t].picks[p] = { count: 0, roles: { EXP: 0, JUG: 0, MID: 0, GOLD: 0, ROAM: 0 } }; td[t].picks[p].count++; if (idx >= 0 && idx < 5) td[t].picks[p].roles[roleMap[idx]]++; }); };
        let processBans = (team, bans) => { let t = TEAM_ABBR[team] || team; bans.filter(Boolean).forEach((b) => (td[t].bans[b] = (td[t].bans[b] || 0) + 1)); };
        if (match.t1) { processPicks(match.t1, g.t1Picks); processBans(match.t1, g.t1Bans); }
        if (match.t2) { processPicks(match.t2, g.t2Picks); processBans(match.t2, g.t2Bans); }
      });
    });
    return TEAMS.map((team) => {
      let abbr = TEAM_ABBR[team] || team; let teamData = td[abbr] || { picks: {}, bans: {} };
      let topPicks = Object.entries(teamData.picks || {}).map(([name, data]) => { let mainRole = "N/A", maxR = 0; for (let r in data.roles) { if (data.roles[r] > maxR) { maxR = data.roles[r]; mainRole = r; } } return { name, count: data.count, role: mainRole }; }).sort((a, b) => b.count - a.count).slice(0, 5);
      let topBans = Object.entries(teamData.bans || {}).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
      return { team, abbr, picks: topPicks, bans: topBans };
    });
  }, [filteredDraftState, state]);

  const teamSignatureDetailData = useMemo(() => {
    const team = teamSignatureModal;
    if (!team) return null;
    const roleMap = ["EXP Lane", "Jungle", "Mid Lane", "Gold Lane", "Roam"];
    const data = { "EXP Lane": {}, Jungle: {}, "Mid Lane": {}, "Gold Lane": {}, Roam: {} };
    Object.entries(draftState).forEach(([mId, games]) => {
      const match = state.find((x) => x.id == parseInt(mId));
      if (!match) return;
      games.forEach((g) => {
        if (teamSigMapFilter !== "All" && g.map !== teamSigMapFilter) return;

        let picks = []; let isWin = false;
        if (match.t1 === team || TEAM_ABBR[match.t1] === team) { picks = g.t1Picks; isWin = g.t1Result === "W"; }
        if (match.t2 === team || TEAM_ABBR[match.t2] === team) { picks = g.t2Picks; isWin = g.t2Result === "W"; }
        if (picks.length > 0) {
          picks.forEach((h, idx) => {
            if (h && idx < 5) {
              if (!data[roleMap[idx]][h]) data[roleMap[idx]][h] = { count: 0, wins: 0 };
              data[roleMap[idx]][h].count++;
              if (isWin) data[roleMap[idx]][h].wins++;
            }
          });
        }
      });
    });
    const result = {};
    for (const role of roleMap) {
      result[role] = Object.entries(data[role])
        .map(([name, stats]) => ({ name, count: stats.count, wr: Math.round((stats.wins / stats.count) * 100) }))
        .sort((a, b) => b.count - a.count);
    }
    return { teamName: team, roles: result };
  }, [teamSignatureModal, draftState, state, teamSigMapFilter]);

  const teamCompareData = useMemo(() => {
    const tA = compareTeamA; const tB = compareTeamB;
    const roleMap = ["EXP Lane", "Jungle", "Mid Lane", "Gold Lane", "Roam"];
    const dataA = { "EXP Lane": {}, Jungle: {}, "Mid Lane": {}, "Gold Lane": {}, Roam: {} };
    const dataB = { "EXP Lane": {}, Jungle: {}, "Mid Lane": {}, "Gold Lane": {}, Roam: {} };

    Object.entries(draftState).forEach(([mId, games]) => {
      const match = state.find((x) => x.id == parseInt(mId)); if (!match) return;
      games.forEach((g) => {
        if (compareMapFilter !== "All" && g.map !== compareMapFilter) return;
        let picksA = []; let winA = false;
        if (match.t1 === tA || TEAM_ABBR[match.t1] === tA) { picksA = g.t1Picks; winA = g.t1Result === "W"; }
        if (match.t2 === tA || TEAM_ABBR[match.t2] === tA) { picksA = g.t2Picks; winA = g.t2Result === "W"; }
        picksA.forEach((h, idx) => { if (h && idx < 5) { if (!dataA[roleMap[idx]][h]) dataA[roleMap[idx]][h] = { count: 0, wins: 0 }; dataA[roleMap[idx]][h].count++; if (winA) dataA[roleMap[idx]][h].wins++; } });
        let picksB = []; let winB = false;
        if (match.t1 === tB || TEAM_ABBR[match.t1] === tB) { picksB = g.t1Picks; winB = g.t1Result === "W"; }
        if (match.t2 === tB || TEAM_ABBR[match.t2] === tB) { picksB = g.t2Picks; winB = g.t2Result === "W"; }
        picksB.forEach((h, idx) => { if (h && idx < 5) { if (!dataB[roleMap[idx]][h]) dataB[roleMap[idx]][h] = { count: 0, wins: 0 }; dataB[roleMap[idx]][h].count++; if (winB) dataB[roleMap[idx]][h].wins++; } });
      });
    });
    const resultA = {}; const resultB = {};
    for (const role of roleMap) {
      resultA[role] = Object.entries(dataA[role]).map(([name, s]) => ({ name, count: s.count, wr: Math.round((s.wins / s.count) * 100) })).sort((a, b) => b.count - a.count);
      resultB[role] = Object.entries(dataB[role]).map(([name, s]) => ({ name, count: s.count, wr: Math.round((s.wins / s.count) * 100) })).sort((a, b) => b.count - a.count);
    }
    return { teamA: tA, teamB: tB, rolesA: resultA, rolesB: resultB };
  }, [compareTeamA, compareTeamB, compareMapFilter, draftState, state]);

  // --- NEW COMBO HISTORY LOGIC ---
  const comboSuggestions = useMemo(() => { let q = customComboInput.toLowerCase(); if (!q) return []; return allHeroes.filter((h) => h.toLowerCase().includes(q) && !customComboHeroes.includes(h)).slice(0, 5); }, [customComboInput, allHeroes, customComboHeroes]);

  const comboHistoryData = useMemo(() => {
    let total = 0, wins = 0, losses = 0;
    let byTeam = {};
    let byMap = {};
    const draftsGrouped = {};

    Object.entries(draftState).forEach(([mId, games]) => {
      const match = state.find((x) => x.id == parseInt(mId));
      if (!match) return;
      
      games.forEach((g, gIdx) => {
        if (comboMapFilter !== "All" && g.map !== comboMapFilter) return;

        const processSide = (teamStr, oppStr, picks, oppPicks, bans, oppBans, side, res) => {
          if (comboTeamFilter !== "All" && teamStr !== comboTeamFilter && TEAM_ABBR[teamStr] !== comboTeamFilter) return;
          if (comboSideFilter !== "All" && side !== comboSideFilter) return;

          const validPicks = picks.filter(Boolean);
          if (validPicks.length === 0) return;

          // Synergy Check
          const hasSynergy = customComboHeroes.length === 0 || customComboHeroes.every((h) => validPicks.includes(h));

          if (hasSynergy) {
            total++;
            if (res === "W") wins++;
            else if (res === "L") losses++;

            const tAbbr = TEAM_ABBR[teamStr] || teamStr;
            if (!byTeam[tAbbr]) byTeam[tAbbr] = { team: teamStr, wins: 0, losses: 0, total: 0 };
            byTeam[tAbbr].total++;
            if (res === "W") byTeam[tAbbr].wins++; else if (res === "L") byTeam[tAbbr].losses++;

            const mapName = g.map || "Unknown Map";
            if (!byMap[mapName]) byMap[mapName] = { wins: 0, losses: 0, total: 0 };
            byMap[mapName].total++;
            if (res === "W") byMap[mapName].wins++; else if (res === "L") byMap[mapName].losses++;

            // Grouping by exact 5-hero draft
            let paddedPicks = [...validPicks].sort();
            const key = paddedPicks.join("|");
            
            if (!draftsGrouped[key]) {
              draftsGrouped[key] = { picks: validPicks, total: 0, wins: 0, losses: 0, games: [] };
            }
            draftsGrouped[key].total++;
            if (res === "W") draftsGrouped[key].wins++; else if (res === "L") draftsGrouped[key].losses++;
            
            let validOppPicks = oppPicks.filter(Boolean);
            
            draftsGrouped[key].games.push({
              matchId: match.id,
              week: match.w,
              gameIndex: gIdx + 1,
              team: teamStr,
              opp: oppStr,
              side: side,
              res: res,
              oppPicks: validOppPicks,
              map: mapName
            });
          }
        };

        processSide(match.t1, match.t2, g.t1Picks, g.t2Picks, g.t1Bans, g.t2Bans, g.t1Side, g.t1Result);
        processSide(match.t2, match.t1, g.t2Picks, g.t1Picks, g.t2Bans, g.t1Bans, g.t2Side, g.t2Result);
      });
    });

    const sortedDrafts = Object.values(draftsGrouped).sort((a,b) => b.total - a.total);
    const sortedTeams = Object.values(byTeam).sort((a,b) => b.total - a.total);
    const sortedMaps = Object.entries(byMap).map(([map, s]) => ({ map, ...s, wr: (s.wins/s.total)*100 })).sort((a,b) => b.total - a.total);

    return {
      total, wins, losses, wr: total > 0 ? (wins/total)*100 : 0,
      byTeam: sortedTeams,
      byMap: sortedMaps,
      drafts: sortedDrafts
    };
  }, [draftState, comboTeamFilter, comboMapFilter, comboSideFilter, customComboHeroes, state]);

  const initBaseState = async () => {
    let tempState = []; officialMatchesRef.current = []; let currentId = 1;
    
    // MPL KH Auto-Generate Single Round Robin Schedule (10 teams) if CSV misses unplayed games
    let tempSchedule = []; let mIdCounter = 1; const tKeys = Object.keys(TM);
    for(let i=0; i<tKeys.length; i++){
      for(let j=i+1; j<tKeys.length; j++){
        let w = Math.ceil(mIdCounter / 5);
        let wObj = tempSchedule.find(x => x.w === w);
        if(!wObj) { wObj = {w, m:[]}; tempSchedule.push(wObj); }
        wObj.m.push([tKeys[i], tKeys[j]]);
        mIdCounter++;
      }
    }
    tempSchedule.forEach((wf) => { wf.m.forEach((match) => { tempState.push({ id: currentId++, w: wf.w, t1: TM[match[0]] || match[0], t2: TM[match[1]] || match[1], s1: 0, s2: 0, fixed: false, _csvParsed: false }); }); });

    try {
      const noCacheUrl = SPREADSHEET_API_URL + (SPREADSHEET_API_URL.includes("?") ? "&" : "?") + "nocache=" + new Date().getTime();
      const response = await fetch(noCacheUrl, { cache: "no-store" });
      if (response.ok) {
        const csvText = await response.text();
        const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l);
        let currentWeek = 1;

        for (let i = 0; i < lines.length; i++) {
          const rawTokens = lines[i].split(",").map((t) => t.replace(/^"|"$/g, "").trim());
          
          if (rawTokens[0] && rawTokens[0].toUpperCase().startsWith("WEEK")) {
            let wMatch = rawTokens[0].match(/WEEK\s*([1-9])/i);
            if (wMatch) currentWeek = parseInt(wMatch[1]);
            continue;
          }
          
          if (rawTokens[1] === "Tim 1" || rawTokens[3] === "VS" || rawTokens.length < 5) continue;

          const findTeam = (inputStr) => {
            if (!inputStr) return null; let up = inputStr.toUpperCase();
            let teamNamesMap = [
              { key: "SYS", names: ["SYS", "SEE YOU SOON"] },
              { key: "FLKH", names: ["FL", "FLKH", "FLASH", "TEAM FLASH KH", "BURN", "BXF"] },
              { key: "CFU", names: ["CFU", "CFU GAMING"] },
              { key: "PRO", names: ["PRO", "PRO ESPORTS", "PRO E-SPORTS"] },
              { key: "DUCK", names: ["DUCK", "DUCK RICE", "DMS"] },
              { key: "GXL", names: ["GXL", "GL", "GALAXY", "GALAXY LEGENDS"] },
              { key: "VAL", names: ["VAL", "VALHALLA"] },
              { key: "EEE", names: ["EEE", "EVIL EYE ESPORTS", "EVIL EYE"] },
              { key: "GXP", names: ["GXP", "GALAXY PHOENIX"] },
              { key: "VA", names: ["VA", "VIGOR APEX", "VIGOR"] }
            ];
            for (let t of teamNamesMap) { if (t.names.some((name) => up.includes(name))) return TM[t.key]; } return null;
          };
          
          let weekCol = parseInt(rawTokens[0]);
          if (!isNaN(weekCol)) currentWeek = weekCol;

          let t1Str = findTeam(rawTokens[1]);
          let t2Str = findTeam(rawTokens[5]);
          let s1 = parseInt(rawTokens[2]);
          let s2 = parseInt(rawTokens[4]);
          let status = rawTokens[6] ? rawTokens[6].toUpperCase() : "";
          
          if (t1Str && t2Str) {
            let targetMatch = tempState.find((m) => (m.t1 === t1Str && m.t2 === t2Str) || (m.t1 === t2Str && m.t2 === t1Str));
            if (!targetMatch) {
              targetMatch = { id: currentId++, w: currentWeek, t1: t1Str, t2: t2Str, s1: 0, s2: 0, fixed: false, _csvParsed: true };
              tempState.push(targetMatch);
            } else {
              targetMatch.w = currentWeek;
            }
            if (!isNaN(s1) && !isNaN(s2) && (s1 > 0 || s2 > 0 || status === "SELESAI")) {
                targetMatch._csvParsed = true; 
                if (targetMatch.t1 === t1Str) { targetMatch.s1 = s1; targetMatch.s2 = s2; } else { targetMatch.s1 = s2; targetMatch.s2 = s1; } 
                targetMatch.fixed = targetMatch.s1 >= 2 || targetMatch.s2 >= 2 || status === "SELESAI";
            }
          }
        }
      }
    } catch (err) { console.error("Gagal meload CSV dari Spreadsheet", err); }
    
    tempState.forEach((m) => { if (typeof m.s1 === "number" && typeof m.s2 === "number" && (m.s1 > 0 || m.s2 > 0 || m.fixed)) { officialMatchesRef.current.push({ id: m.id, s1: m.s1, s2: m.s2, fixed: m.fixed }); } delete m._csvParsed; });
    setState(tempState); let tempProbs = {}; TEAMS.forEach((t) => (tempProbs[t] = { upper: 0, playin: 0, playoff: 0, elim: 0 })); setProbs(tempProbs); determineCurrentWeek(tempState);
  };

  const determineCurrentWeek = (currentState = state) => { 
    let unplayedMatch = currentState.find((m) => m.s1 === 0 && m.s2 === 0 && !m.fixed); 
    let week = unplayedMatch ? unplayedMatch.w : Math.max(...currentState.map((m) => m.w)); 
    setCurWeek(week); 
    scrollToActiveWeek(week); 
  };

  const scrollToActiveWeek = (targetWeek = curWeek) => { setTimeout(() => { const container = document.getElementById("weekNavScroll"); const activeBtn = document.getElementById("week-btn-" + targetWeek); if (container && activeBtn) { const scrollLeft = activeBtn.offsetLeft - container.clientWidth / 2 + activeBtn.clientWidth / 2; container.scrollTo({ left: scrollLeft, behavior: "smooth" }); } }, 100); };
  
  const updateSync = (msg, color) => { setSyncStatus(msg); setSyncColor(color); };

  const getProb = (team, type) => parseFloat(probs[team]?.[type] || 0);
  const getEmptyFormArray = (len) => Array(Math.max(0, 5 - len)).fill(0);
  const getMatchesByFixed = (fixed) => displayMatches.filter((m) => m.fixed === fixed);
  const handleSort = (col) => { if (sortCol === col) setSortAsc(!sortAsc); else { setSortCol(col); setSortAsc(col === "default"); } };
  const sortHero = (col) => { if (heroSortCol === col) setHeroSortAsc(!heroSortAsc); else { setHeroSortCol(col); setHeroSortAsc(false); } };

  const toggleHighlight = (teamName) => { if (highlightedTeam === teamName) setHighlightedTeam(null); else setHighlightedTeam(teamName); setFocusFilter("all"); if (!highlightedTeam) setTimeout(() => scrollToActiveWeek(curWeek), 300); };
  const changeWeek = (w) => { setCurWeek(w); scrollToActiveWeek(w); };
  const onDropdownScore = (event) => { let val = parseInt(event.val); setState((s) => s.map((m) => { if (m.id === event.id && !m.fixed) { let newM = { ...m }; if (event.team === 1) { newM.s1 = val; if (val === 2 && newM.s2 === 2) newM.s2 = 0; } else { newM.s2 = val; if (val === 2 && newM.s1 === 2) newM.s1 = 0; } return newM; } return m; }) ); };
  const clearMatch = (id) => { setState((s) => s.map((m) => (m.id === id && !m.fixed ? { ...m, s1: 0, s2: 0 } : m))); };
  const clearCurrentWeek = () => { setState((s) => s.map((m) => (m.w === curWeek && !m.fixed ? { ...m, s1: 0, s2: 0 } : m))); };
  const randomizeCurrentWeek = () => { setState((s) => s.map((m) => { if (!m.fixed && m.w === curWeek && m.s1 === 0 && m.s2 === 0) { let win = Math.random() > 0.5; let clean = Math.random() > 0.5; return { ...m, s1: win ? 2 : clean ? 0 : 1, s2: win ? (clean ? 0 : 1) : 2 }; } return m; }) ); };
  const randomizeRemaining = () => { setState((s) => s.map((m) => { if (!m.fixed && m.s1 === 0 && m.s2 === 0) { let win = Math.random() > 0.5; let clean = Math.random() > 0.5; return { ...m, s1: win ? 2 : clean ? 0 : 1, s2: win ? (clean ? 0 : 1) : 2 }; } return m; }) ); insightCacheRef.current = {}; };
  const resetSim = () => { setState((s) => s.map((m) => (!m.fixed ? { ...m, s1: 0, s2: 0 } : m))); insightCacheRef.current = {}; determineCurrentWeek(); };

  const saveLocalScenario = (slotNum) => { const dataToSave = state.filter((m) => !m.fixed).map((m) => ({ id: m.id, s1: m.s1, s2: m.s2 })); localStorage.setItem(`mpl_kh_scenario_slot_${slotNum}`, JSON.stringify(dataToSave)); triggerToast(`Prediksi berhasil disimpan ke Slot ${slotNum}`); };
  const loadLocalScenario = (slotNum) => { const savedStr = localStorage.getItem(`mpl_kh_scenario_slot_${slotNum}`); if (savedStr) { const savedData = JSON.parse(savedStr); setState((s) => s.map((m) => { const sm = savedData.find((x) => x.id === m.id); return sm && !m.fixed ? { ...m, s1: sm.s1, s2: sm.s2 } : m; })); triggerToast(`Memuat Skenario dari Slot ${slotNum}`); } else { triggerToast(`Slot ${slotNum} masih kosong!`, true); } };

  const triggerToast = (msg, isError = false) => { setToastMsg(msg); setIsToastError(isError); setShowToast(true); setTimeout(() => setShowToast(false), 3000); };

  const openDraftModal = (match) => setDraftModalMatch(match);
  const closeDraftModal = () => setDraftModalMatch(null);
  const openHeroDetail = (hero) => { setHeroDetailMapFilter("All"); setHeroDetailModal(hero); };
  const closeHeroDetail = () => setHeroDetailModal(null);
  const showPreview = (match, e) => { setHoveredMatchPreview(match); updatePreviewPos(e); };
  const updatePreviewPos = (e) => { let x = e.clientX - 480; if (x < 20) x = e.clientX + 30; let y = e.clientY - 150; if (y < 20) y = 20; setPreviewX(x); setPreviewY(y); };
  const hidePreview = () => setHoveredMatchPreview(null);

  const runSimulation = useCallback((currentState) => {
    if (!currentState || currentState.length === 0) return;
    const iterations = 20000; let counts = {}; TEAMS.forEach((t) => (counts[t] = { upper: 0, playin: 0, playoff: 0, elim: 0 }));
    let seed = getStateSeed(currentState); let seededRandom = mulberry32(seed);
    const teamIndices = {}; TEAMS.forEach((t, i) => (teamIndices[t] = i));
    
    const numTeams = TEAMS.length;
    const baseMw = new Int32Array(numTeams); const baseMl = new Int32Array(numTeams); const baseGw = new Int32Array(numTeams); const baseGl = new Int32Array(numTeams);
    const baseH2h = Array.from({ length: numTeams }, () => new Int32Array(numTeams)); const unplayed = [];

    for (let i = 0; i < currentState.length; i++) {
      const m = currentState[i]; if (!TEAM_ABBR[m.t1] || !TEAM_ABBR[m.t2]) continue;
      const t1 = teamIndices[m.t1]; const t2 = teamIndices[m.t2];
      if (m.s1 !== null && m.s2 !== null && (m.s1 === 2 || m.s2 === 2)) {
        baseGw[t1] += m.s1; baseGl[t1] += m.s2; baseGw[t2] += m.s2; baseGl[t2] += m.s1;
        if (m.s1 > m.s2) { baseMw[t1]++; baseMl[t2]++; baseH2h[t1][t2]++; } else if (m.s2 > m.s1) { baseMw[t2]++; baseMl[t1]++; baseH2h[t2][t1]++; }
      } else { unplayed.push({ t1, t2, curS1: m.s1 || 0, curS2: m.s2 || 0 }); }
    }

    const unplayedLen = unplayed.length; const simMw = new Int32Array(numTeams); const simGw = new Int32Array(numTeams); const simGl = new Int32Array(numTeams);
    const simH2h = new Int32Array(numTeams * numTeams); const baseH2hFlat = new Int32Array(numTeams * numTeams);
    for (let i = 0; i < numTeams; i++) for (let j = 0; j < numTeams; j++) baseH2hFlat[i * numTeams + j] = baseH2h[i][j];

    for (let iter = 0; iter < iterations; iter++) {
      const iterStandings = Array.from({length: numTeams}, (_, i) => i);
      for (let i = 0; i < numTeams; i++) { simMw[i] = baseMw[i]; simGw[i] = baseGw[i]; simGl[i] = baseGl[i]; }
      for (let i = 0; i < numTeams * numTeams; i++) simH2h[i] = baseH2hFlat[i];
      for (let i = 0; i < unplayedLen; i++) {
        const m = unplayed[i]; let s1 = m.curS1; let s2 = m.curS2;
        while (s1 < 2 && s2 < 2) { if (seededRandom() > 0.5) s1++; else s2++; }
        simGw[m.t1] += s1; simGl[m.t1] += s2; simGw[m.t2] += s2; simGl[m.t2] += s1;
        if (s1 > s2) { simMw[m.t1]++; simH2h[m.t1 * numTeams + m.t2]++; } else { simMw[m.t2]++; simH2h[m.t2 * numTeams + m.t1]++; }
      }
      iterStandings.sort((a, b) => {
        if (simMw[b] !== simMw[a]) return simMw[b] - simMw[a];
        const gdA = simGw[a] - simGl[a]; const gdB = simGw[b] - simGl[b]; if (gdB !== gdA) return gdB - gdA;
        const h2hDiff = simH2h[b * numTeams + a] - simH2h[a * numTeams + b]; if (h2hDiff !== 0) return h2hDiff;
        return TEAMS[a].localeCompare(TEAMS[b]);
      });
      for (let i = 0; i < numTeams; i++) {
        const teamName = TEAMS[iterStandings[i]];
        if (i < 2) counts[teamName].upper++; 
        if (i >= 2 && i < 6) counts[teamName].playin++;
        if (i < 6) counts[teamName].playoff++; 
        if (i >= 6) counts[teamName].elim++;
      }
    }
    let tempProbs = {};
    TEAMS.forEach((t) => { tempProbs[t] = { upper: ((counts[t].upper / iterations) * 100).toFixed(2), playin: ((counts[t].playin / iterations) * 100).toFixed(2), playoff: ((counts[t].playoff / iterations) * 100).toFixed(2), elim: ((counts[t].elim / iterations) * 100).toFixed(2) }; });
    setProbs(tempProbs);
  }, []);

  useEffect(() => {
    if (state.length > 0) { 
      setIsCalculating(true); 
      const timer = setTimeout(() => { runSimulation(state); setIsCalculating(false); }, 0); 
      return () => clearTimeout(timer); 
    } 
  }, [state, runSimulation]);

  const triggerAiInsight = async (teamName) => {
    let teamData = sortedList.find((t) => t.n === teamName); if (!teamData) return;
    let seed = getStateSeed(state); let cacheKey = `${teamName}-${seed}`;
    if (insightCacheRef.current[cacheKey]) { setCurrentAiInsight(insightCacheRef.current[cacheKey]); return; }
    setIsAiLoading(true); setCurrentAiInsight(null);
    
    const pPlayoff = parseFloat(probs[teamName]?.playoff || 0); let magicNum = null;
    if (pPlayoff !== 100 && pPlayoff !== 0) {
      let remaining = state.filter((m) => !m.fixed && (m.t1 === teamName || m.t2 === teamName)).length;
      for (let wins = 0; wins <= remaining; wins++) {
        let simState = state.map((m) => { if (m.fixed || (m.t1 !== teamName && m.t2 !== teamName)) return m; return { ...m }; });
        let teamMatches = simState.filter((m) => !m.fixed && m.s1 === 0 && m.s2 === 0 && (m.t1 === teamName || m.t2 === teamName));
        let filledIds = new Set();
        teamMatches.forEach((m, idx) => { let isHome = m.t1 === teamName; m.s1 = idx < wins ? (isHome ? 2 : 0) : isHome ? 0 : 2; m.s2 = idx < wins ? (isHome ? 0 : 2) : isHome ? 2 : 0; filledIds.add(m.id); });
        simState = simState.map((m) => m.s1 === 0 && m.s2 === 0 ? { ...m, s1: 1, s2: 2 } : m);
        let res = calculate(simState); if (res.findIndex((t) => t.n === teamName) < 6) { magicNum = wins; break; }
      }
      if (magicNum === null) magicNum = remaining;
    }

    let teamPicks = {}, teamBans = {}, oppBans = {}, teamCombos = {};
    Object.entries(filteredDraftState).forEach(([mId, games]) => {
      const match = state.find((x) => x.id == parseInt(mId)); if (!match) return;
      const isT1 = match.t1 === teamName; const isT2 = match.t2 === teamName; if (!isT1 && !isT2) return;
      games.forEach((g) => {
        let myPicks = isT1 ? g.t1Picks : g.t2Picks; let myBans = isT1 ? g.t1Bans : g.t2Bans; let opBans = isT1 ? g.t2Bans : g.t1Bans; let myRes = isT1 ? g.t1Result : g.t2Result;
        let validPicks = myPicks.filter((h) => h);
        validPicks.forEach((h) => { if (!teamPicks[h]) teamPicks[h] = { games: 0, wins: 0 }; teamPicks[h].games++; if (myRes === "W") teamPicks[h].wins++; });
        for (let i = 0; i < validPicks.length; i++) { for (let j = i + 1; j < validPicks.length; j++) { let combo = [validPicks[i], validPicks[j]].sort().join(" + "); teamCombos[combo] = (teamCombos[combo] || 0) + 1; } }
        myBans.filter((h) => h).forEach((h) => (teamBans[h] = (teamBans[h] || 0) + 1));
        opBans.filter((h) => h).forEach((h) => (oppBans[h] = (oppBans[h] || 0) + 1));
      });
    });

    const topPicks = Object.entries(teamPicks).sort((a, b) => b[1].games - a[1].games).slice(0, 4).map((x) => `${x[0]} (WR ${Math.round((x[1].wins / x[1].games) * 100)}%)`);
    const topBans = Object.entries(teamBans).sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => `${x[0]}`);
    const topOppBans = Object.entries(oppBans).sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => `${x[0]}`);
    const topCombos = Object.entries(teamCombos).sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => `${x[0]}`);
    const played = teamData.mw + teamData.ml; const remaining = 14 - played; 
    const remOpp = state.filter((m) => !m.fixed && m.s1 === 0 && m.s2 === 0 && (m.t1 === teamName || m.t2 === teamName)).map((m) => (m.t1 === teamName ? m.t2 : m.t1));
    const form5 = teamData.form.map((f) => f.res).join(""); const abbr = TEAM_ABBR[teamName] || teamName;
    
    let statusColor = "from-blue-900/60 to-slate-900/80 border-blue-600/40"; let statusLabel = `Peringkat ${teamData.trueRank}`;
    const pUpper = parseFloat(probs[teamName]?.upper || 0);
    if (pPlayoff === 100 && pUpper === 100) { statusColor = "from-amber-900/60 to-slate-900/80 border-amber-500/40"; statusLabel = "🔒 Upper Bracket"; } 
    else if (pPlayoff === 100) { statusColor = "from-emerald-900/60 to-slate-900/80 border-emerald-500/40"; statusLabel = "✅ Playoff Aman"; } 
    else if (pPlayoff === 0) { statusColor = "from-red-900/60 to-slate-900/80 border-red-500/40"; statusLabel = "❌ Tereliminasi"; } 
    else if (pPlayoff >= 75) { statusColor = "from-emerald-900/40 to-slate-900/80 border-emerald-600/30"; statusLabel = "🟢 Posisi Kuat"; } 
    else if (pPlayoff >= 40) { statusColor = "from-yellow-900/40 to-slate-900/80 border-yellow-600/30"; statusLabel = "🟡 Zona Bahaya"; } 
    else { statusColor = "from-red-900/40 to-slate-900/80 border-red-600/30"; statusLabel = "🔴 Butuh Keajaiban"; }
    
    let fallbackData = { abbr, rank: teamData.trueRank, mw: teamData.mw, ml: teamData.ml, remOppLength: remOpp.length, magicNum, pPlayoff, pUpper, pPlayin: probs[teamName]?.playin || 0, pElim: probs[teamName]?.elim || 0, form5, statusColor, statusLabel, teamName };
    
    setTimeout(() => {
      let texts = [];
      texts.push(`📊 Berada di peringkat ${teamData.trueRank} dengan rekor ${teamData.mw}W-${teamData.ml}L. Game diff ${teamData.gw - teamData.gl > 0 ? "+" : ""}${teamData.gw - teamData.gl}.`);
      if (pPlayoff === 100 && pUpper === 100) texts.push(`🏆 Upper Bracket TERKUNCI. Tim ini dipastikan mengamankan posisi Top 2 di klasemen regular season.`);
      else if (pPlayoff === 100) texts.push(`✅ Tiket Playoff AMAN. Posisi mereka sudah dipastikan aman dari kejaran tim di zona merah.`);
      else if (pPlayoff === 0) texts.push(`❌ Secara matematis sudah TERELIMINASI dari persaingan menuju babak Playoff musim ini.`);
      else if (magicNum !== null) texts.push(`🎯 Target Krusial: Membutuhkan minimal ${magicNum} kemenangan lagi dari sisa ${remOpp.length} match untuk mengamankan tiket Playoff.`);
      const wCount = (form5.match(/W/g) || []).length;
      if (wCount >= 4) texts.push(`📈 Momentum Positif: Sedang 'on-fire' dengan mengamankan ${wCount} kemenangan di 5 pertandingan terakhir mereka.`);
      else if (wCount <= 1 && form5.length >= 3) texts.push(`📉 Momentum Negatif: Sedang kesulitan form, hanya meraup ${wCount} kemenangan di 5 match terakhir. Butuh evaluasi segera.`);
      if (topPicks.length > 0) texts.push(`⚔️ Kunci kekuatan draft tim ini ada di hero andalan: ${topPicks.join(", ")}.`);
      if (topOppBans.length > 0) texts.push(`🛡️ Sangat diwaspadai, lawan hampir selalu melakukan Targeted Ban terhadap hero: ${topOppBans.join(", ")}.`);
      if (topCombos.length > 0) texts.push(`🔥 Synergy Draft: Sinergi terkuat yang sering mereka kombinasikan adalah ${topCombos.join(", ")}.`);
      insightCacheRef.current[cacheKey] = { ...fallbackData, texts: texts.slice(0, 5) };
      setCurrentAiInsight(insightCacheRef.current[cacheKey]);
      setIsAiLoading(false);
    }, 600);
  };

  const hideComboDropdownWithDelay = () => { setTimeout(() => setShowComboDropdown(false), 200); };
  const addComboHero = (hero) => { if (customComboHeroes.length < 5 && !customComboHeroes.includes(hero)) { setCustomComboHeroes((arr) => [...arr, hero]); } setCustomComboInput(""); setShowComboDropdown(false); };
  const removeComboHero = (hero) => { setCustomComboHeroes((arr) => arr.filter((h) => h !== hero)); };

  const insightSections = [
    { title: "Top Meta (Impact)", data: analyticsInsights.topMeta, val: h=>h.impact+' pts', color: 'orange', bCol: 'orange-500', bgCol: 'orange-900', tCol: 'orange-400' },
    { title: "Hidden Gems (High WR)", data: analyticsInsights.hiddenGems, val: h=>h.w_rate+'% WR', color: 'emerald', bCol: 'emerald-500', bgCol: 'emerald-900', tCol: 'emerald-400' },
  ];

  useEffect(() => {
    const container = weekNavRef.current;
    if (!container) return;
    const handleWheel = (e) => {
      if (e.deltaY !== 0) { e.preventDefault(); container.scrollLeft += e.deltaY; }
    };
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [activeTab, highlightedTeam]);

  useEffect(() => { 
    setTeamLogos(FALLBACK_LOGOS); 
    initBaseState().finally(() => { 
      setTimeout(() => { 
        setIsAppReady(true); 
      }, 500); 
    }); 
  }, []);

  return (
    <>
      <style>{`
        .host-wrapper { font-family: 'Inter', sans-serif; }
        .animate-fade-in { animation: fadeIn 0.2s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #475569; }
        .liqui-table { border-collapse: collapse; font-size: 12px; }
        .liqui-table th { font-weight: bold; padding: 8px; }
        .liqui-row-even { background-color: #161616; }
        .liqui-row-odd { background-color: #111111; }
        .rank-playoff { background-color: #1e4a2e; color: white; border-right: 1px solid #333; }
        .rank-eliminated { background-color: #5c1c1c; color: white; border-right: 1px solid #333; }
        .team-link { color: #66b2ff; text-decoration: none; font-weight: 500; transition: all 0.2s; cursor: pointer; }
        .team-link:hover { text-decoration: underline; color: #99ccff; }
        .bg-prob-cell { position: relative; z-index: 1; }
        .prob-bar { position: absolute; top: 0; bottom: 0; left: 0; z-index: -1; opacity: 0.2; transition: width 0.3s ease; }
        .toast-container { transition: visibility 0s, opacity 0.3s ease-in-out, transform 0.3s ease-in-out; transform: translate(-50%, -20px); visibility: hidden; opacity: 0; }
        .toast-show { visibility: visible; opacity: 1; transform: translate(-50%, 0); }
        .solid-sticky-header { background-color: #0d121c; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
      `}</style>

      {!isAppReady && (
        <div className="fixed inset-0 z-[9999] bg-[#0b0f1a] flex flex-col items-center justify-center">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 animate-ping"></div>
            <div className="absolute inset-2 rounded-full border-2 border-blue-400/40 animate-ping" style={{ animationDelay: "0.2s" }}></div>
            <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-[0_0_30px_rgba(59,130,246,0.6)] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
          </div>
          <div className="mt-8 text-blue-400 font-bold tracking-widest animate-pulse text-sm">Menyinkronkan Database...</div>
        </div>
      )}

      <div className={`host-wrapper text-slate-100 min-h-screen pb-12 relative bg-[#0b0f1a] font-sans ${!isAppReady ? "opacity-0" : "opacity-100 transition-opacity duration-1000"}`}>
        <div className="bg-[#0c0c0c] border-b border-[#333] sticky top-0 z-[100] shadow-xl">
          <div className="max-w-[1400px] mx-auto px-4 flex justify-between items-center">
            <div className="flex">
              <button onClick={() => switchTab("standings")} className={`px-4 md:px-6 py-4 font-black uppercase tracking-wider text-xs md:text-sm transition-all border-b-2 flex items-center gap-2 ${activeTab === "standings" ? "border-blue-500 text-blue-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg> Standings
              </button>
              <button onClick={() => switchTab("analytics")} className={`px-4 md:px-6 py-4 font-black uppercase tracking-wider text-xs md:text-sm transition-all border-b-2 flex items-center gap-2 ${activeTab === "analytics" ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg> Hero Statistics
              </button>
            </div>
          </div>
        </div>
        
        <div className={`fixed top-5 left-1/2 text-white px-6 py-3 rounded-full shadow-2xl font-bold z-[10000] pointer-events-none flex items-center gap-2 toast-container ${showToast ? "toast-show" : ""} ${isToastError ? "bg-red-600" : "bg-emerald-600"}`}>
          <span>{toastMsg}</span>
        </div>

        <div className="max-w-[1400px] mx-auto px-4 pt-6">
          {activeTab === "standings" && (
            <>
              <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-center md:text-left">
                  <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic flex items-center justify-center md:justify-start gap-3">
                    MPL CAMBODIA <span className="text-blue-500">PREDICTOR</span>
                  </h1>
                  <p className="text-slate-400 font-medium mt-1">Simulasi Skenario & AI Analisis Klasemen</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 bg-slate-800/50 p-2 rounded-2xl border border-slate-700">
                  <div className="px-4 py-2 border-r border-slate-700 flex flex-col justify-center">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest">Data Master</span>
                    <span className={`font-bold text-sm ${syncColor}`}>{syncStatus}</span>
                  </div>
                  <div className="relative group z-[60]">
                    <button className="bg-slate-800 border border-slate-600 hover:bg-indigo-600 text-slate-200 hover:text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm">Skenario ▾</button>
                    <div className="absolute left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-0 mt-2 w-[220px] bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all overflow-hidden z-[100]">
                      <div className="p-2.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest border-b border-slate-700 bg-slate-900/80 text-center">Simpan Skenario</div>
                      <div className="p-3 flex flex-wrap justify-center gap-2 border-b border-slate-700 bg-slate-800">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((slot) => (
                          <button key={slot} onClick={() => saveLocalScenario(slot)} className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-emerald-500 hover:text-white font-black text-xs transition-all">{slot}</button>
                        ))}
                      </div>
                      <div className="p-2.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest border-b border-slate-700 bg-slate-900/80 text-center">Muat Skenario</div>
                      <div className="p-3 flex flex-wrap justify-center gap-2 bg-slate-800">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((slot) => (
                          <button key={slot} onClick={() => loadLocalScenario(slot)} className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-blue-500 hover:text-white font-black text-xs transition-all">{slot}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button onClick={randomizeRemaining} className="bg-slate-800 border border-slate-600 hover:bg-purple-600 text-slate-200 hover:text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm">Auto-Fill Semua</button>
                  <button onClick={resetSim} className="bg-slate-800 border border-slate-600 hover:bg-red-600 text-slate-200 hover:text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm">Reset</button>
                </div>
              </header>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:h-[560px]">
                <div className="lg:col-span-7 border border-[#333] rounded-3xl bg-[#111] shadow-2xl flex flex-col h-full overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#333] bg-[#0c0c0c] shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-black text-white tracking-wide uppercase">Regular Season</h2>
                      {isCalculating && (
                        <div className="flex items-center justify-center p-1" title="Menghitung...">
                          <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col justify-between overflow-x-auto overflow-y-hidden bg-[#111]">
                    <div className="w-full">
                      <table className="liqui-table text-left whitespace-nowrap w-full">
                        <thead>
                          <tr>
                            <th className="w-8 text-center cursor-pointer hover:bg-[#333]" onClick={() => handleSort("default")}># <span className="text-[10px] text-blue-400">{sortCol === "default" ? (sortAsc ? "▲" : "▼") : ""}</span></th>
                            <th>Team</th>
                            <th className="text-center w-12">M</th>
                            <th className="text-center w-12">G</th>
                            <th className="text-center w-12">Diff</th>
                            <th className="text-center w-24">Form</th>
                            <th className="text-center text-[11px] text-emerald-400 w-14 cursor-pointer" onClick={() => handleSort("playoff")}>Playoff {sortCol === "playoff" ? (sortAsc ? "▲" : "▼") : ""}</th>
                            <th className="text-center text-[11px] text-amber-500 w-14 cursor-pointer" onClick={() => handleSort("upper")}>Upper {sortCol === "upper" ? (sortAsc ? "▲" : "▼") : ""}</th>
                            <th className="text-center text-[11px] text-blue-400 w-14 cursor-pointer" onClick={() => handleSort("playin")}>Play In {sortCol === "playin" ? (sortAsc ? "▲" : "▼") : ""}</th>
                            <th className="text-center text-[11px] text-red-500 w-14 cursor-pointer" onClick={() => handleSort("elim")}>Elim {sortCol === "elim" ? (sortAsc ? "▲" : "▼") : ""}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedList.map((t, i) => (
                            <tr key={t.n} className={`border-b border-[#333] transition-colors ${i % 2 === 0 ? "liqui-row-even" : "liqui-row-odd"} ${highlightedTeam === t.n ? "ring-2 ring-blue-500 ring-inset bg-blue-900/20" : "hover:bg-[#2a2a2a]"} ${highlightedTeam && highlightedTeam !== t.n ? "opacity-40 grayscale hover:grayscale-0 hover:opacity-100" : ""}`}>
                              <td className={`text-center font-bold text-[14px] py-1.5 ${t.trueRank > 6 ? "rank-eliminated" : "rank-playoff"}`}>{t.trueRank}.</td>
                              <td className="py-1.5 px-2 flex items-center gap-2 min-w-[130px]">
                                {teamLogos[t.n] ? ( <img src={teamLogos[t.n]} className="w-6 h-6 object-contain shrink-0" /> ) : ( <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black shrink-0 bg-slate-800">{TEAM_ABBR[t.n] ? TEAM_ABBR[t.n].substring(0,3) : t.n.substring(0, 3).toUpperCase()}</div> )}
                                <div className="flex items-center">
                                  <span onClick={() => toggleHighlight(t.n)} className={`team-link cursor-pointer ${highlightedTeam === t.n ? "text-yellow-400 font-black" : ""}`}>{t.n}</span>
                                  {getProb(t.n, "upper") === 100 && <span className="text-[10px] text-amber-500 font-black ml-1 bg-amber-500/20 px-1 rounded">[U]</span>}
                                  {getProb(t.n, "upper") !== 100 && getProb(t.n, "playoff") === 100 && <span className="text-[10px] text-emerald-500 font-black ml-1 bg-emerald-500/20 px-1 rounded">[P]</span>}
                                  {getProb(t.n, "playoff") === 0 && <span className="text-[10px] text-red-500 font-black ml-1 bg-red-500/20 px-1 rounded">[E]</span>}
                                </div>
                              </td>
                              <td className="py-1.5 px-2 text-center font-bold text-white">{t.mw} - {t.ml}</td>
                              <td className="py-1.5 px-2 text-center text-gray-300">{t.gw} - {t.gl}</td>
                              <td className={`py-1.5 px-2 text-center font-bold ${t.gw - t.gl > 0 ? "text-white" : t.gw - t.gl < 0 ? "text-red-400" : "text-gray-400"}`}>{t.gw - t.gl > 0 ? "+" : ""}{t.gw - t.gl}</td>
                              <td className="py-1.5 px-1 text-center whitespace-nowrap">
                                <div className="flex gap-1 justify-center items-center min-w-[105px]">
                                  {getEmptyFormArray(t.form.length).map((_, idx) => ( <div key={`empty-${idx}`} className="w-[18px] h-[18px] rounded-full bg-slate-700/50 flex items-center justify-center text-[9px] text-slate-500 border border-slate-600/50 shrink-0">-</div> ))}
                                  {t.form.map((fMatch, idx) => teamLogos[fMatch.opp] ? ( <img key={idx} src={teamLogos[fMatch.opp]} className={`w-[18px] h-[18px] rounded-full object-contain bg-slate-800 shrink-0 ${fMatch.res === "W" ? "ring-1 ring-emerald-500 border border-emerald-900" : "ring-1 ring-red-500 border border-red-900"}`} title={`${fMatch.res} vs ${fMatch.opp}`} /> ) : ( <div key={idx} className={`w-[18px] h-[18px] rounded-full bg-slate-800 flex items-center justify-center text-[8px] font-black text-white shrink-0 ${fMatch.res === "W" ? "ring-1 ring-emerald-500 border border-emerald-900" : "ring-1 ring-red-500 border border-red-900"}`}>{TEAM_ABBR[fMatch.opp] ? TEAM_ABBR[fMatch.opp].substring(0,3) : fMatch.opp.substring(0, 3).toUpperCase()}</div> ))}
                                </div>
                              </td>
                              <td className="py-1.5 px-1.5 text-center text-[12px] font-semibold text-emerald-400 border-l border-[#333] bg-prob-cell"><div className="prob-bar bg-emerald-500" style={{ width: `${getProb(t.n, "playoff")}%` }}></div>{getProb(t.n, "playoff")}%</td>
                              <td className="py-1.5 px-1.5 text-center text-[12px] font-semibold text-amber-500 bg-prob-cell"><div className="prob-bar bg-amber-500" style={{ width: `${getProb(t.n, "upper")}%` }}></div>{getProb(t.n, "upper")}%</td>
                              <td className="py-1.5 px-1.5 text-center text-[12px] font-semibold text-blue-400 bg-prob-cell"><div className="prob-bar bg-blue-500" style={{ width: `${getProb(t.n, "playin")}%` }}></div>{getProb(t.n, "playin")}%</td>
                              <td className="py-1.5 px-1.5 text-center text-[12px] font-semibold text-red-500 bg-prob-cell"><div className="prob-bar bg-red-500" style={{ width: `${getProb(t.n, "elim")}%` }}></div>{getProb(t.n, "elim")}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-5 bg-slate-800/60 backdrop-blur-md rounded-3xl border border-slate-700 shadow-2xl flex flex-col h-[550px] md:h-[600px] lg:h-full overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-700 bg-[#121826] shrink-0 flex items-center justify-between gap-4 h-[60px]">
                    <div id="weekNavScroll" ref={weekNavRef} className="flex gap-2 overflow-x-auto scrollbar-hide flex-1">
                      {highlightedTeam ? (
                        <div onClick={() => toggleHighlight(highlightedTeam)} className="bg-blue-900/40 text-blue-300 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-between gap-2 border border-blue-500/50 w-full cursor-pointer hover:bg-red-900/40 hover:border-red-500/50 hover:text-red-300 transition-all" title="Klik untuk membatalkan mode fokus">
                          <span>Fokus: {TEAM_ABBR[highlightedTeam] || highlightedTeam}</span><span className="text-[10px] uppercase font-black tracking-widest opacity-70">✕ Tutup</span>
                        </div>
                      ) : (
                        [...new Set(state.map(m => m.w))].sort((a,b)=>a-b).map((w) => (
                          <button key={w} id={`week-btn-${w}`} onClick={() => changeWeek(w)} className={`px-4 py-1.5 rounded-xl border text-xs font-black transition-all shrink-0 ${w === curWeek ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40 border-blue-500" : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"}`}>W{w}</button>
                        ))
                      )}
                    </div>
                    {!highlightedTeam && (
                      <div className="flex items-center gap-2 border-l border-slate-700 pl-4">
                        <button onClick={randomizeCurrentWeek} className="bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white border border-purple-500/30 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap transition-all" title="Acak Semua Match di Minggu Ini">Acak W{curWeek}</button>
                        <button onClick={clearCurrentWeek} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap transition-all" title="Reset Semua Match di Minggu Ini">Clear W{curWeek}</button>
                      </div>
                    )}
                  </div>
                  <div id="matchScrollArea" className="flex-1 overflow-y-auto relative scroll-smooth bg-[#0b0f1a]/30 p-5 flex flex-col">
                    {highlightedTeam ? (
                      <>
                        <div className="bg-[#121826] border border-slate-700 p-5 rounded-3xl mb-6 shadow-xl relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
                            <div className="flex items-center gap-4">
                              {teamLogos[highlightedTeam] ? <img src={teamLogos[highlightedTeam]} className="w-14 h-14 object-contain drop-shadow-xl" /> : <div className="w-14 h-14 bg-slate-800 rounded flex items-center justify-center font-black text-white">{TEAM_ABBR[highlightedTeam] ? TEAM_ABBR[highlightedTeam].substring(0,3) : highlightedTeam.substring(0,3).toUpperCase()}</div>}
                              <div>
                                <div className="text-[10px] text-blue-400 font-bold tracking-widest uppercase mb-1 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div> Mode Fokus</div>
                                <h2 className="text-3xl font-black text-white uppercase tracking-tight">{TEAM_ABBR[highlightedTeam] || highlightedTeam}</h2>
                              </div>
                            </div>
                            <div className="flex gap-3 w-full sm:w-auto">
                              <div className="flex-1 sm:flex-none text-center bg-[#0b0f1a]/80 backdrop-blur px-4 py-2 rounded-xl border border-slate-700 shadow-inner">
                                <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Match W-L</div>
                                <div className="text-lg font-black text-white">{focusStats.mWin} - {focusStats.mLose} <span className="text-emerald-400 text-xs ml-1 font-bold">({focusStats.mWR}%)</span></div>
                              </div>
                              <div className="flex-1 sm:flex-none text-center bg-[#0b0f1a]/80 backdrop-blur px-4 py-2 rounded-xl border border-slate-700 shadow-inner">
                                <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Game W-L</div>
                                <div className="text-lg font-black text-white">{focusStats.gWin} - {focusStats.gLose} <span className="text-emerald-400 text-xs ml-1 font-bold">({focusStats.gWR}%)</span></div>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-5 pt-4 border-t border-slate-700/60 relative z-10">
                            <button onClick={() => setFocusFilter("all")} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${focusFilter === "all" ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-500" : "bg-slate-800/80 text-slate-400 hover:bg-slate-700 border border-slate-700"}`}>Semua</button>
                            <button onClick={() => setFocusFilter("win")} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${focusFilter === "win" ? "bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-500" : "bg-slate-800/80 text-slate-400 hover:bg-slate-700 border border-slate-700"}`}>Win</button>
                            <button onClick={() => setFocusFilter("lose")} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${focusFilter === "lose" ? "bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] border border-red-500" : "bg-slate-800/80 text-slate-400 hover:bg-slate-700 border border-slate-700"}`}>Lose</button>
                          </div>
                        </div>
                        {getMatchesByFixed(true).length > 0 && (
                          <>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Riwayat Pertandingan</h3>
                            {getMatchesByFixed(true).map((m) => ( <MatchCard key={m.id} m={m} highlightedTeam={highlightedTeam} teamLogos={teamLogos} clearMatch={clearMatch} openDraftModal={openDraftModal} showPreview={showPreview} updatePreviewPos={updatePreviewPos} hidePreview={hidePreview} onDropdownScore={onDropdownScore} /> ))}
                          </>
                        )}
                        {getMatchesByFixed(false).length > 0 && focusFilter === "all" && (
                          <>
                            <h3 id="focus-upcoming-header" className="text-xs font-bold text-yellow-500 uppercase tracking-widest mb-3 mt-4 pt-4 border-t border-slate-700">Sisa Jadwal Pertandingan</h3>
                            {getMatchesByFixed(false).map((m) => ( <MatchCard key={m.id} m={m} highlightedTeam={highlightedTeam} teamLogos={teamLogos} clearMatch={clearMatch} openDraftModal={openDraftModal} showPreview={showPreview} updatePreviewPos={updatePreviewPos} hidePreview={hidePreview} onDropdownScore={onDropdownScore} /> ))}
                          </>
                        )}
                        {displayMatches.length === 0 && <div className="text-center text-slate-500 py-10 font-bold border-2 border-dashed border-slate-700 rounded-2xl bg-slate-800/30">Tidak ada data untuk filter yang dipilih.</div>}
                      </>
                    ) : (
                      displayMatches.map((m) => ( <MatchCard key={m.id} m={m} highlightedTeam={highlightedTeam} teamLogos={teamLogos} clearMatch={clearMatch} openDraftModal={openDraftModal} showPreview={showPreview} updatePreviewPos={updatePreviewPos} hidePreview={hidePreview} onDropdownScore={onDropdownScore} /> ))
                    )}
                  </div>
                </div>
              </div>
              {highlightedTeam && currentAiInsight && (
                <div className="mt-6 w-full lg:w-7/12 transition-all duration-500">
                  <div className={`bg-gradient-to-br border rounded-2xl shadow-2xl overflow-hidden transition-all duration-500 ${currentAiInsight.statusColor}`}>
                    <div className="px-6 pt-5 pb-4 border-b border-slate-700/50 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-600/80 shadow-lg"><svg width="18" height="18" fill="none" stroke="white" strokeWidth="2.5"><path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg></div>
                        <div>
                          <h3 className="text-white font-black text-base flex items-center gap-2">Data Insight <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">✨ SYSTEM ANALYTICS</span></h3>
                          <p className="text-slate-400 text-xs mt-0.5">{currentAiInsight.abbr} · Rank {currentAiInsight.rank}</p>
                        </div>
                      </div>
                    </div>
                    <div className="px-6 pb-5 pt-4">
                      {isAiLoading ? (
                        <div className="space-y-2"><div className="h-3 bg-slate-700/60 rounded-full animate-pulse w-full"></div><div className="h-3 bg-slate-700/60 rounded-full animate-pulse w-4/5"></div></div>
                      ) : (
                        <div className="space-y-3">
                          {(currentAiInsight.texts || []).map((text, idx) => (
                            <div key={idx} className="flex gap-2.5 items-start">
                              <span className="shrink-0">{["📊", "⚔️", "🔥", "🎯"][idx] || "💡"}</span>
                              <p className="text-sm text-slate-300 leading-relaxed">{typeof text === "string" ? text : JSON.stringify(text)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          {activeTab === "analytics" && (
            <div className="animate-fade-in pb-8">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-4 gap-4">
                <div>
                  <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3"><span className="text-emerald-500">ADVANCED</span> ANALYTICS</h1>
                  <p className="text-slate-400 text-sm font-medium mt-1">Data Meta Hero & Signature Picks MPL CAMBODIA</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 bg-slate-800/80 p-2 rounded-xl border border-slate-700 w-full lg:w-auto shadow-inner">
                  <div className="relative flex-1 lg:w-48">
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input type="text" value={heroSearchQuery} onChange={updateSearch} placeholder="Cari hero..." className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-blue-500 font-bold" />
                  </div>
                  <select value={heroRoleFilter} onChange={updateRoleFilter} className="bg-slate-900 border border-slate-600 text-white rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-emerald-500 font-bold cursor-pointer outline-none">
                    <option value="All">All Roles</option>
                    {heroRoleKeys.map((role) => ( <option key={role} value={role}>{role}</option> ))}
                  </select>
                </div>
              </div>
              <div className="mb-8">
                <h3 className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2 flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg> Map Overview Filter</h3>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                  <button onClick={() => setHeroMapFilter("All")} className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm border ${heroMapFilter === "All" ? "bg-blue-600 text-white border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]" : "bg-[#111827] text-slate-400 border-slate-700 hover:bg-slate-800"}`}>🌍 Compare All Maps</button>
                  {MAP_LIST.map((m) => ( <button key={m} onClick={() => setHeroMapFilter(m)} className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm border ${heroMapFilter === m ? "bg-emerald-600 text-white border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "bg-[#111827] text-slate-400 border-slate-700 hover:bg-slate-800"}`}>📍 {m}</button> ))}
                </div>
              </div>
              {mapOverviewStats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-[#111827] to-[#0b0f19] border border-slate-700/50 p-4 rounded-2xl shadow-lg relative overflow-hidden group flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-4 -mt-4 transition-all group-hover:bg-blue-500/20"></div>
                    <div className="flex justify-between items-end relative z-10 border-b border-slate-700/50 pb-2 mb-2">
                      <div><span className="block text-[10px] text-slate-400 font-black uppercase tracking-widest">⏱️ Avg Time</span><span className="text-xl font-black text-white">{mapOverviewStats.avgDur}</span></div>
                      <div className="text-right"><span className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest">Matches</span><span className="text-sm font-black text-blue-400">{mapOverviewStats.totalGames}</span></div>
                    </div>
                    <div className="flex justify-between items-center relative z-10 text-[9px] font-bold"><span className="text-emerald-400">⚡ Fast: {mapOverviewStats.fastestDur}</span><span className="text-red-400">🐢 Long: {mapOverviewStats.longestDur}</span></div>
                  </div>
                  <div className="bg-gradient-to-br from-[#111827] to-[#0b0f19] border border-slate-700/50 p-4 rounded-2xl shadow-lg relative overflow-hidden group flex flex-col justify-center">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -mr-4 -mt-4 transition-all group-hover:bg-purple-500/20"></div>
                    <h4 className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-3 text-center relative z-10">Blue Side vs Red Side WR</h4>
                    <div className="flex justify-between items-center px-2 relative z-10"><span className="text-blue-400 font-black text-xl">{mapOverviewStats.bWr}%</span><span className="text-slate-600 text-xs font-black">VS</span><span className="text-red-400 font-black text-xl">{mapOverviewStats.rWr}%</span></div>
                  </div>
                  <div className="bg-gradient-to-br from-[#111827] to-[#0b0f19] border border-slate-700/50 p-4 rounded-2xl shadow-lg relative overflow-hidden group flex items-center justify-between">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl -mr-4 -mt-4 transition-all group-hover:bg-orange-500/20"></div>
                    <div className="relative z-10"><h4 className="text-[10px] text-orange-400 font-black uppercase tracking-widest mb-1">🔥 Most Picked</h4><div className="text-xl font-black text-white leading-tight truncate w-[90px]">{mapOverviewStats.topPick.name || "-"}</div><div className="text-[10px] font-bold text-slate-400">{mapOverviewStats.topPick.count} Picks</div></div>
                    {mapOverviewStats.topPick.name && <img src={getHeroIcon(mapOverviewStats.topPick.name)} className="w-12 h-12 rounded-lg border border-orange-500/50 object-cover shadow-lg relative z-10" />}
                  </div>
                  <div className="bg-gradient-to-br from-[#111827] to-[#0b0f19] border border-slate-700/50 p-4 rounded-2xl shadow-lg relative overflow-hidden group flex items-center justify-between">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl -mr-4 -mt-4 transition-all group-hover:bg-red-500/20"></div>
                    <div className="relative z-10"><h4 className="text-[10px] text-red-400 font-black uppercase tracking-widest mb-1">🚫 Most Banned</h4><div className="text-xl font-black text-white leading-tight truncate w-[90px]">{mapOverviewStats.topBan.name || "-"}</div><div className="text-[10px] font-bold text-slate-400">{mapOverviewStats.topBan.count} Bans</div></div>
                    {mapOverviewStats.topBan.name && <img src={getHeroIcon(mapOverviewStats.topBan.name)} className="w-12 h-12 rounded-lg border border-red-500/50 object-cover grayscale shadow-lg relative z-10" />}
                  </div>
                </div>
              )}
              {mapAssistant && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 animate-fade-in">
                  <div className="bg-[#111827] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                    <div className="px-5 py-3 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                      <h3 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg> Draft Assistant</h3>
                      <span className="text-[9px] bg-blue-900/50 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30 uppercase tracking-widest font-black">{heroMapFilter === "All" ? "Global" : heroMapFilter}</span>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-4 flex-1">
                      <div className="space-y-3">
                        <div className="text-[10px] text-emerald-400 font-black uppercase tracking-widest border-b border-emerald-900/50 pb-1.5 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Recommended Picks</div>
                        {mapAssistant.recPicks.map((h) => (
                          <div key={h.name} className="flex items-center gap-2 group cursor-pointer" onClick={() => openHeroDetail(h.name)}><img src={getHeroIcon(h.name)} className="w-7 h-7 rounded-lg border border-emerald-500/30 object-cover group-hover:scale-110 transition-transform" /><div><div className="text-xs font-bold text-slate-200">{h.name}</div><div className="text-[9px] text-emerald-400">{h.w_rate}% WR ({h.picks} Picks)</div></div></div>
                        ))}
                      </div>
                      <div className="space-y-3 border-l border-slate-700 pl-4">
                        <div className="text-[10px] text-red-400 font-black uppercase tracking-widest border-b border-red-900/50 pb-1.5 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Recommended Bans</div>
                        {mapAssistant.recBans.map((h) => (
                          <div key={h.name} className="flex items-center gap-2 group cursor-pointer" onClick={() => openHeroDetail(h.name)}><img src={getHeroIcon(h.name)} className="w-7 h-7 rounded-lg border border-red-500/30 object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-transform" /><div><div className="text-xs font-bold text-slate-200">{h.name}</div><div className="text-[9px] text-red-400">{h.bans} Bans</div></div></div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#111827] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                    <div className="px-5 py-3 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                      <h3 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> Map Tier List</h3>
                    </div>
                    <div className="p-5 flex flex-col gap-4 flex-1 justify-center">
                      {[ { label: "S", data: mapAssistant.sTier, color: "yellow-400", to: "orange-500", border: "yellow-300", blur: "rgba(250,204,21,0.4)" }, { label: "A", data: mapAssistant.aTier, color: "slate-400", to: "slate-600", border: "slate-300", blur: "rgba(148,163,184,0.4)" } ].map((t) => (
                        <div key={t.label} className="flex items-center gap-3 bg-[#0b0f1a] border border-slate-700/50 rounded-xl p-2.5 shadow-inner">
                          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-${t.color} to-${t.to} flex items-center justify-center text-white font-black text-xl shadow-[0_0_10px_${t.blur}] shrink-0 border border-${t.border}/50`}>{t.label}</div>
                          <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1 py-1">
                            {t.data.map((h) => ( <div key={h.name} className="relative group cursor-pointer shrink-0" onClick={() => openHeroDetail(h.name)}><img src={getHeroIcon(h.name)} className={`w-10 h-10 rounded border-2 border-${t.color}/80 object-cover hover:scale-110 transition-all shadow-md`} title={h.name} /></div> ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-6">
                <div className="xl:col-span-8 flex flex-col gap-6">
                  <div className="bg-[#111827] border border-slate-700 rounded-3xl p-5 shadow-2xl relative">
                    <div className="flex justify-between items-start mb-4 gap-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-black text-white uppercase flex items-center gap-2"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg> Hero Quadrant</h3>
                          <select value={quadrantMapFilter} onChange={(e) => setQuadrantMapFilter(e.target.value)} className="bg-slate-800 border border-slate-600 text-slate-300 rounded py-1 px-2 text-[10px] focus:outline-none focus:border-blue-500 font-bold cursor-pointer outline-none">
                            <option value="All">Semua Map</option>
                            {MAP_LIST.map((m) => (<option key={m} value={m}>{m}</option>))}
                          </select>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-1">Y: Win Rate (%) | X: Pick+Ban Presence (%)</p>
                      </div>
                      <div className="flex gap-3 text-[9px] font-bold uppercase tracking-widest pt-1"><span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-orange-500"></div> Meta</span><span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-emerald-500"></div> Gem</span><span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-red-500"></div> Over</span></div>
                    </div>
                    <div className="relative w-full h-[320px] sm:h-[400px] bg-[#0b0f1a] border border-slate-700/50 rounded-xl overflow-hidden shadow-inner">
                      <div className="absolute top-0 right-0 w-[60%] h-[50%] bg-orange-500/5 border-l border-b border-orange-500/20 border-dashed"><span className="absolute top-2 right-2 text-[10px] font-black text-orange-500/40 uppercase tracking-widest">Meta Dominant</span></div>
                      <div className="absolute top-0 left-0 w-[40%] h-[50%] bg-emerald-500/5 border-b border-emerald-500/20 border-dashed"><span className="absolute top-2 left-2 text-[10px] font-black text-emerald-500/40 uppercase tracking-widest">Hidden Gem</span></div>
                      <div className="absolute bottom-0 right-0 w-[60%] h-[50%] bg-red-500/5 border-l border-red-500/20 border-dashed"><span className="absolute bottom-2 right-2 text-[10px] font-black text-red-500/40 uppercase tracking-widest">Overrated</span></div>
                      <div className="absolute bottom-0 left-0 w-[40%] h-[50%] bg-slate-500/5"><span className="absolute bottom-2 left-2 text-[10px] font-black text-slate-500/40 uppercase tracking-widest">Niche / Weak</span></div>
                      <div className="absolute bottom-[50%] left-0 w-full border-b border-slate-600 border-dashed opacity-50"></div>
                      <div className="absolute left-[40%] top-0 h-full border-r border-slate-600 border-dashed opacity-50"></div>
                      {quadrantHeroData.filter((h) => h.pb_rate > 0).map((h) => (
                        <div key={h.name} className="absolute w-5 h-5 sm:w-7 sm:h-7 -ml-2.5 -mb-2.5 sm:-ml-3.5 sm:-mb-3.5 cursor-pointer hover:z-50 group" style={{ left: `${h.pb_rate > 95 ? 95 : h.pb_rate < 2 ? 2 : h.pb_rate}%`, bottom: `${h.w_rate > 95 ? 95 : h.w_rate < 2 ? 2 : h.w_rate}%` }} onClick={() => openHeroDetail(h.name)}>
                          <div className={`w-full h-full rounded-full border-2 transition-transform duration-200 group-hover:scale-[1.8] shadow-md relative z-10 ${getDotColor(h.label)}`}><img src={getHeroIcon(h.name)} className="w-full h-full rounded-full object-cover" /></div>
                          <div className={`absolute hidden group-hover:block bg-[#0f141e]/95 backdrop-blur-md border border-slate-600 text-white text-[10px] px-3 py-2 rounded-lg shadow-xl whitespace-nowrap z-[100] pointer-events-none ${h.w_rate > 80 ? "top-full mt-2 sm:mt-3" : "bottom-full mb-2 sm:mb-3"} ${h.pb_rate < 20 ? "left-0" : h.pb_rate > 80 ? "right-0" : "left-1/2 -translate-x-1/2"}`}>
                            <span className="font-black text-blue-400 text-xs block mb-0.5">{h.name}</span>
                            <span className="font-bold text-slate-300">WR: <span className={h.w_rate >= 50 ? "text-emerald-400" : "text-red-400"}>{h.w_rate}%</span></span> | <span className="font-bold text-slate-300"> P+B: <span className="text-orange-400">{h.pb_rate}%</span></span>
                            <div className={`text-[8px] uppercase tracking-widest mt-1 font-black ${getLabelTextColor(h.label)}`}>{h.label}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-[#111827] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-700 bg-[#0c0c0c] flex justify-between items-center"><h3 className="text-lg font-black text-white uppercase tracking-wide">Data Matrix</h3><span className="text-xs text-slate-400 font-bold">{filteredHeroData.length} Hero Ditampilkan</span></div>
                    <div className="overflow-x-auto overflow-y-auto w-full relative max-h-[500px]">
                      <table className="liqui-table text-left whitespace-nowrap w-full min-w-[900px]">
                        <thead className="bg-[#1a1a1a] sticky top-0 z-20 shadow-sm">
                          <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-[#333]">
                            <th className="w-8 text-center" onClick={() => sortHero("name")}>#</th>
                            <th className="w-40 cursor-pointer hover:bg-[#333]" onClick={() => sortHero("name")}>Hero</th>
                            <th className="cursor-pointer hover:bg-[#333] border-r border-[#333]" onClick={() => sortHero("role")}>Role</th>
                            <th className="text-center cursor-pointer hover:bg-[#333]" onClick={() => sortHero("picks")}>Picks</th>
                            <th className="text-center cursor-pointer hover:bg-[#333]" onClick={() => sortHero("bans")}>Bans</th>
                            <th className="text-center cursor-pointer hover:bg-[#333]" onClick={() => sortHero("pb_rate")}>Presence</th>
                            <th className="text-center cursor-pointer hover:bg-[#333]" onClick={() => sortHero("w_rate")}>Win Rate</th>
                            <th className="text-center cursor-pointer hover:bg-[#333] border-l border-[#333]" onClick={() => sortHero("impact")}>Impact</th>
                            <th className="text-center cursor-pointer hover:bg-[#333]" onClick={() => sortHero("label")}>Tier Label</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredHeroData.map((h, i) => (
                            <tr key={h.name} className={`border-b border-slate-800/50 hover:bg-[#2a2a2a] cursor-pointer ${i % 2 === 0 ? "liqui-row-even" : "liqui-row-odd"}`} onClick={() => openHeroDetail(h.name)}>
                              <td className="text-center font-bold text-slate-500 py-2">{i + 1}</td>
                              <td className="py-2 px-2 flex items-center gap-3"><img src={getHeroIcon(h.name)} className="w-8 h-8 object-cover rounded shadow-md border border-slate-700" /><span className="font-bold text-slate-200">{h.name}</span></td>
                              <td className="py-2 px-2 text-[10px] font-bold text-slate-400 border-r border-[#333]">{h.role}</td>
                              <td className="text-center font-bold text-white">{h.picks}</td><td className="text-center font-bold text-red-400">{h.bans}</td>
                              <td className="text-center font-bold text-orange-400 bg-orange-900/5">{h.pb_rate}%</td>
                              <td className={`text-center font-black ${h.w_rate >= 50 ? (h.w_rate >= 60 ? "text-emerald-400 bg-emerald-900/10" : "text-emerald-500") : "text-red-400"}`}>{h.w_rate}%</td>
                              <td className="text-center font-black text-blue-400 border-l border-[#333] bg-blue-900/5">{h.impact}</td>
                              <td className="text-center px-2 py-2"><span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${getLabelBadgeColor(h.label)}`}>{h.label}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="xl:col-span-4 flex flex-col gap-6">
                  <div className="bg-[#111827] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-full">
                    <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 px-5 py-4 border-b border-slate-700"><h3 className="text-lg font-black text-white uppercase flex items-center gap-2"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg> Meta Analysis</h3></div>
                    <div className="p-5 space-y-6">
                      {insightSections.map((s) => (
                        <div key={s.title}>
                          <h4 className={`text-xs font-black text-${s.color}-400 uppercase tracking-widest border-b border-slate-700 pb-2 mb-3 flex items-center gap-1.5`}><div className={`w-1.5 h-1.5 rounded-full bg-${s.color}-500`}></div> {s.title}</h4>
                          <div className="space-y-2.5">
                            {s.data.map((h) => (
                              <div key={h.name} className="flex items-center justify-between group cursor-pointer" onClick={() => openHeroDetail(h.name)}>
                                <div className="flex items-center gap-2.5"><img src={getHeroIcon(h.name)} className={`w-6 h-6 rounded border border-${s.bCol}/30 object-cover group-hover:scale-110 transition-transform`} /><span className={`text-xs font-bold text-slate-200 group-hover:text-${s.tCol} transition-colors`}>{h.name}</span></div>
                                <div className={`text-[10px] font-black text-${s.tCol} bg-${s.bgCol}/20 px-1.5 py-0.5 rounded`}>{s.val(h)}</div>
                              </div>
                            ))}
                            {s.data.length === 0 && <span className="text-xs text-slate-500">Belum ada data</span>}
                          </div>
                        </div>
                      ))}
                      <div>
                        <h4 className="text-xs font-black text-red-400 uppercase tracking-widest border-b border-slate-700 pb-2 mb-3 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Priority Bans</h4>
                        <div className="flex flex-wrap gap-2">
                          {analyticsInsights.mustBan.map((h) => (
                            <div key={h.name} className="relative group cursor-pointer" onClick={() => openHeroDetail(h.name)} title={`${h.name} - ${h.bans} Bans`}><img src={getHeroIcon(h.name)} className="w-8 h-8 rounded border border-red-500/50 object-cover grayscale hover:grayscale-0 transition-all shadow-sm hover:scale-110" /><span className="absolute -bottom-1 -right-1 bg-red-600 text-[8px] font-black text-white px-1 rounded-sm">{h.bans}</span></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6 mb-6">
                <div className="bg-[#111827] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                  <div className="px-5 py-4 border-b border-slate-700 bg-slate-800/50 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3">
                    <h3 className="text-base font-black text-white uppercase tracking-wide flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> Combo Synergy & Custom Draft</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <select value={comboTeamFilter} onChange={(e) => setComboTeamFilter(e.target.value)} className="bg-slate-800 border border-slate-600 text-slate-300 rounded py-1 px-2 text-[11px] focus:outline-none focus:border-blue-500 font-bold cursor-pointer outline-none tracking-normal">
                        <option value="All">Semua Tim</option>
                        {TEAMS.map((t) => (<option key={t} value={t}>{TEAM_ABBR[t] || t}</option>))}
                      </select>
                      <select value={comboMapFilter} onChange={(e) => setComboMapFilter(e.target.value)} className="bg-slate-800 border border-slate-600 text-slate-300 rounded py-1 px-2 text-[11px] focus:outline-none focus:border-blue-500 font-bold cursor-pointer outline-none tracking-normal">
                        <option value="All">Semua Map</option>
                        {MAP_LIST.map((m) => (<option key={m} value={m}>{m}</option>))}
                      </select>
                      <select value={comboSideFilter} onChange={(e) => setComboSideFilter(e.target.value)} className="bg-slate-800 border border-slate-600 text-slate-300 rounded py-1 px-2 text-[11px] focus:outline-none focus:border-blue-500 font-bold cursor-pointer outline-none tracking-normal">
                        <option value="All">Semua Side</option>
                        <option value="blue">Blue Side</option>
                        <option value="red">Red Side</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-12">
                    <div className="xl:col-span-5 p-5 border-b xl:border-b-0 xl:border-r border-slate-700/80 bg-[#0b0f1a]/30 flex flex-col">
                      <div className="flex flex-col gap-4">
                        <div className="relative w-full z-50">
                          <input type="text" placeholder="Cari & Filter hero untuk melihat history sinergi (Maks 5)..." value={customComboInput} onChange={(e) => { setCustomComboInput(e.target.value); setShowComboDropdown(true); }} onFocus={() => setShowComboDropdown(true)} onBlur={hideComboDropdownWithDelay} className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg py-2 pl-3 pr-8 text-xs focus:outline-none focus:border-blue-500 font-bold shadow-inner" />
                          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                          {showComboDropdown && comboSuggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl overflow-hidden z-[100]">
                              {comboSuggestions.map((h) => ( <div key={h} className="px-3 py-2 text-xs font-bold text-slate-200 hover:bg-blue-600 cursor-pointer flex items-center gap-2 transition-colors" onClick={() => addComboHero(h)}><img src={getHeroIcon(h)} className="w-5 h-5 rounded object-cover border border-slate-600" /> {h}</div> ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 flex-1 items-center min-h-[32px]">
                          {customComboHeroes.map((h) => (
                            <div key={h} className="bg-slate-800 border border-slate-600 rounded-lg pr-2 flex items-center gap-2 animate-fade-in group shadow-sm"><img src={getHeroIcon(h)} className="w-8 h-8 rounded-l-lg object-cover" /><span className="text-xs font-bold text-white tracking-wide">{h}</span><button onClick={() => removeComboHero(h)} className="text-slate-400 hover:text-red-400 font-black text-xs ml-1 outline-none">✕</button></div>
                          ))}
                          {customComboHeroes.length === 0 && <span className="text-xs text-slate-500 italic font-bold">Menampilkan seluruh history draft...</span>}
                        </div>
                      </div>
                      
                      {comboHistoryData.total > 0 && (
                        <>
                          <div className="mt-4 flex gap-4 bg-slate-800/60 p-3 rounded-xl border border-blue-900/50 shadow-inner items-center animate-fade-in">
                            <div className="flex-1 text-center border-r border-slate-700/80"><div className="text-[9px] uppercase font-black tracking-widest text-slate-400 mb-0.5">Win Rate</div><div className={`text-xl font-black ${comboHistoryData.wr >= 50 ? "text-emerald-400" : "text-red-400"}`}>{comboHistoryData.wr.toFixed(1)}%</div></div>
                            <div className="flex-1 text-center border-r border-slate-700/80"><div className="text-[9px] uppercase font-black tracking-widest text-slate-400 mb-0.5">Total Match</div><div className="text-xl font-black text-white">{comboHistoryData.total}</div></div>
                            <div className="flex-1 text-center"><div className="text-[9px] uppercase font-black tracking-widest text-slate-400 mb-0.5">W - L</div><div className="text-xl font-black"><span className="text-emerald-400">{comboHistoryData.wins}</span> <span className="text-slate-600 text-sm font-normal mx-1">vs</span> <span className="text-red-400">{comboHistoryData.losses}</span></div></div>
                          </div>
                          
                          {customComboHeroes.length > 0 && (
                            <div className="mt-4 border-t border-slate-700/50 pt-3 animate-fade-in">
                              <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2">🛡️ Tim Pengguna Sinergi Ini</div>
                              <div className="flex flex-wrap gap-2">
                                 {comboHistoryData.byTeam.map(t => (
                                    <div key={t.team} className="flex items-center gap-2 bg-slate-800/80 px-2 py-1.5 rounded-lg border border-slate-700 shadow-sm cursor-pointer hover:bg-slate-700" onClick={() => setComboTeamFilter(t.team)}>
                                       {teamLogos[t.team] ? <img src={teamLogos[t.team]} className="w-5 h-5 object-contain" /> : <div className="w-5 h-5 bg-slate-700 rounded flex items-center justify-center font-black text-[8px]">{t.team.substring(0,2)}</div>}
                                       <span className="text-xs font-bold text-slate-200">{TEAM_ABBR[t.team] || t.team}</span>
                                       <span className={`text-[10px] font-black ${t.wins/t.total >= 0.5 ? 'text-emerald-400' : 'text-red-400'}`}>{t.wins}W - {t.losses}L</span>
                                    </div>
                                 ))}
                              </div>
                            </div>
                          )}

                          {comboHistoryData.byMap.length > 0 && (
                            <div className="mt-4 border-t border-slate-700/50 pt-3 animate-fade-in">
                              <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2 flex items-center gap-1">📍 Map Performance</div>
                              <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1 custom-scrollbar">
                                {comboHistoryData.byMap.map((m) => (
                                  <div key={m.map} className="flex justify-between items-center text-xs bg-slate-800/40 px-3 py-1.5 rounded">
                                    <span className="text-blue-300 font-bold truncate flex-1">{m.map}</span>
                                    <div className="flex items-center gap-3 shrink-0"><span className={`font-black ${m.wr >= 50 ? "text-emerald-400" : "text-red-400"}`}>{m.wr.toFixed(0)}%</span><span className="text-[9px] text-slate-500 w-12 text-right">{m.wins}W - {m.losses}L</span></div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="xl:col-span-7 p-5 relative z-10 bg-[#0b0f1a] overflow-hidden flex flex-col h-[600px]">
                      <h4 className="text-xs font-black text-white uppercase tracking-widest border-b border-slate-700 pb-2 mb-3 shrink-0 flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        📜 History Full Draft 
                        {customComboHeroes.length > 0 && <span className="text-[9px] text-blue-400 border border-blue-500/30 bg-blue-900/30 px-1.5 py-0.5 rounded ml-2">Filtered Synergy</span>}
                      </h4>
                      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                        {comboHistoryData.drafts.map((draft, idx) => (
                            <div key={idx} className="bg-[#121826] border border-slate-700 rounded-xl overflow-hidden shadow-lg animate-fade-in">
                                <div className="bg-slate-800/80 p-3 border-b border-slate-700 flex justify-between items-center">
                                    <div className="flex gap-1.5">
                                        {draft.picks.map(p => (
                                          <img key={p} src={getHeroIcon(p)} className={`w-8 h-8 rounded border object-cover cursor-pointer hover:scale-110 transition-transform ${customComboHeroes.includes(p) ? 'border-yellow-400 ring-1 ring-yellow-400/50 shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'border-slate-600'}`} onClick={() => openHeroDetail(p)} title={p} />
                                        ))}
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-sm font-black ${(draft.wins/draft.total)>=0.5 ? 'text-emerald-400' : 'text-red-400'}`}>{((draft.wins/draft.total)*100).toFixed(0)}% WR</div>
                                        <div className="text-[9px] font-bold text-slate-400">{draft.total}x Match</div>
                                    </div>
                                </div>
                                <div className="p-2 space-y-2">
                                    {draft.games.map((g, i) => (
                                        <div key={i} className="flex justify-between items-center bg-slate-800/30 p-2 rounded border border-slate-700/50 text-xs">
                                            <div className="flex items-center gap-2 w-1/3 shrink-0">
                                                {teamLogos[g.team] ? <img src={teamLogos[g.team]} className="w-5 h-5 object-contain" /> : <div className="w-5 h-5 bg-slate-700 rounded text-[8px] flex items-center justify-center font-black">{g.team.substring(0,2)}</div>}
                                                <span className="font-bold text-slate-300 hidden sm:block">{TEAM_ABBR[g.team] || g.team}</span>
                                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest ${g.side==='blue' ? 'bg-blue-900/50 text-blue-400 border border-blue-500/30' : 'bg-red-900/50 text-red-400 border border-red-500/30'}`}>{g.side}</span>
                                            </div>
                                            <div className="flex flex-col items-center w-1/3 shrink-0 text-center">
                                                <span className="text-[9px] font-black text-slate-500 tracking-widest">W{g.week} / M{g.matchId} / G{g.gameIndex}</span>
                                                <span className={`text-[10px] font-black mt-0.5 ${g.res==='W' ? 'text-emerald-400' : 'text-red-400'}`}>{g.res === 'W' ? 'WIN' : 'LOSE'} <span className="text-slate-500 font-bold ml-0.5">vs {TEAM_ABBR[g.opp] || g.opp}</span></span>
                                            </div>
                                            <div className="flex gap-1 justify-end w-1/3 shrink-0 flex-wrap sm:flex-nowrap">
                                                {g.oppPicks.map(op => <img key={op} src={getHeroIcon(op)} className="w-5 h-5 sm:w-6 sm:h-6 rounded border border-slate-600 object-cover opacity-80 hover:opacity-100 cursor-pointer" onClick={() => openHeroDetail(op)} title={`Lawan: ${op}`} />)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {comboHistoryData.drafts.length === 0 && (
                          <div className="text-center text-slate-500 font-bold py-10">Belum ada history draft untuk kombinasi dan filter ini.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-[#111827] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden mb-8">
                <div className="px-5 py-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                  <h3 className="text-base font-black text-white uppercase tracking-wide flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> Team Signatures</h3>
                  <button onClick={() => setShowCompareModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-lg"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 3h5v5" /><path d="M21 3 9 15" /><path d="M8 3H3v5" /><path d="M3 3l12 12" /><path d="M21 21h-5v-5" /><path d="M21 21 9 9" /><path d="M8 21H3v-5" /><path d="M3 21l12-12" /></svg> Compare Teams</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-5">
                  {teamSignatures.map((ts) => (
                    <div key={ts.team} className="bg-[#0b0f1a] border border-slate-700/50 rounded-2xl p-4 shadow-lg flex flex-col justify-between group">
                      <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-3 cursor-pointer hover:bg-slate-800/50 p-2 rounded-xl transition-colors" onClick={() => { setTeamSigMapFilter("All"); setTeamSignatureModal(ts.team); }}>
                        {teamLogos[ts.team] ? <img src={teamLogos[ts.team]} className="w-7 h-7 object-contain drop-shadow-md" /> : <div className="w-7 h-7 bg-slate-700 rounded flex items-center justify-center font-black text-[10px]">{ts.abbr}</div>}
                        <span className="font-black text-slate-100 text-sm tracking-widest uppercase">{ts.abbr}</span>
                        <span className="text-[10px] text-blue-400 font-bold ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">Detail ↗</span>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <div className="text-[9px] text-emerald-400 font-black uppercase mb-2 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Most Picked</div>
                          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                            {ts.picks.map((h) => (
                              <div key={h.name} className="relative shrink-0 cursor-pointer flex flex-col items-center gap-1.5" onClick={() => openHeroDetail(h.name)} title={`${h.name} dipick ${h.count} kali sebagai ${h.role}`}>
                                <div className="relative"><img src={getHeroIcon(h.name)} className="w-10 h-10 rounded-xl border border-emerald-500/30 object-cover shadow-sm hover:border-emerald-400 hover:scale-105 transition-all" /><span className="absolute -top-2 -right-2 bg-emerald-600 text-[9px] font-black text-white w-5 h-5 flex items-center justify-center rounded-full shadow border border-[#0b0f1a]">{h.count}</span></div>
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-600 w-full text-center">{h.role}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] text-red-400 font-black uppercase mb-2 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Most Banned</div>
                          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                            {ts.bans.map((h) => (
                              <div key={h.name} className="relative shrink-0 cursor-pointer flex flex-col items-center gap-1.5" onClick={() => openHeroDetail(h.name)} title={`${h.name} diban ${h.count} kali`}>
                                <div className="relative"><img src={getHeroIcon(h.name)} className="w-10 h-10 rounded-xl border border-red-500/30 object-cover shadow-sm grayscale hover:grayscale-0 hover:border-red-400 hover:scale-105 transition-all" /><span className="absolute -top-2 -right-2 bg-red-600 text-[9px] font-black text-white w-5 h-5 flex items-center justify-center rounded-full shadow border border-[#0b0f1a]">{h.count}</span></div>
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 w-full text-center">BAN</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* COMPARE TEAMS MODAL */}
      {showCompareModal && teamCompareData && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1f2e] border border-slate-700 rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-fade-in relative">
            <div className="bg-[#0f141e] px-6 py-4 border-b border-slate-700 flex flex-wrap justify-between items-center shrink-0 gap-4">
              <div className="flex items-center gap-4 flex-1"><h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">⚔️ COMPARE <span className="text-blue-400">HERO POOL</span></h2><div className="h-6 w-px bg-slate-700 hidden sm:block"></div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Map Filter:</span>
                  <select value={compareMapFilter} onChange={(e) => setCompareMapFilter(e.target.value)} className="bg-slate-900 border border-slate-600 text-white rounded py-1 px-2 text-xs focus:outline-none focus:border-blue-500 font-bold cursor-pointer outline-none"><option value="All">Semua Map</option>{MAP_LIST.map((m) => (<option key={m} value={m}>{m}</option>))}</select>
                </div>
              </div>
              <button onClick={() => setShowCompareModal(false)} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-all text-slate-400">X</button>
            </div>
            <div className="bg-[#111827] px-4 sm:px-6 py-4 border-b border-slate-700 flex justify-between items-center sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-3 w-[40%]">
                {teamLogos[compareTeamA] ? <img src={teamLogos[compareTeamA]} className="w-10 h-10 object-contain drop-shadow-md hidden sm:block" /> : <div className="w-10 h-10 bg-slate-700 rounded flex items-center justify-center font-black hidden sm:flex">{TEAM_ABBR[compareTeamA]}</div>}
                <select value={compareTeamA} onChange={(e) => setCompareTeamA(e.target.value)} className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-500 font-black uppercase cursor-pointer">{TEAMS.map((t) => ( <option key={t} value={t}>{TEAM_ABBR[t] || t}</option> ))}</select>
              </div>
              <div className="w-[15%] text-center text-slate-500 font-black text-xl sm:text-2xl italic tracking-tighter">VS</div>
              <div className="flex items-center gap-3 w-[40%] justify-end">
                <select value={compareTeamB} onChange={(e) => setCompareTeamB(e.target.value)} className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-red-500 font-black uppercase text-right cursor-pointer" dir="rtl">{TEAMS.map((t) => ( <option key={t} value={t}>{TEAM_ABBR[t] || t}</option> ))}</select>
                {teamLogos[compareTeamB] ? <img src={teamLogos[compareTeamB]} className="w-10 h-10 object-contain drop-shadow-md hidden sm:block" /> : <div className="w-10 h-10 bg-slate-700 rounded flex items-center justify-center font-black hidden sm:flex">{TEAM_ABBR[compareTeamB]}</div>}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0b0f1a] space-y-4 custom-scrollbar">
              {["EXP Lane", "Jungle", "Mid Lane", "Gold Lane", "Roam"].map((role) => (
                <div key={role} className="bg-[#111827] border border-slate-700/50 rounded-2xl flex overflow-hidden shadow-lg min-h-[120px]">
                  <div className="flex-1 p-3 sm:p-4 flex flex-wrap content-start gap-2 justify-end bg-blue-900/5 border-r border-slate-700/30">
                    {(teamCompareData.rolesA[role] || []).map((h) => (
                      <div key={h.name} className="relative group cursor-pointer flex flex-col items-center gap-0.5" onClick={() => openHeroDetail(h.name)} title={`${h.name} - Picked ${h.count}x (${h.wr}% WR)`}>
                        <div className="relative">
                          <img src={getHeroIcon(h.name)} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 border-blue-500/30 object-cover shadow-sm group-hover:border-blue-400 group-hover:scale-110 transition-all" />
                          <span className="absolute -top-1.5 -left-1.5 bg-blue-600 text-[9px] font-black text-white w-4 h-4 flex items-center justify-center rounded-full shadow border border-[#111827]">{h.count}</span>
                        </div>
                        <span className={`text-[8px] font-black tracking-widest px-1 rounded shadow-sm border ${h.wr >= 50 ? "text-emerald-400 bg-emerald-900/40 border-emerald-500/30" : "text-red-400 bg-red-900/40 border-red-500/30"}`}>{h.wr}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="w-20 sm:w-28 bg-slate-800 flex flex-col justify-center items-center shrink-0 shadow-inner px-2"><span className="text-[9px] sm:text-xs font-black uppercase tracking-widest text-slate-300 text-center">{role}</span></div>
                  <div className="flex-1 p-3 sm:p-4 flex flex-wrap content-start gap-2 justify-start bg-red-900/5 border-l border-slate-700/30">
                    {(teamCompareData.rolesB[role] || []).map((h) => (
                      <div key={h.name} className="relative group cursor-pointer flex flex-col items-center gap-0.5" onClick={() => openHeroDetail(h.name)} title={`${h.name} - Picked ${h.count}x (${h.wr}% WR)`}>
                        <div className="relative">
                          <img src={getHeroIcon(h.name)} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 border-red-500/30 object-cover shadow-sm group-hover:border-red-400 group-hover:scale-110 transition-all" />
                          <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-[9px] font-black text-white w-4 h-4 flex items-center justify-center rounded-full shadow border border-[#111827]">{h.count}</span>
                        </div>
                        <span className={`text-[8px] font-black tracking-widest px-1 rounded shadow-sm border ${h.wr >= 50 ? "text-emerald-400 bg-emerald-900/40 border-emerald-500/30" : "text-red-400 bg-red-900/40 border-red-500/30"}`}>{h.wr}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
