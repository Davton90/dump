import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

// --- CONSTANTS & HELPERS (Identical) ---
const CUSTOM_FIREBASE_CONFIG = { apiKey: "AIzaSyC6sj2eCAbg-IZTUYHxbSzEnAnUfba_gQ4", authDomain: "mpl-predictor-1ec.firebaseapp.com", projectId: "mpl-predictor-1ec", storageBucket: "mpl-predictor-1ec.firebasestorage.app", messagingSenderId: "224310331537", appId: "1:224310331537:web:4a5de42403b753b326d730" };
const CUSTOM_APP_ID = "mpl-draft-app-custom";
const SPREADSHEET_API_URL = "https://script.google.com/macros/s/AKfycbxczfPr7NShN7B8Tw1PPMOLFpLtF-SJ7XWIwOFLhmd3nlO6GqaPEcYTY2Iza4Aq5hWC/exec";
const TM = { 'ONIC': 'ONIC', 'BTR': 'Bigetron Vitality', 'EVOS': 'EVOS', 'DEWA': 'Dewa United Esports', 'TLID': 'Team Liquid ID', 'AE': 'Alter Ego', 'GEEK': 'Geek Fam ID', 'NAVI': 'Natus Vincere', 'RRQ': 'RRQ Hoshi' };
const TEAMS = Object.values(TM);
const TEAM_ABBR = { 'ONIC': 'ONIC', 'Bigetron Vitality': 'BTR', 'EVOS': 'EVOS', 'Dewa United Esports': 'DEWA', 'Team Liquid ID': 'TLID', 'Alter Ego': 'AE', 'Geek Fam ID': 'GEEK', 'Natus Vincere': 'NAVI', 'RRQ Hoshi': 'RRQ' };
const LOGO_COLORS = { 'ONIC': 'bg-yellow-400 text-black', 'Bigetron Vitality': 'bg-red-600 text-white', 'EVOS': 'bg-blue-600 text-white', 'Dewa United Esports': 'bg-black text-amber-400', 'Team Liquid ID': 'bg-blue-900 text-white', 'Alter Ego': 'bg-gray-800 text-white', 'Geek Fam ID': 'bg-red-800 text-white', 'Natus Vincere': 'bg-yellow-500 text-black', 'RRQ Hoshi': 'bg-orange-500 text-black' };
const FALLBACK_LOGOS = {
  'ONIC': 'https://i.imgur.com/wdQSIZa.png', 'Bigetron Vitality': 'https://i.imgur.com/E9W0qHf.png',
  'EVOS': 'https://i.imgur.com/lLE2NZA.png', 'Dewa United Esports': 'https://i.imgur.com/PTQ85rP.png',
  'Team Liquid ID': 'https://i.imgur.com/UxD4Qgd.png', 'Alter Ego': 'https://i.imgur.com/XxfnK7G.png',
  'Geek Fam ID': 'https://i.imgur.com/jQvLfiP.png', 'Natus Vincere': 'https://i.imgur.com/Av7GEqT.png',
  'RRQ Hoshi': 'https://i.imgur.com/03ZgNUW.png'
};
const historyRaw = [
  [1,1,'BTR','AE',2,1],[2,1,'NAVI','RRQ',2,0],[3,1,'EVOS','GEEK',2,0],[4,1,'AE','ONIC',0,2],
  [5,1,'TLID','NAVI',2,1],[6,1,'DEWA','BTR',2,0],[7,1,'EVOS','TLID',0,2],[8,1,'RRQ','ONIC',0,2],
  [9,2,'ONIC','GEEK',2,0],[10,2,'DEWA','NAVI',2,0],[11,2,'GEEK','BTR',2,0],[12,2,'AE','EVOS',2,1],
  [13,2,'TLID','DEWA',2,1],[14,2,'NAVI','AE',1,2],[15,2,'RRQ','TLID',0,2],[16,2,'BTR','EVOS',2,1],
  [17,3,'ONIC','DEWA',2,1],[18,3,'NAVI','EVOS',0,2],[19,3,'TLID','GEEK',0,2],[20,3,'ONIC','BTR',1,2],
  [21,3,'RRQ','AE',1,2],[22,3,'BTR','NAVI',1,2],[23,3,'GEEK','RRQ',2,1],[24,3,'AE','DEWA',0,2],
  [25,4,'NAVI','ONIC',0,2],[26,4,'EVOS','DEWA',2,0],[27,4,'TLID','BTR',1,2],[28,4,'RRQ','EVOS',0,2],
  [29,4,'GEEK','AE',1,2],[30,4,'ONIC','TLID',2,0],[31,4,'BTR','RRQ',2,1],[32,4,'DEWA','GEEK',2,0],
  [33,5,'GEEK','NAVI',0,2],[34,5,'EVOS','ONIC',0,2],[35,5,'DEWA','RRQ',2,0],[36,5,'AE','TLID',1,2],
  [37,5,'EVOS','BTR',0,2],[38,5,'AE','NAVI',2,1],[39,5,'GEEK','ONIC',2,1],[40,5,'DEWA','TLID',2,0]
];
const history = historyRaw.map(m => ({ id: m[0], w: m[1], t1: m[2], t2: m[3], s1: m[4], s2: m[5] }));
const schedule = [
  { w: 6, m: [['NAVI', 'DEWA'], ['AE', 'GEEK'], ['EVOS', 'AE'], ['TLID', 'ONIC'], ['RRQ', 'BTR'], ['NAVI', 'TLID'], ['ONIC', 'RRQ'], ['GEEK', 'EVOS']] },
  { w: 7, m: [['GEEK', 'DEWA'], ['BTR', 'TLID'], ['DEWA', 'AE'], ['EVOS', 'RRQ'], ['ONIC', 'NAVI'], ['RRQ', 'GEEK'], ['NAVI', 'BTR'], ['TLID', 'EVOS']] },
  { w: 8, m: [['BTR', 'GEEK'], ['DEWA', 'ONIC'], ['EVOS', 'NAVI'], ['TLID', 'RRQ'], ['ONIC', 'AE'], ['DEWA', 'EVOS'], ['AE', 'BTR'], ['RRQ', 'NAVI']] },
  { w: 9, m: [['BTR', 'DEWA'], ['TLID', 'AE'], ['GEEK', 'TLID'], ['AE', 'RRQ'], ['BTR', 'ONIC'], ['RRQ', 'DEWA'], ['ONIC', 'EVOS'], ['NAVI', 'GEEK']] }
];
const HERO_ROLES = {
  "EXP Lane": ["Aldous", "Alice", "Argus", "Arlott", "Badang", "Benedetta", "Chou", "Cici", "Dyrroth", "Edith", "Esmeralda", "Freya", "Gloo", "Guinevere", "Lapu-Lapu", "Lukas", "Masha", "Minsitthar", "Paquito", "Phoveus", "Ruby", "Silvanna", "Sora", "Sun", "Terizla", "Thamuz", "Uranus", "X.Borg", "Yu Zhong", "Zilong"],
  "Jungle": ["Aamon", "Alpha", "Alucard", "Aulus", "Balmond", "Bane", "Barats", "Baxia", "Fanny", "Fredrinn", "Gusion", "Hanzo", "Harley", "Hayabusa", "Helcurt", "Joy", "Julian", "Karina", "Lancelot", "Leomord", "Ling", "Martis", "Natalia", "Nolan", "Popol and Kupa", "Roger", "Saber", "Suyou", "Yi Sun-shin", "Yin"],
  "Mid Lane": ["Aurora", "Cecilion", "Chang'e", "Cyclops", "Eudora", "Faramis", "Gord", "Kadita", "Kagura", "Kimmy", "Lunox", "Luo Yi", "Lylia", "Nana", "Novaria", "Odette", "Pharsa", "Selena", "Vale", "Valentina", "Valir", "Vexana", "Xavier", "Yve", "Zetian", "Zhask", "Zhuxin"],
  "Gold Lane": ["Beatrix", "Brody", "Bruno", "Claude", "Clint", "Granger", "Hanabi", "Harith", "Irithel", "Ixia", "Karrie", "Layla", "Lesley", "Melissa", "Miya", "Moskov", "Natan", "Obsidia", "Wanwan"],
  "Roam": ["Akai", "Angela", "Atlas", "Belerick", "Carmilla", "Chip", "Diggie", "Estes", "Floryn", "Franco", "Gatotkaca", "Grock", "Hilda", "Hylos", "Jawhead", "Johnson", "Kaja", "Kalea", "Khaleed", "Khufra", "Lolita", "Marcel", "Mathilda", "Minotaur", "Rafaela", "Tigreal"]
};
const MAP_LIST = ["Broken Walls", "Dangerous Grass", "Expanding Rivers", "Flying Cloud"];
function getStateSeed(state) { return state.map(m => `${m.id}-${m.s1}-${m.s2}`).join(''); }
function mulberry32(a) { let seed = 0; for (let i = 0; i < a.length; i++) seed = Math.imul(31, seed) + a.charCodeAt(i) | 0; return function() { var t = seed += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; } }
function getHeroImg(name) { return `https://cdn.jsdelivr.net/gh/Davton90/Js-Hero@main/Hero%20icon/${encodeURIComponent(name)}.png`; }

// --- MATCH CARD SUB-COMPONENT ---
const MatchCard = ({ m, highlightedTeam, teamLogos, isAdminMode, isHistoryMatch, clearMatch, openDraftModal, showPreview, updatePreviewPos, hidePreview, onDropdownScore, unlockGlobalScore, lockGlobalScore }) => {
  const isFocus = highlightedTeam && (m.t1 === highlightedTeam || m.t2 === highlightedTeam);
  return (
    <div className={`p-3.5 rounded-2xl border mb-4 transition-all relative ${m.borderClass}`}>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{highlightedTeam ? `W${m.w} / Match ${m.id}` : `Match ${m.id}`}</span>
          {m.isCrucial && <span className="bg-gradient-to-r from-orange-600 to-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded ml-2 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse">🔥 KRUSIAL</span>}
        </div>
        <div className="flex items-center gap-2">
          {m.s1 !== null && !m.fixed && (
            <button onClick={(e) => { e.stopPropagation(); clearMatch(m.id); }} className="text-[10px] text-slate-400 hover:text-red-400 transition hover:bg-red-500/10 rounded-full p-1" title="Clear Prediksi">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          )}
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${m.fixed ? 'bg-slate-800 text-emerald-400 border border-emerald-900/50' : (m.s1 !== null ? 'bg-blue-900/50 text-blue-400' : 'bg-[#1a2333] text-slate-400')}`}>
            {m.fixed && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
            {m.fixed ? 'LOCKED / FINAL' : (m.s1 !== null ? 'PREDICTED' : 'UPCOMING')}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 flex justify-end items-center gap-3">
          <span className={`text-sm font-black text-right truncate ${m.t1 === highlightedTeam ? 'text-yellow-400' : (m.t1 === 'RRQ Hoshi' ? 'text-orange-400' : 'text-slate-200')}`}>{TEAM_ABBR[m.t1] || m.t1}</span>
          {teamLogos[m.t1] ? <img src={teamLogos[m.t1]} className="w-6 h-6 object-contain drop-shadow-md shrink-0" alt="logo" /> : <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black shadow-sm shrink-0 bg-slate-800">{m.t1.substring(0,2).toUpperCase()}</div>}
        </div>
        <div className="flex-none flex flex-col items-center justify-center min-w-[90px] relative z-20">
          {m.focusResult === 'WIN' && <span className="absolute -top-5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-black tracking-widest shadow-sm pointer-events-none">WIN</span>}
          {m.focusResult === 'LOSE' && <span className="absolute -top-5 bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded text-[10px] font-black tracking-widest shadow-sm pointer-events-none">LOSE</span>}
          {m.fixed ? (
            <div className="bg-slate-900/80 px-2 py-1 rounded-xl border border-emerald-900/40 shadow-inner flex items-center gap-1.5 cursor-pointer hover:bg-slate-800 transition-all relative z-20 group"
              onClick={(e) => { openDraftModal(m); e.stopPropagation(); }} onMouseEnter={(e) => showPreview(m, e)} onMouseMove={updatePreviewPos} onMouseLeave={hidePreview}>
              <span className={`font-black text-sm w-4 text-center pointer-events-none ${m.s1 > m.s2 ? 'text-emerald-400' : 'text-slate-500'}`}>{m.s1}</span>
              <span className="bg-slate-700/80 text-[9px] text-white px-2 py-1 rounded-md font-bold shadow border border-slate-600/50 group-hover:border-blue-500 pointer-events-none transition-colors">VS</span>
              <span className={`font-black text-sm w-4 text-center pointer-events-none ${m.s2 > m.s1 ? 'text-emerald-400' : 'text-slate-500'}`}>{m.s2}</span>
              {isAdminMode && !isHistoryMatch(m.id) && (
                <button onClick={(e) => { unlockGlobalScore(m.id); e.stopPropagation(); }} className="absolute -right-8 top-1/2 -translate-y-1/2 bg-red-600 hover:bg-red-500 text-white p-1.5 rounded-full shadow z-30" title="Buka Kunci Skor (Hapus dari DB Global)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
                </button>
              )}
            </div>
          ) : (
            <div className={`p-1 rounded-xl border flex items-center gap-1.5 transition-all relative z-20 cursor-pointer hover:bg-slate-800 ${m.s1 !== null ? 'border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.15)] bg-[#1a2333]' : 'border-slate-700 bg-slate-900/80 shadow-inner'}`}
              onClick={(e) => { openDraftModal(m); e.stopPropagation(); }} onMouseEnter={(e) => showPreview(m, e)} onMouseMove={updatePreviewPos} onMouseLeave={hidePreview}>
              <select value={m.s1 === null ? 'null' : m.s1} onClick={(e) => e.stopPropagation()} onChange={(e) => { onDropdownScore({id: m.id, team: 1, val: e.target.value}); e.stopPropagation(); }} className={`appearance-none bg-slate-800 text-white text-center font-bold rounded py-1 w-6 text-sm border hover:bg-slate-700 outline-none cursor-pointer relative z-30 ${m.s1 !== null ? 'border-blue-500/50 text-blue-400' : 'border-slate-600'}`} style={{textAlignLast: 'center'}}>
                <option value="null">-</option><option value="0">0</option><option value="1">1</option><option value="2">2</option>
              </select>
              <span className="bg-slate-700/80 text-[9px] text-white px-2 py-1 rounded-md font-bold shadow border border-slate-600/50 transition-all pointer-events-none">VS</span>
              <select value={m.s2 === null ? 'null' : m.s2} onClick={(e) => e.stopPropagation()} onChange={(e) => { onDropdownScore({id: m.id, team: 2, val: e.target.value}); e.stopPropagation(); }} className={`appearance-none bg-slate-800 text-white text-center font-bold rounded py-1 w-6 text-sm border hover:bg-slate-700 outline-none cursor-pointer relative z-30 ${m.s2 !== null ? 'border-blue-500/50 text-blue-400' : 'border-slate-600'}`} style={{textAlignLast: 'center'}}>
                <option value="null">-</option><option value="0">0</option><option value="1">1</option><option value="2">2</option>
              </select>
              {isAdminMode && m.s1 !== null && m.s2 !== null && (m.s1 === 2 || m.s2 === 2) && (
                <button onClick={(e) => { lockGlobalScore(m.id, m.s1, m.s2); e.stopPropagation(); }} className="absolute -right-8 top-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-500 text-white p-1.5 rounded-full shadow z-30 animate-pulse" title="Kunci Skor ke DB Global">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </button>
              )}
            </div>
          )}
          <span className="text-slate-400 text-[8.5px] font-bold mt-1.5 tracking-wider text-center leading-tight max-w-[130px] whitespace-pre-line pointer-events-none">{m.h2hText}</span>
        </div>
        <div className="flex-1 flex justify-start items-center gap-3">
          {teamLogos[m.t2] ? <img src={teamLogos[m.t2]} className="w-6 h-6 object-contain drop-shadow-md shrink-0" alt="logo" /> : <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black shadow-sm shrink-0 bg-slate-800">{m.t2.substring(0,2).toUpperCase()}</div>}
          <span className={`text-sm font-black text-left truncate ${m.t2 === highlightedTeam ? 'text-yellow-400' : (m.t2 === 'RRQ Hoshi' ? 'text-orange-400' : 'text-slate-200')}`}>{TEAM_ABBR[m.t2] || m.t2}</span>
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function MplPredictor() {
  // State (Signals -> useState)
  const [isAppReady, setIsAppReady] = useState(false);
  const [activeTab, setActiveTab] = useState('standings');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [state, setState] = useState([]);
  const [curWeek, setCurWeek] = useState(1);
  const [probs, setProbs] = useState({});
  const [highlightedTeam, setHighlightedTeam] = useState(null);
  const [focusFilter, setFocusFilter] = useState('all');
  const [teamLogos, setTeamLogos] = useState(FALLBACK_LOGOS);
  const [sortCol, setSortCol] = useState('default');
  const [sortAsc, setSortAsc] = useState(true);
  const [draftState, setDraftState] = useState({});
  const [draftModalMatch, setDraftModalMatch] = useState(null);
  const [hoveredMatchPreview, setHoveredMatchPreview] = useState(null);
  const [previewX, setPreviewX] = useState(0);
  const [previewY, setPreviewY] = useState(0);
  const [heroSortCol, setHeroSortCol] = useState('pb_rate');
  const [heroSortAsc, setHeroSortAsc] = useState(false);
  const [heroDetailModal, setHeroDetailModal] = useState(null);
  const [heroSearchQuery, setHeroSearchQuery] = useState('');
  const [heroRoleFilter, setHeroRoleFilter] = useState('All');
  const [heroMapFilter, setHeroMapFilter] = useState('All');
  const [customComboHeroes, setCustomComboHeroes] = useState([]);
  const [customComboInput, setCustomComboInput] = useState('');
  const [showComboDropdown, setShowComboDropdown] = useState(false);
  const [teamSignatureModal, setTeamSignatureModal] = useState(null);
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
  const [coachMessage, setCoachMessage] = useState(null);
  const [isCoachLoading, setIsCoachLoading] = useState(false);
  const [globalScores, setGlobalScores] = useState({});

  // Refs (Non-rendering state)
  const dbRef = useRef(null);
  const authRef = useRef(null);
  const currentUserRef = useRef(null);
  const appIdRef = useRef(CUSTOM_APP_ID);
  const officialMatchesRef = useRef([]);
  const insightCacheRef = useRef({});
  const unsubscribeDraftsRef = useRef(null);
  const unsubscribeScoresRef = useRef(null);

  // Helpers
  const heroRoleKeys = useMemo(() => Object.keys(HERO_ROLES), []);
  const allHeroes = useMemo(() => Object.values(HERO_ROLES).flat().sort(), []);
  const getHeroIcon = useCallback((name) => getHeroImg(name), []);
  const isHistoryMatch = useCallback((id) => history.some(hm => hm.id === id), []);

  // Computed (Signals -> useMemo)
  const baseList = useMemo(() => calculate(state), [state]);
  const sortedList = useMemo(() => {
    let temp = [...baseList];
    temp.forEach((t, i) => t.trueRank = i + 1);
    if (sortCol !== 'default') {
      temp.sort((a, b) => {
        let valA = parseFloat(probs[a.n]?.[sortCol] || 0); let valB = parseFloat(probs[b.n]?.[sortCol] || 0);
        if (valA === valB) return a.trueRank - b.trueRank; return sortAsc ? valA - valB : valB - valA;
      });
    } else if (!sortAsc) temp.reverse();
    return temp;
  }, [baseList, sortCol, sortAsc, probs]);

  const activeTeamData = useMemo(() => highlightedTeam ? sortedList.find(t => t.n === highlightedTeam) : null, [highlightedTeam, sortedList]);
  const winRate = useMemo(() => (activeTeamData && (activeTeamData.mw + activeTeamData.ml > 0)) ? Math.round((activeTeamData.mw / (activeTeamData.mw + activeTeamData.ml)) * 100) : 0, [activeTeamData]);
  const teamMatchesRaw = useMemo(() => state.filter(m => m.t1 === highlightedTeam || m.t2 === highlightedTeam), [state, highlightedTeam]);
  const upcomingMatchesAll = useMemo(() => teamMatchesRaw.filter(m => !m.fixed), [teamMatchesRaw]);
  const remOpponents = useMemo(() => upcomingMatchesAll.map(m => m.t1 === highlightedTeam ? m.t2 : m.t1), [upcomingMatchesAll, highlightedTeam]);
  
  const focusStats = useMemo(() => {
    const team = highlightedTeam;
    if (!team) return { mWin: 0, mLose: 0, mWR: 0, gWin: 0, gLose: 0, gWR: 0 };
    let mWin = 0, mLose = 0, gWin = 0, gLose = 0;
    state.forEach(m => {
      if (m.s1 !== null && m.s2 !== null && (m.t1 === team || m.t2 === team)) {
        let isT1 = m.t1 === team; let myScore = isT1 ? m.s1 : m.s2; let oppScore = isT1 ? m.s2 : m.s1;
        if (myScore > oppScore) mWin++; else if (myScore < oppScore) mLose++;
        gWin += myScore; gLose += oppScore;
      }
    });
    let mTotal = mWin + mLose; let gTotal = gWin + gLose;
    return { mWin, mLose, mWR: mTotal > 0 ? Math.round((mWin/mTotal)*100) : 0, gWin, gLose, gWR: gTotal > 0 ? Math.round((gWin/gTotal)*100) : 0 };
  }, [highlightedTeam, state]);

  const sosStats = useMemo(() => {
    let diffScore = 0;
    remOpponents.forEach(opp => {
      let oppData = sortedList.find(x => x.n === opp);
      if(oppData && (oppData.mw + oppData.ml > 0)) diffScore += oppData.mw / (oppData.mw + oppData.ml);
    });
    let avgDiff = remOpponents.length > 0 ? (diffScore / remOpponents.length) : 0;
    let label = "Mudah", color = "text-emerald-400";
    if(remOpponents.length === 0) { label = "Selesai"; color = "text-slate-500"; }
    else if (avgDiff >= 0.55) { label = "Sangat Sulit"; color = "text-red-500"; }
    else if (avgDiff >= 0.45) { label = "Sulit"; color = "text-orange-400"; }
    else if (avgDiff >= 0.35) { label = "Sedang"; color = "text-yellow-400"; }
    return { label, color };
  }, [remOpponents, sortedList]);

  const displayMatches = useMemo(() => getDisplayMatches(state, highlightedTeam, focusFilter, sortedList), [state, highlightedTeam, focusFilter, sortedList]);
  
  const filteredDraftState = useMemo(() => {
    const mapFilter = heroMapFilter; const original = draftState;
    if (mapFilter === 'All') return original;
    const filtered = {};
    Object.entries(original).forEach(([mId, games]) => {
      const matchedGames = games.filter(g => g.map === mapFilter);
      if (matchedGames.length > 0) filtered[parseInt(mId)] = matchedGames;
    });
    return filtered;
  }, [heroMapFilter, draftState]);

  const getTotalGamesPlayed = useCallback(() => { let count = 0; Object.values(filteredDraftState).forEach(games => count += games.length); return count; }, [filteredDraftState]);
  const getRole = useCallback((heroName) => { for(const [r, list] of Object.entries(HERO_ROLES)) { if(list.includes(heroName)) return r; } return 'Unknown'; }, []);

  const mapOverviewStats = useMemo(() => {
    const games = Object.values(filteredDraftState).flat();
    if (games.length === 0) return null;
    let totalSec = 0, countDur = 0, minSec = Infinity, maxSec = 0, bW = 0, rW = 0, picks = {}, bans = {};
    games.forEach(g => {
      if (g.duration && g.duration.includes(':')) {
        const p = g.duration.split(':');
        if (p.length === 2) {
          const sec = (parseInt(p[0]) * 60) + parseInt(p[1]);
          if (sec > 0) { totalSec += sec; countDur++; if (sec < minSec) minSec = sec; if (sec > maxSec) maxSec = sec; }
        }
      }
      if (g.t1Result === 'W') { if (g.t1Side === 'blue') bW++; else rW++; }
      if (g.t2Result === 'W') { if (g.t2Side === 'blue') bW++; else rW++; }
      (g.t1Picks || []).concat(g.t2Picks || []).filter(Boolean).forEach((h) => picks[h] = (picks[h]||0)+1);
      (g.t1Bans || []).concat(g.t2Bans || []).filter(Boolean).forEach((h) => bans[h] = (bans[h]||0)+1);
    });
    const formatDur = (sec) => `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`;
    let tw = bW + rW;
    let topP = Object.entries(picks).sort((a, b) => b[1]-a[1])[0] || [null, 0];
    let topB = Object.entries(bans).sort((a, b) => b[1]-a[1])[0] || [null, 0];
    return {
      avgDur: countDur > 0 ? formatDur(Math.round(totalSec / countDur)) : "00:00",
      fastestDur: minSec === Infinity ? "00:00" : formatDur(minSec),
      longestDur: maxSec === 0 ? "00:00" : formatDur(maxSec),
      bWr: tw > 0 ? ((bW/tw)*100).toFixed(1) : "0.0",
      rWr: tw > 0 ? ((rW/tw)*100).toFixed(1) : "0.0",
      totalGames: games.length, topPick: {name: topP[0], count: topP[1]}, topBan: {name: topB[0], count: topB[1]}
    };
  }, [filteredDraftState]);

  const processedHeroData = useMemo(() => {
    const stats = {}; const roleMap = ['EXP Lane', 'Jungle', 'Mid Lane', 'Gold Lane', 'Roam'];
    Object.values(HERO_ROLES).flat().forEach(h => {
      stats[h] = { name: h, picks: 0, bans: 0, wins: 0, losses: 0, bPicks: 0, bWins: 0, bLosses: 0, rPicks: 0, rWins: 0, rLosses: 0, roleCounts: { 'EXP Lane': 0, 'Jungle': 0, 'Mid Lane': 0, 'Gold Lane': 0, 'Roam': 0 }, role: getRole(h) };
    });
    let totalGames = 0;
    Object.values(filteredDraftState).forEach(matchDrafts => {
      matchDrafts.forEach(game => {
        totalGames++;
        const processPicks = (picks, side, res) => {
          picks.forEach((h, idx) => {
            if(!h) return;
            stats[h].picks++;
            if (res === 'W') stats[h].wins++; else if (res === 'L') stats[h].losses++;
            if (side === 'blue') { stats[h].bPicks++; if(res === 'W') stats[h].bWins++; else if(res==='L') stats[h].bLosses++; }
            else { stats[h].rPicks++; if(res === 'W') stats[h].rWins++; else if(res==='L') stats[h].rLosses++; }
            if (idx >= 0 && idx < 5) stats[h].roleCounts[roleMap[idx]]++;
          });
        };
        processPicks(game.t1Picks, game.t1Side, game.t1Result); processPicks(game.t2Picks, game.t2Side, game.t2Result);
        const processBans = (bans) => { bans.forEach(h => { if(h) stats[h].bans++; }); };
        processBans(game.t1Bans); processBans(game.t2Bans);
      });
    });
    const tg = Math.max(1, totalGames);
    let arr = Object.values(stats).filter(h => (h.picks + h.bans) > 0).map(h => {
      let pb_rate = parseFloat((((h.picks + h.bans) / tg) * 100).toFixed(2));
      let w_rate = h.picks > 0 ? parseFloat(((h.wins / h.picks) * 100).toFixed(2)) : 0;
      let label = '💤 Niche / Weak';
      if (pb_rate >= 25 && w_rate >= 50) label = '🔥 Meta Dominant'; else if (pb_rate >= 25 && w_rate < 50) label = '⚠️ Overrated'; else if (pb_rate < 25 && w_rate >= 55 && h.picks >= 2) label = '💎 Hidden Gem';
      let impact = parseFloat(((h.picks * (w_rate/100)) + (h.bans * 1.2)).toFixed(1));
      let finalRole = h.role, maxRoleVal = 0;
      for (const [rName, count] of Object.entries(h.roleCounts)) { if (count > maxRoleVal) { maxRoleVal = count; finalRole = rName; } }
      return { ...h, role: finalRole, p_rate: parseFloat(((h.picks / tg) * 100).toFixed(2)), b_rate: parseFloat(((h.bans / tg) * 100).toFixed(2)), pb_count: h.picks + h.bans, pb_rate, w_rate, impact, label, b_winrate: h.bPicks > 0 ? parseFloat(((h.bWins / h.bPicks) * 100).toFixed(2)) : 0, r_winrate: h.rPicks > 0 ? parseFloat(((h.rWins / h.rPicks) * 100).toFixed(2)) : 0 };
    });
    const col = heroSortCol; const asc = heroSortAsc;
    arr.sort((a, b) => {
      if (a[col] === b[col]) return a.name.localeCompare(b.name);
      if (typeof a[col] === 'number') return asc ? a[col] - b[col] : b[col] - a[col];
      return asc ? a[col].localeCompare(b[col]) : b[col].localeCompare(a[col]);
    });
    return arr;
  }, [filteredDraftState, getRole, heroSortCol, heroSortAsc]);

  const filteredHeroData = useMemo(() => {
    let data = processedHeroData; const q = heroSearchQuery.toLowerCase(); const r = heroRoleFilter;
    if(q) data = data.filter(h => h.name.toLowerCase().includes(q)); if(r !== 'All') data = data.filter(h => h.role === r);
    return data;
  }, [processedHeroData, heroSearchQuery, heroRoleFilter]);

  const analyticsInsights = useMemo(() => {
    const data = processedHeroData;
    return {
      totalMatches: getTotalGamesPlayed(), uniquePicks: data.filter(h => h.picks > 0).length,
      topPick: [...data].sort((a,b)=>b.picks - a.picks)[0], topBan: [...data].sort((a,b)=>b.bans - a.bans)[0],
      topMeta: data.filter(h=>h.label==='🔥 Meta Dominant').sort((a,b)=>b.impact - a.impact).slice(0,5),
      hiddenGems: data.filter(h=>h.label==='💎 Hidden Gem').sort((a,b)=>b.w_rate - a.w_rate).slice(0,5),
      overrated: data.filter(h=>h.label==='⚠️ Overrated').sort((a,b)=>b.picks - a.picks).slice(0,5),
      mustBan: [...data].sort((a,b)=>b.bans - a.bans).slice(0,5)
    };
  }, [processedHeroData, getTotalGamesPlayed]);

  const mapAssistant = useMemo(() => {
    const data = filteredHeroData;
    const recPicks = [...data].filter(h => h.picks >= 1).sort((a,b) => (b.w_rate * Math.log10(b.picks + 1)) - (a.w_rate * Math.log10(a.picks + 1))).slice(0, 4);
    const recBans = [...data].sort((a,b) => b.bans - a.bans).slice(0, 4);
    const sTier = [...data].filter(h => h.pb_rate >= 20 && h.w_rate >= 55).sort((a,b) => b.impact - a.impact).slice(0, 6);
    const actualSTier = sTier.length > 0 ? sTier : [...data].sort((a,b)=>b.impact - a.impact).slice(0, 6);
    const aTier = [...data].filter(h => h.pb_rate >= 10 && h.w_rate >= 50 && !actualSTier.includes(h)).sort((a,b) => b.impact - a.impact).slice(0, 6);
    const actualATier = aTier.length > 0 ? aTier : [...data].filter(h => !actualSTier.includes(h)).sort((a,b)=>b.impact - a.impact).slice(0, 6);
    return { recPicks, recBans, sTier: actualSTier, aTier: actualATier };
  }, [filteredHeroData]);

  const teamSignatures = useMemo(() => {
    let td = {}; const roleMap = ['EXP', 'JUG', 'MID', 'GOLD', 'ROAM'];
    TEAMS.forEach(t => { td[TEAM_ABBR[t] || t] = { picks: {}, bans: {} }; });
    Object.entries(filteredDraftState).forEach(([mId, games]) => {
      let match = state.find(x=>x.id == parseInt(mId)); if(!match) return;
      games.forEach(g => {
        let processPicks = (team, picks) => {
          let t = TEAM_ABBR[team] || team;
          picks.forEach((p, idx) => {
            if (!p) return;
            if (!td[t].picks[p]) td[t].picks[p] = { count: 0, roles: { 'EXP': 0, 'JUG': 0, 'MID': 0, 'GOLD': 0, 'ROAM': 0 } };
            td[t].picks[p].count++; if (idx >= 0 && idx < 5) td[t].picks[p].roles[roleMap[idx]]++;
          });
        };
        let processBans = (team, bans) => {
          let t = TEAM_ABBR[team] || team; bans.filter(Boolean).forEach(b => td[t].bans[b] = (td[t].bans[b] || 0) + 1);
        };
        if(match.t1) { processPicks(match.t1, g.t1Picks); processBans(match.t1, g.t1Bans); }
        if(match.t2) { processPicks(match.t2, g.t2Picks); processBans(match.t2, g.t2Bans); }
      });
    });
    return TEAMS.map(team => {
      let abbr = TEAM_ABBR[team] || team; let teamData = td[abbr] || { picks: {}, bans: {} };
      let topPicks = Object.entries(teamData.picks || {}).map(([name, data]) => {
        let mainRole = 'N/A', maxR = 0;
        for (let r in data.roles) { if (data.roles[r] > maxR) { maxR = data.roles[r]; mainRole = r; } }
        return { name, count: data.count, role: mainRole };
      }).sort((a,b)=>b.count - a.count).slice(0, 5);
      let topBans = Object.entries(teamData.bans || {}).map(([name, count]) => ({name, count})).sort((a,b)=>b.count - a.count).slice(0, 5);
      return { team, abbr, picks: topPicks, bans: topBans };
    });
  }, [filteredDraftState, state]);

  const teamSignatureDetailData = useMemo(() => {
    const team = teamSignatureModal; if(!team) return null;
    const roleMap = ['EXP Lane', 'Jungle', 'Mid Lane', 'Gold Lane', 'Roam'];
    const data = { 'EXP Lane': {}, 'Jungle': {}, 'Mid Lane': {}, 'Gold Lane': {}, 'Roam': {} };
    Object.entries(filteredDraftState).forEach(([mId, games]) => {
      const match = state.find(x => x.id == parseInt(mId)); if(!match) return;
      games.forEach(g => {
        let picks = [];
        if(match.t1 === team || TEAM_ABBR[match.t1] === team) picks = g.t1Picks;
        if(match.t2 === team || TEAM_ABBR[match.t2] === team) picks = g.t2Picks;
        if(picks.length > 0) picks.forEach((h, idx) => { if(h && idx < 5) data[roleMap[idx]][h] = (data[roleMap[idx]][h] || 0) + 1; });
      });
    });
    const result = {};
    for(const role of roleMap) result[role] = Object.entries(data[role]).map(([name, count]) => ({name, count})).sort((a, b) => b.count - a.count);
    return { teamName: team, roles: result };
  }, [teamSignatureModal, filteredDraftState, state]);

  const teamCompareData = useMemo(() => {
    const tA = compareTeamA; const tB = compareTeamB; const roleMap = ['EXP Lane', 'Jungle', 'Mid Lane', 'Gold Lane', 'Roam'];
    const dataA = { 'EXP Lane': {}, 'Jungle': {}, 'Mid Lane': {}, 'Gold Lane': {}, 'Roam': {} };
    const dataB = { 'EXP Lane': {}, 'Jungle': {}, 'Mid Lane': {}, 'Gold Lane': {}, 'Roam': {} };
    Object.entries(filteredDraftState).forEach(([mId, games]) => {
      const match = state.find(x => x.id == parseInt(mId)); if(!match) return;
      games.forEach(g => {
        let picksA = [];
        if(match.t1 === tA || TEAM_ABBR[match.t1] === tA) picksA = g.t1Picks;
        if(match.t2 === tA || TEAM_ABBR[match.t2] === tA) picksA = g.t2Picks;
        picksA.forEach((h, idx) => { if(h && idx < 5) dataA[roleMap[idx]][h] = (dataA[roleMap[idx]][h] || 0) + 1; });
        let picksB = [];
        if(match.t1 === tB || TEAM_ABBR[match.t1] === tB) picksB = g.t1Picks;
        if(match.t2 === tB || TEAM_ABBR[match.t2] === tB) picksB = g.t2Picks;
        picksB.forEach((h, idx) => { if(h && idx < 5) dataB[roleMap[idx]][h] = (dataB[roleMap[idx]][h] || 0) + 1; });
      });
    });
    const resultA = {}; const resultB = {};
    for(const role of roleMap) {
      resultA[role] = Object.entries(dataA[role]).map(([name, count]) => ({name, count})).sort((a, b) => b.count - a.count);
      resultB[role] = Object.entries(dataB[role]).map(([name, count]) => ({name, count})).sort((a, b) => b.count - a.count);
    }
    return { teamA: tA, teamB: tB, rolesA: resultA, rolesB: resultB };
  }, [compareTeamA, compareTeamB, filteredDraftState, state]);

  const sideAnalytics = useMemo(() => {
    let blueWins = 0, redWins = 0, totalGames = 0;
    const heroSide = {};
    Object.values(filteredDraftState).forEach(games => {
      games.forEach(g => {
        if(g.t1Result === 'W' || g.t2Result === 'W') totalGames++;
        const processSide = (side, res, picks) => {
          if(side === 'blue' && res === 'W') blueWins++; if(side === 'red' && res === 'W') redWins++;
          picks.filter(Boolean).forEach(h => {
            if(!heroSide[h]) heroSide[h] = {blueW:0, blueL:0, redW:0, redL:0};
            if(side === 'blue') { if(res==='W') heroSide[h].blueW++; else if(res==='L') heroSide[h].blueL++; }
            else { if(res==='W') heroSide[h].redW++; else if(res==='L') heroSide[h].redL++; }
          });
        };
        processSide(g.t1Side, g.t1Result, g.t1Picks); processSide(g.t2Side, g.t2Result, g.t2Picks);
      });
    });
    const heroArr = Object.entries(heroSide).map(([name, s]) => {
      const bTotal = s.blueW + s.blueL; const rTotal = s.redW + s.redL;
      return { name, bTotal, rTotal, bWr: bTotal > 0 ? (s.blueW/bTotal)*100 : 0, rWr: rTotal > 0 ? (s.redW/rTotal)*100 : 0, diff: (bTotal > 0 ? (s.blueW/bTotal)*100 : 0) - (rTotal > 0 ? (s.redW/rTotal)*100 : 0) };
    });
    return {
      blueWr: totalGames > 0 ? ((blueWins/totalGames)*100).toFixed(1) : "0.0",
      redWr: totalGames > 0 ? ((redWins/totalGames)*100).toFixed(1) : "0.0",
      blueWins, redWins, totalGames,
      blueOp: [...heroArr].filter(h => h.bTotal >= 3).sort((a,b) => b.diff - a.diff).slice(0, 4),
      redOp: [...heroArr].filter(h => h.rTotal >= 3).sort((a,b) => a.diff - b.diff).slice(0, 4)
    };
  }, [filteredDraftState]);

  const comboStats = useMemo(() => {
    const combos = {};
    Object.values(filteredDraftState).forEach(games => {
      games.forEach(g => {
        const processTeam = (picks, res) => {
          const validPicks = picks.filter(Boolean).sort();
          for(let i=0; i<validPicks.length; i++) {
            for(let j=i+1; j<validPicks.length; j++) {
              const key = validPicks[i] + ' & ' + validPicks[j];
              if(!combos[key]) combos[key] = {heroes: [validPicks[i], validPicks[j]], wins: 0, losses: 0, total: 0};
              combos[key].total++; if(res === 'W') combos[key].wins++; else if(res === 'L') combos[key].losses++;
            }
          }
        };
        processTeam(g.t1Picks, g.t1Result); processTeam(g.t2Picks, g.t2Result);
      });
    });
    const comboArr = Object.values(combos).filter(c => c.total >= 2).map(c => ({...c, wr: (c.wins/c.total)*100}));
    return {
      best: [...comboArr].sort((a,b) => b.wr === a.wr ? b.total - a.total : b.wr - a.wr).slice(0, 5),
      failed: [...comboArr].filter(c => c.total >= 3).sort((a,b) => a.wr === b.wr ? b.total - a.total : a.wr - b.wr).slice(0, 5)
    };
  }, [filteredDraftState]);

  const comboSuggestions = useMemo(() => {
    let q = customComboInput.toLowerCase(); if (!q) return [];
    return allHeroes.filter(h => h.toLowerCase().includes(q) && !customComboHeroes.includes(h)).slice(0, 5);
  }, [customComboInput, allHeroes, customComboHeroes]);

  const customComboResult = useMemo(() => {
    let heroes = customComboHeroes; if (heroes.length === 0) return null;
    let total = 0, wins = 0, losses = 0; let mapStats = {};
    MAP_LIST.forEach(m => mapStats[m] = {total: 0, wins: 0, losses: 0});
    Object.values(draftState).forEach(games => {
      games.forEach(g => {
        let t1Has = heroes.every(h => g.t1Picks.includes(h)); let t2Has = heroes.every(h => g.t2Picks.includes(h));
        const mapName = g.map || 'Unknown'; if (!mapStats[mapName]) mapStats[mapName] = {total: 0, wins: 0, losses: 0};
        if (t1Has) { total++; mapStats[mapName].total++; if (g.t1Result === 'W') { wins++; mapStats[mapName].wins++; } else if (g.t1Result === 'L') { losses++; mapStats[mapName].losses++; } }
        if (t2Has) { total++; mapStats[mapName].total++; if (g.t2Result === 'W') { wins++; mapStats[mapName].wins++; } else if (g.t2Result === 'L') { losses++; mapStats[mapName].losses++; } }
      });
    });
    const mapBreakdown = Object.entries(mapStats).filter(([_, s]) => s.total > 0).map(([map, s]) => ({ map, ...s, wr: (s.wins/s.total)*100 })).sort((a,b) => b.wr - a.wr);
    return { total, wins, losses, wr: total > 0 ? (wins / total) * 100 : 0, mapBreakdown };
  }, [customComboHeroes, draftState]);

  const heroDetailData = useMemo(() => {
    const hero = heroDetailModal; if(!hero) return { byTeam: [], withHero: [], againstHero: [] };
    let byTeam = {}; let withHero = {}; let againstHero = {};
    Object.entries(filteredDraftState).forEach(([mId, games]) => {
      const match = state.find(x => x.id == parseInt(mId)); if(!match) return;
      games.forEach(g => {
        let t1Has = g.t1Picks.includes(hero); let t2Has = g.t2Picks.includes(hero); if(!t1Has && !t2Has) return;
        let myTeamStr = t1Has ? match.t1 : match.t2; let myRes = t1Has ? g.t1Result : g.t2Result;
        let myPicks = t1Has ? g.t1Picks : g.t2Picks; let oppPicks = t1Has ? g.t2Picks : g.t1Picks;
        let tAbbr = TEAM_ABBR[myTeamStr] || myTeamStr;
        if(!byTeam[tAbbr]) byTeam[tAbbr] = { name: tAbbr, total: 0, w: 0, l: 0 };
        byTeam[tAbbr].total++; if(myRes==='W') byTeam[tAbbr].w++; else if(myRes==='L') byTeam[tAbbr].l++;
        myPicks.forEach(h => { if(h && h !== hero) { if(!withHero[h]) withHero[h] = { name: h, total: 0, w: 0, l: 0 }; withHero[h].total++; if(myRes==='W') withHero[h].w++; else if(myRes==='L') withHero[h].l++; } });
        oppPicks.forEach(h => { if(h && h !== hero) { if(!againstHero[h]) againstHero[h] = { name: h, total: 0, w: 0, l: 0 }; againstHero[h].total++; if(myRes==='W') againstHero[h].w++; else if(myRes==='L') againstHero[h].l++; } });
      });
    });
    const proc = (obj) => Object.values(obj).map((x) => ({...x, wr: x.total>0 ? ((x.w/x.total)*100).toFixed(2) : 0})).sort((a, b) => b.total - a.total).slice(0, 5);
    return { byTeam: proc(byTeam), withHero: proc(withHero), againstHero: proc(againstHero) };
  }, [heroDetailModal, filteredDraftState, state]);

  // Effects
  useEffect(() => {
    if (highlightedTeam) {
      triggerAiInsight(highlightedTeam);
      setTimeout(() => {
        const el = document.getElementById('focus-upcoming-header');
        const scrollArea = document.getElementById('matchScrollArea');
        if (el && scrollArea) scrollArea.scrollTo({ top: el.offsetTop - 50, behavior: 'smooth' });
      }, 150);
    } else {
      setCurrentAiInsight(null);
    }
  }, [highlightedTeam]);

  useEffect(() => {
    setTeamLogos(FALLBACK_LOGOS);
    initBaseState().then(() => {
      setTimeout(() => {
        setIsAppReady(true);
        initFirebase();
      }, 500);
    });
  }, []);

  // Methods
  const updateSearch = (e) => setHeroSearchQuery(e.target.value);
  const updateRoleFilter = (e) => setHeroRoleFilter(e.target.value);
  const getLabelBadgeColor = (label) => {
    if(label.includes('Meta Dominant')) return 'text-orange-400 border-orange-500/50 bg-orange-900/10';
    if(label.includes('Hidden Gem')) return 'text-emerald-400 border-emerald-500/50 bg-emerald-900/10';
    if(label.includes('Overrated')) return 'text-red-400 border-red-500/50 bg-red-900/10';
    return 'text-slate-500 border-slate-700 bg-slate-800/30';
  };
  const getLabelTextColor = (label) => {
    if(label.includes('Meta Dominant')) return 'text-orange-400';
    if(label.includes('Hidden Gem')) return 'text-emerald-400';
    if(label.includes('Overrated')) return 'text-red-400';
    return 'text-slate-400';
  };
  const getDotColor = (label) => {
    if(label.includes('Meta Dominant')) return 'border-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)] z-30';
    if(label.includes('Hidden Gem')) return 'border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] z-20';
    if(label.includes('Overrated')) return 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] z-20';
    return 'border-slate-500 opacity-60 z-10';
  };
  const switchTab = (tab) => { setActiveTab(tab); if (tab === 'standings') setTimeout(() => scrollToActiveWeek(), 300); };
  const showPreview = (match, e) => { setHoveredMatchPreview(match); updatePreviewPos(e); };
  const updatePreviewPos = (e) => {
    let x = e.clientX - 480; if (x < 20) x = e.clientX + 30;
    let y = e.clientY - 150; if (y < 20) y = 20;
    setPreviewX(x); setPreviewY(y);
  };
  const hidePreview = () => setHoveredMatchPreview(null);
  const toggleAdmin = () => {
    if (isAdminMode) { setIsAdminMode(false); triggerToast("Mode Admin Dinonaktifkan."); return; }
    const pwd = prompt("Masukkan Kunci Rahasia Admin:");
    if (pwd === "admin123") { setIsAdminMode(true); triggerToast("Mode Admin Diaktifkan! Akses Edit Terbuka."); } else if (pwd !== null) { triggerToast("Kunci Rahasia Salah!", true); }
  };
  const initBaseState = async () => {
    let tempState = []; officialMatchesRef.current = []; let currentId = 1;
    history.forEach(m => {
      let mId = m.id || currentId; tempState.push({id: mId, w: m.w, t1: TM[m.t1] || m.t1, t2: TM[m.t2] || m.t2, s1: m.s1, s2: m.s2, fixed: (m.s1 === 2 || m.s2 === 2), _csvParsed: true});
      currentId = Math.max(currentId, mId) + 1;
    });
    schedule.forEach(wf => {
      wf.m.forEach((match) => { tempState.push({id: currentId++, w: wf.w, t1: TM[match[0]] || match[0], t2: TM[match[1]] || match[1], s1: null, s2: null, fixed: false, _csvParsed: false}); });
    });
    try {
      const noCacheUrl = SPREADSHEET_API_URL + (SPREADSHEET_API_URL.includes('?') ? '&' : '?') + 'nocache=' + new Date().getTime();
      const response = await fetch(noCacheUrl, { cache: 'no-store' });
      if (response.ok) {
        const csvText = await response.text();
        const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l);
        tempState.forEach(m => m._csvParsed = false);
        for (let i = 0; i < lines.length; i++) {
          const rawTokens = lines[i].split(',').map(t => t.replace(/^"|"$/g, '').trim());
          const findTeam = (inputStr) => {
            if (!inputStr) return null; let up = inputStr.toUpperCase();
            let teamNamesMap = [
              { key: 'ONIC', names: ['ONIC', 'FNATIC ONIC'] }, { key: 'BTR', names: ['BTR', 'BIGETRON', 'BIGETRON VITALITY', 'BIGETRON ALPHA'] },
              { key: 'EVOS', names: ['EVOS', 'EVOS LEGENDS', 'EVOS GLORY'] }, { key: 'DEWA', names: ['DEWA', 'DEWA UNITED', 'DEWA UNITED ESPORTS'] },
              { key: 'TLID', names: ['TLID', 'LIQUID', 'TEAM LIQUID', 'TEAM LIQUID ID', 'AURA'] }, { key: 'AE', names: ['AE', 'ALTER EGO'] },
              { key: 'GEEK', names: ['GEEK', 'GEEK FAM', 'GEEK FAM ID'] }, { key: 'NAVI', names: ['NAVI', 'NATUS VINCERE'] }, { key: 'RRQ', names: ['RRQ', 'RRQ HOSHI'] }
            ];
            for (let t of teamNamesMap) { if (t.names.some(name => up.includes(name))) return TM[t.key]; } return null;
          };
          let parsedWeek = null;
          let wMatch = lines[i].match(/WEEK\s*([1-9])/i) || lines[i].match(/W\s*([1-9])/i);
          if (wMatch) parsedWeek = parseInt(wMatch[1]);
          else { let num = parseInt(rawTokens[0]); if (!isNaN(num) && num >= 1 && num <= 9) parsedWeek = num; }
          let s1 = null; let s2 = null; let t1Str = null; let t2Str = null;
          let vsIdx = rawTokens.findIndex(t => t.toUpperCase() === 'VS');
          if (vsIdx !== -1 && vsIdx >= 2 && vsIdx + 2 < rawTokens.length) {
            s1 = parseInt(rawTokens[vsIdx - 1]); s2 = parseInt(rawTokens[vsIdx + 1]);
            t1Str = findTeam(rawTokens[vsIdx - 2]); t2Str = findTeam(rawTokens[vsIdx + 2]);
          } else {
            let nums = rawTokens.filter(t => /^[012]$/.test(t)).map(t => parseInt(t));
            if (nums.length >= 2) { s1 = nums[nums.length - 2]; s2 = nums[nums.length - 1]; }
            let foundTeams = rawTokens.map(t => findTeam(t)).filter(Boolean);
            let uniqueTeams = [...new Set(foundTeams)];
            if (uniqueTeams.length >= 2) { t1Str = uniqueTeams[0]; t2Str = uniqueTeams[1]; }
          }
          if (s1 !== null && s2 !== null && !isNaN(s1) && !isNaN(s2) && (s1 > 0 || s2 > 0) && t1Str && t2Str) {
            let allPairMatches = tempState.filter(m => (m.t1 === t1Str && m.t2 === t2Str) || (m.t1 === t2Str && m.t2 === t1Str));
            let targetMatch = null;
            if (parsedWeek !== null && !isNaN(parsedWeek) && parsedWeek > 0) targetMatch = allPairMatches.find(m => m.w === parsedWeek);
            else targetMatch = allPairMatches.find(m => !m._csvParsed);
            if (targetMatch) {
              targetMatch._csvParsed = true;
              if (targetMatch.t1 === t1Str) { targetMatch.s1 = s1; targetMatch.s2 = s2; }
              else { targetMatch.s1 = s2; targetMatch.s2 = s1; }
              targetMatch.fixed = (targetMatch.s1 >= 2 || targetMatch.s2 >= 2);
            }
          }
        }
      }
    } catch (err) { console.error("Gagal meload CSV dari Spreadsheet", err); }
    history.forEach(hm => {
      let match = tempState.find(m => m.id === hm.id);
      if(match) { match.s1 = hm.s1; match.s2 = hm.s2; match.fixed = (hm.s1 === 2 || hm.s2 === 2); match._csvParsed = true; }
    });
    tempState.forEach(m => {
      if (m.s1 !== null && m.s2 !== null) {
        officialMatchesRef.current.push({ id: m.id, s1: m.s1, s2: m.s2, fixed: m.fixed });
      }
      delete m._csvParsed;
    });
    setState(tempState);
    let tempProbs = {}; TEAMS.forEach(t => tempProbs[t] = {upper: 0, playin: 0, playoff: 0, elim: 0}); setProbs(tempProbs);
    determineCurrentWeek(); runSimulation();
  };

  const determineCurrentWeek = () => {
    let unplayedMatch = state.find(m => m.s1 === null);
    if (unplayedMatch) setCurWeek(unplayedMatch.w); else setCurWeek(Math.max(...state.map(m => m.w)));
    scrollToActiveWeek();
  };
  const scrollToActiveWeek = () => {
    setTimeout(() => {
      const container = document.getElementById('weekNavScroll'); const activeBtn = document.getElementById('week-btn-' + curWeek);
      if (container && activeBtn) { const scrollLeft = activeBtn.offsetLeft - (container.clientWidth / 2) + (activeBtn.clientWidth / 2); container.scrollTo({ left: scrollLeft, behavior: 'smooth' }); }
    }, 100);
  };

  const initFirebase = async () => {
    try {
      const firebaseConfig = CUSTOM_FIREBASE_CONFIG;
      const apps = getApps();
      let myApp = apps.length ? apps[0] : initializeApp(firebaseConfig, "MPLCustomApp_vFinal");
      dbRef.current = getFirestore(myApp);
      authRef.current = getAuth(myApp);
      await signInAnonymously(authRef.current);
      onAuthStateChanged(authRef.current, async (user) => {
        currentUserRef.current = user || { uid: 'public-guest' };
        listenToGlobalData();
      });
    } catch(e) {
      updateSync("Offline", "text-slate-400");
    }
  };

  const listenToGlobalData = () => {
    if (!dbRef.current) return;
    if (unsubscribeDraftsRef.current) unsubscribeDraftsRef.current(); if (unsubscribeScoresRef.current) unsubscribeScoresRef.current();
    const draftsRef = doc(dbRef.current, 'artifacts', appIdRef.current, 'public', 'data', 'mpl_global', 'drafts_data');
    unsubscribeDraftsRef.current = onSnapshot(draftsRef, (docSnap) => {
      if (docSnap.exists()) { const data = docSnap.data()['drafts']; if (data) setDraftState(data); }
      syncMatches(); updateSync("Global Synced", "text-emerald-400");
    }, (err) => console.error(err));
    const scoresRef = doc(dbRef.current, 'artifacts', appIdRef.current, 'public', 'data', 'mpl_global', 'official_scores');
    unsubscribeScoresRef.current = onSnapshot(scoresRef, (docSnap) => {
      if (docSnap.exists()) { const data = docSnap.data()['scores']; if (data) setGlobalScores(data); }
      syncMatches();
    });
  };

  const syncMatches = () => {
    const scores = globalScores;
    setState(currentMatches => currentMatches.map(m => {
      const hMatch = officialMatchesRef.current.find(om => om.id === m.id); if (hMatch) return { ...m, s1: hMatch.s1, s2: hMatch.s2, fixed: hMatch.fixed };
      const dbScore = scores[m.id]; if (dbScore) return { ...m, s1: dbScore.s1, s2: dbScore.s2, fixed: (dbScore.s1 === 2 || dbScore.s2 === 2) };
      return { ...m, fixed: false };
    }));
    determineCurrentWeek(); triggerCalculation();
  };

  const lockGlobalScore = async (id, s1, s2) => {
    if (!dbRef.current) return triggerToast("Database Master tidak terkoneksi!", true);
    const currentScores = { ...globalScores }; currentScores[id] = { s1, s2 };
    const scoresRef = doc(dbRef.current, 'artifacts', appIdRef.current, 'public', 'data', 'mpl_global', 'official_scores');
    await setDoc(scoresRef, { scores: currentScores }, { merge: true }); triggerToast(`Match ${id} Berhasil Dikunci (Global)!`);
  };
  const unlockGlobalScore = async (id) => {
    if (!dbRef.current) return triggerToast("Database Master tidak terkoneksi!", true);
    const currentScores = { ...globalScores }; delete currentScores[id];
    const scoresRef = doc(dbRef.current, 'artifacts', appIdRef.current, 'public', 'data', 'mpl_global', 'official_scores');
    await setDoc(scoresRef, { scores: currentScores }, { merge: true }); triggerToast(`Match ${id} Berhasil Dibuka!`);
  };

  const updateSync = (msg, color) => { setSyncStatus(msg); setSyncColor(color); };
  const calculate = (matches) => {
    let s = {};
    TEAMS.forEach(t => s[t] = {n: t, mw: 0, ml: 0, gw: 0, gl: 0, h2h: {}, form: []}); TEAMS.forEach(t1 => TEAMS.forEach(t2 => s[t1].h2h[t2] = 0));
    matches.forEach(m => {
      if(m.s1 !== null && m.s2 !== null) {
        s[m.t1].gw += m.s1; s[m.t1].gl += m.s2; s[m.t2].gw += m.s2; s[m.t2].gl += m.s1;
        if(m.s1 === 2 || m.s2 === 2) {
          if(m.s1 === 2) { s[m.t1].mw++; s[m.t2].ml++; s[m.t1].h2h[m.t2]++; s[m.t1].form.push({ res: 'W', opp: m.t2 }); s[m.t2].form.push({ res: 'L', opp: m.t1 }); }
          else if (m.s2 === 2) { s[m.t2].mw++; s[m.t1].ml++; s[m.t2].h2h[m.t1]++; s[m.t2].form.push({ res: 'W', opp: m.t1 }); s[m.t1].form.push({ res: 'L', opp: m.t2 }); }
        }
      }
    });
    TEAMS.forEach(t => { s[t].form = s[t].form.slice(-5); });
    return Object.values(s).sort((a, b) => {
      if(b.mw !== a.mw) return b.mw - a.mw; let gdA = a.gw - a.gl, gdB = b.gw - b.gl; if(gdB !== gdA) return gdB - gdA;
      let h2hDiff = b.h2h[a.n] - a.h2h[b.n]; if(h2hDiff !== 0) return h2hDiff; return a.n.localeCompare(b.n);
    });
  };

  const runSimulation = useCallback(() => {
    const iterations = 20000; let counts = {}; TEAMS.forEach(t => counts[t] = {upper: 0, playin: 0, playoff: 0, elim: 0});
    let seed = getStateSeed(state); let seededRandom = mulberry32(seed); const teamIndices = {}; TEAMS.forEach((t, i) => teamIndices[t] = i);
    const baseMw = new Int32Array(9); const baseMl = new Int32Array(9); const baseGw = new Int32Array(9); const baseGl = new Int32Array(9); const baseH2h = Array.from({length: 9}, () => new Int32Array(9));
    const unplayed = [];
    for (let i = 0; i < state.length; i++) {
      const m = state[i]; const t1 = teamIndices[m.t1]; const t2 = teamIndices[m.t2];
      if (m.s1 !== null && m.s2 !== null && (m.s1 === 2 || m.s2 === 2)) {
        baseGw[t1] += m.s1; baseGl[t1] += m.s2; baseGw[t2] += m.s2; baseGl[t2] += m.s1;
        if (m.s1 === 2) { baseMw[t1]++; baseMl[t2]++; baseH2h[t1][t2]++; } else if(m.s2 === 2) { baseMw[t2]++; baseMl[t1]++; baseH2h[t2][t1]++; }
      } else { unplayed.push({t1, t2, curS1: m.s1 || 0, curS2: m.s2 || 0}); }
    }
    const unplayedLen = unplayed.length; const simMw = new Int32Array(9); const simGw = new Int32Array(9); const simGl = new Int32Array(9); const simH2h = new Int32Array(81);
    const baseH2hFlat = new Int32Array(81); for(let i=0; i<9; i++) for(let j=0; j<9; j++) baseH2hFlat[i*9+j] = baseH2h[i][j];
    const standings = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < 9; i++) { simMw[i] = baseMw[i]; simGw[i] = baseGw[i]; simGl[i] = baseGl[i]; }
      for (let i = 0; i < 81; i++) { simH2h[i] = baseH2hFlat[i]; }
      for (let i = 0; i < unplayedLen; i++) {
        const m = unplayed[i]; let s1 = m.curS1; let s2 = m.curS2;
        while (s1 < 2 && s2 < 2) { if (seededRandom() > 0.5) s1++; else s2++; }
        simGw[m.t1] += s1; simGl[m.t1] += s2; simGw[m.t2] += s2; simGl[m.t2] += s1;
        if (s1 === 2) { simMw[m.t1]++; simH2h[m.t1 * 9 + m.t2]++; } else { simMw[m.t2]++; simH2h[m.t2 * 9 + m.t1]++; }
      }
      standings.sort((a, b) => {
        if (simMw[b] !== simMw[a]) return simMw[b] - simMw[a]; const gdA = simGw[a] - simGl[a]; const gdB = simGw[b] - simGl[b];
        if (gdB !== gdA) return gdB - gdA; const h2hDiff = simH2h[b * 9 + a] - simH2h[a * 9 + b];
        if (h2hDiff !== 0) return h2hDiff; return TEAMS[a].localeCompare(TEAMS[b]);
      });
      for (let i = 0; i < 9; i++) {
        const teamName = TEAMS[standings[i]];
        if (i < 2) counts[teamName].upper++; if (i >= 2 && i < 6) counts[teamName].playin++;
        if (i < 6) counts[teamName].playoff++; if (i >= 6) counts[teamName].elim++;
      }
    }
    let tempProbs = {};
    TEAMS.forEach(t => { tempProbs[t] = { upper: (counts[t].upper / iterations * 100).toFixed(2), playin: (counts[t].playin / iterations * 100).toFixed(2), playoff: (counts[t].playoff / iterations * 100).toFixed(2), elim: (counts[t].elim / iterations * 100).toFixed(2) }; });
    setProbs(tempProbs);
  }, [state]);

  const triggerCalculation = () => { setIsCalculating(true); setTimeout(() => { runSimulation(); setIsCalculating(false); }, 20); };
  const getProb = (team, type) => parseFloat(probs[team]?.[type] || 0);
  const min = (a, b) => Math.min(a, b);
  const getEmptyFormArray = (len) => Array(Math.max(0, 5 - len)).fill(0);
  const getMatchesByFixed = (fixed) => displayMatches.filter(m => m.fixed === fixed);
  const handleSort = (col) => { if (sortCol === col) setSortAsc(!sortAsc); else { setSortCol(col); setSortAsc(col === 'default'); } };
  const sortHero = (col) => { if (heroSortCol === col) setHeroSortAsc(!heroSortAsc); else { setHeroSortCol(col); setHeroSortAsc(false); } };
  const toggleHighlight = (teamName) => {
    if (highlightedTeam === teamName) setHighlightedTeam(null); else setHighlightedTeam(teamName);
    setFocusFilter('all'); setCoachMessage(null); if (!highlightedTeam) setTimeout(() => scrollToActiveWeek(), 300);
  };
  const changeWeek = (w) => { setCurWeek(w); scrollToActiveWeek(); };
  const onDropdownScore = (event) => {
    let val = event.val === 'null' ? null : parseInt(event.val);
    setState(s => s.map(m => {
      if (m.id === event.id && !m.fixed) {
        let newM = {...m};
        if (event.team === 1) { newM.s1 = val; if (val === 2) { if (newM.s2 === 2 || newM.s2 === null) newM.s2 = 0; } else if (val === 1 || val === 0) newM.s2 = 2; }
        else { newM.s2 = val; if (val === 2) { if (newM.s1 === 2 || newM.s1 === null) newM.s1 = 0; } else if (val === 1 || val === 0) newM.s1 = 2; }
        return newM;
      } return m;
    })); triggerCalculation();
  };
  const clearMatch = (id) => { setState(s => s.map(m => (m.id === id && !m.fixed) ? { ...m, s1: null, s2: null } : m)); triggerCalculation(); };
  const clearCurrentWeek = () => { setState(s => s.map(m => (m.w === curWeek && !m.fixed) ? { ...m, s1: null, s2: null } : m)); triggerCalculation(); };
  const randomizeCurrentWeek = () => { setState(s => s.map(m => { if(!m.fixed && m.w === curWeek && m.s1 === null) { let win = Math.random() > 0.5; let clean = Math.random() > 0.5; return { ...m, s1: win ? 2 : (clean ? 0 : 1), s2: win ? (clean ? 0 : 1) : 2 }; } return m; })); triggerCalculation(); };
  const randomizeRemaining = () => { setState(s => s.map(m => { if(!m.fixed && m.s1 === null) { let win = Math.random() > 0.5; let clean = Math.random() > 0.5; return { ...m, s1: win ? 2 : (clean ? 0 : 1), s2: win ? (clean ? 0 : 1) : 2 }; } return m; })); insightCacheRef.current = {}; triggerCalculation(); };
  const resetSim = () => { setState(s => s.map(m => !m.fixed ? { ...m, s1: null, s2: null } : m)); insightCacheRef.current = {}; determineCurrentWeek(); triggerCalculation(); };
  const saveLocalScenario = (slotNum) => { const dataToSave = state.filter(m => !m.fixed).map(m => ({ id: m.id, s1: m.s1, s2: m.s2 })); localStorage.setItem(`mpl_id_scenario_slot_${slotNum}`, JSON.stringify(dataToSave)); triggerToast(`Prediksi berhasil disimpan ke Slot ${slotNum}`); };
  const loadLocalScenario = (slotNum) => {
    const savedStr = localStorage.getItem(`mpl_id_scenario_slot_${slotNum}`);
    if(savedStr) {
      const savedData = JSON.parse(savedStr); setState(s => s.map(m => { const sm = savedData.find((x) => x.id === m.id); return (sm && !m.fixed) ? { ...m, s1: sm.s1, s2: sm.s2 } : m; }));
      triggerCalculation(); triggerToast(`Memuat Skenario dari Slot ${slotNum}`);
    } else { triggerToast(`Slot ${slotNum} masih kosong!`, true); }
  };
  const triggerToast = (msg, isError = false) => { setToastMsg(msg); setIsToastError(isError); setShowToast(true); setTimeout(() => setShowToast(false), 3000); };
  const shareStandings = () => {
    let text = "🔮 MPL ID S17 Predictor - Klasemen Saat Ini:\n";
    sortedList.forEach((t, i) => { let tag = parseFloat(probs[t.n]?.upper) === 100 ? " [U]" : (parseFloat(probs[t.n]?.playoff) === 100 ? " [P]" : (parseFloat(probs[t.n]?.playoff) === 0 ? " [E]" : "")); text += `${i+1}. ${t.n} (${t.mw}-${t.ml})${tag}\n`; });
    const predictedMatches = state.filter(m => !m.fixed && m.s1 !== null && m.s2 !== null);
    if (predictedMatches.length > 0) { text += "\n🎯 Hasil Prediksi Skor:\n"; predictedMatches.forEach(m => { text += `- ${TEAM_ABBR[m.t1] || m.t1} ${m.s1} - ${m.s2} ${TEAM_ABBR[m.t2] || m.t2} (W${m.w})\n`; }); }
    text += "\nBuat prediksimu sendiri!";
    navigator.clipboard.writeText(text).then(() => triggerToast("Teks Prediksi Disalin ke Clipboard!"));
  };

  const getDisplayMatches = (currentState, focusTeam, filter, currentList) => {
    let matches = currentState;
    if (focusTeam) {
      matches = matches.filter(m => m.t1 === focusTeam || m.t2 === focusTeam);
      if (filter === 'win') matches = matches.filter(m => { if (m.s1 === null || m.s2 === null) return false; let myScore = m.t1 === focusTeam ? m.s1 : m.s2; let oppScore = m.t1 === focusTeam ? m.s2 : m.s1; return myScore > oppScore; });
      else if (filter === 'lose') matches = matches.filter(m => { if (m.s1 === null || m.s2 === null) return false; let myScore = m.t1 === focusTeam ? m.s1 : m.s2; let oppScore = m.t1 === focusTeam ? m.s2 : m.s1; return myScore < oppScore; });
    } else { matches = matches.filter(m => m.w === curWeek); }
    return matches.map(m => {
      let h2hT1 = 0, h2hT2 = 0;
      currentState.forEach(x => { if (x.fixed && x.id !== m.id) { if (x.t1 === m.t1 && x.t2 === m.t2) { if (x.s1 > x.s2) h2hT1++; else h2hT2++; } else if (x.t1 === m.t2 && x.t2 === m.t1) { if (x.s2 > x.s1) h2hT1++; else h2hT2++; } } });
      let encounters = currentState.filter(x => x.fixed && ((x.t1 === m.t1 && x.t2 === m.t2) || (x.t1 === m.t2 && x.t2 === m.t1))).sort((a,b) => a.id - b.id);
      let h2hText = encounters.length > 0 ? encounters.map((enc, idx) => `Leg ${idx+1}: ${TEAM_ABBR[enc.s1 > enc.s2 ? enc.t1 : enc.t2]} ${Math.max(enc.s1, enc.s2)}-${Math.min(enc.s1, enc.s2)}`).join('\n') : 'Belum bertemu';
      let rankT1 = currentList.find(t => t.n === m.t1)?.trueRank || 0; let rankT2 = currentList.find(t => t.n === m.t2)?.trueRank || 0;
      let isCrucial = (!m.fixed && (rankT1 >= 3 && rankT1 <= 7) && (rankT2 >= 3 && rankT2 <= 7) && Math.abs(rankT1 - rankT2) <= 3);
      let focusResult = null;
      if (focusTeam && (m.s1 !== null || m.fixed)) { let focusScore = m.t1 === focusTeam ? m.s1 : m.s2; let oppScore = m.t1 === focusTeam ? m.s2 : m.s1; if (focusScore > oppScore) focusResult = 'WIN'; else if (focusScore < oppScore) focusResult = 'LOSE'; }
      let borderClass = 'border-slate-700 bg-[#121826] hover:bg-[#1a2333]';
      let isFocusCard = focusTeam && (m.t1 === focusTeam || m.t2 === focusTeam);
      if (isFocusCard) borderClass = 'border-yellow-500/50 bg-yellow-900/10 hover:bg-yellow-900/20 shadow-[0_0_15px_rgba(234,179,8,0.05)]';
      else if (!isFocusCard && (m.t1 === 'RRQ Hoshi' || m.t2 === 'RRQ Hoshi')) borderClass = 'border-orange-500/40 bg-orange-950/20 hover:bg-orange-950/30';
      return { ...m, h2hT1, h2hT2, h2hText, isCrucial, focusResult, borderClass, isFocusCard };
    });
  };

  const openDraftModal = (match) => setDraftModalMatch(match);
  const closeDraftModal = () => setDraftModalMatch(null);
  const openHeroDetail = (hero) => setHeroDetailModal(hero);
  const closeHeroDetail = () => setHeroDetailModal(null);

  const triggerAiInsight = async (teamName) => {
    let teamData = sortedList.find(t => t.n === teamName); if(!teamData) return;
    let seed = getStateSeed(state); let cacheKey = `${teamName}-${seed}`;
    if (insightCacheRef.current[cacheKey]) { setCurrentAiInsight(insightCacheRef.current[cacheKey]); return; }
    setIsAiLoading(true); setCurrentAiInsight(null);
    const pPlayoff = parseFloat(probs[teamName].playoff); let magicNum = null;
    if (pPlayoff !== 100 && pPlayoff !== 0) {
      let remaining = state.filter(m => !m.fixed && (m.t1 === teamName || m.t2 === teamName)).length;
      for (let wins = 0; wins <= remaining; wins++) {
        let simState = state.map(m => { if (m.fixed || (m.t1 !== teamName && m.t2 !== teamName)) return m; if (m.s1 !== null) return m; return { ...m }; });
        let teamMatches = simState.filter(m => !m.fixed && m.s1 === null && (m.t1 === teamName || m.t2 === teamName));
        let filledIds = new Set();
        teamMatches.forEach((m, idx) => { let isHome = m.t1 === teamName; m.s1 = idx < wins ? (isHome ? 2 : 0) : (isHome ? 0 : 2); m.s2 = idx < wins ? (isHome ? 0 : 2) : (isHome ? 2 : 0); filledIds.add(m.id); });
        simState = simState.map(m => m.s1 === null ? { ...m, s1: 1, s2: 2 } : m);
        let res = calculate(simState); if (res.findIndex((t) => t.n === teamName) < 6) { magicNum = wins; break; }
      }
      if(magicNum === null) magicNum = remaining;
    }
    let teamPicks = {}; let teamBans = {}; let oppBans = {}; let teamCombos = {};
    Object.entries(filteredDraftState).forEach(([mId, games]) => {
      const match = state.find(x => x.id == parseInt(mId)); if (!match) return;
      const isT1 = match.t1 === teamName; const isT2 = match.t2 === teamName; if (!isT1 && !isT2) return;
      games.forEach(g => {
        let myPicks = isT1 ? g.t1Picks : g.t2Picks; let myBans = isT1 ? g.t1Bans : g.t2Bans; let opBans = isT1 ? g.t2Bans : g.t1Bans; let myRes = isT1 ? g.t1Result : g.t2Result;
        let validPicks = myPicks.filter((h) => h);
        validPicks.forEach((h) => { if(!teamPicks[h]) teamPicks[h] = {games: 0, wins: 0}; teamPicks[h].games++; if(myRes === 'W') teamPicks[h].wins++; });
        for(let i=0; i<validPicks.length; i++) { for(let j=i+1; j<validPicks.length; j++) { let combo = [validPicks[i], validPicks[j]].sort().join(' + '); teamCombos[combo] = (teamCombos[combo] || 0) + 1; } }
        myBans.filter((h)=>h).forEach((h) => teamBans[h] = (teamBans[h]||0)+1);
        opBans.filter((h)=>h).forEach((h) => oppBans[h] = (oppBans[h]||0)+1);
      });
    });
    const topPicks = Object.entries(teamPicks).sort((a,b) => b[1].games - a[1].games).slice(0, 4).map(x => `${x[0]} (${x[1].games}x, WR ${Math.round((x[1].wins/x[1].games)*100)}%)`);
    const topBans = Object.entries(teamBans).sort((a,b) => b[1] - a[1]).slice(0, 3).map(x => `${x[0]} (${x[1]}x)`);
    const topOppBans = Object.entries(oppBans).sort((a,b) => b[1] - a[1]).slice(0, 3).map(x => `${x[0]} (${x[1]}x)`);
    const topCombos = Object.entries(teamCombos).sort((a,b) => b[1] - a[1]).slice(0, 3).map(x => `${x[0]} (${x[1]}x)`);
    const heroDataText = `\n[Analisis Draft & Hero Tim]\n- Hero Paling Sering Dipakai & Winrate: ${topPicks.length > 0 ? topPicks.join(', ') : 'Belum ada data'}\n- Kombinasi Duo Hero Sering Dipakai: ${topCombos.length > 0 ? topCombos.join(', ') : 'Belum ada data'}\n- Hero Paling Sering Di-Ban OLEH Tim Ini: ${topBans.length > 0 ? topBans.join(', ') : 'Belum ada data'}\n- Hero Paling Sering Di-Ban MUSUH saat lawan tim ini (Target Banned): ${topOppBans.length > 0 ? topOppBans.join(', ') : 'Belum ada data'}`;
    const played = teamData.mw + teamData.ml; const remaining = 16 - played; const remOpp = state.filter(m => !m.fixed && m.s1 === null && (m.t1 === teamName || m.t2 === teamName)).map(m => m.t1 === teamName ? m.t2 : m.t1);
    const rivals = sortedList.filter(t => t.n !== teamName && (Math.abs(t.trueRank - teamData.trueRank) <= 2 || Math.abs(t.mw - teamData.mw) <= 1)).map(t => TEAM_ABBR[t.n] || t.n);
    const form5 = teamData.form.map((f) => f.res).join(''); const abbr = TEAM_ABBR[teamName] || teamName;
    let statusColor = 'from-blue-900/60 to-slate-900/80 border-blue-600/40'; let statusLabel = `Peringkat ${teamData.trueRank}`; const pUpper = parseFloat(probs[teamName].upper);
    if (pPlayoff === 100 && pUpper === 100) { statusColor = 'from-amber-900/60 to-slate-900/80 border-amber-500/40'; statusLabel = '🔒 Upper Bracket'; }
    else if (pPlayoff === 100) { statusColor = 'from-emerald-900/60 to-slate-900/80 border-emerald-500/40'; statusLabel = '✅ Playoff Aman'; }
    else if (pPlayoff === 0) { statusColor = 'from-red-900/60 to-slate-900/80 border-red-500/40'; statusLabel = '❌ Tereliminasi'; }
    else if (pPlayoff >= 75) { statusColor = 'from-emerald-900/40 to-slate-900/80 border-emerald-600/30'; statusLabel = '🟢 Posisi Kuat'; }
    else if (pPlayoff >= 40) { statusColor = 'from-yellow-900/40 to-slate-900/80 border-yellow-600/30'; statusLabel = '🟡 Zona Bahaya'; }
    else { statusColor = 'from-red-900/40 to-slate-900/80 border-red-600/30'; statusLabel = '🔴 Butuh Keajaiban'; }
    let fallbackData = { abbr, rank: teamData.trueRank, mw: teamData.mw, ml: teamData.ml, remOppLength: remOpp.length, magicNum, pPlayoff, pUpper, pPlayin: probs[teamName].playin, pElim: probs[teamName].elim, form5, statusColor, statusLabel, teamName };
    try {
      const prompt = `Berdasarkan data berikut untuk tim ${teamName} (singkatan: ${abbr}):\n- Peringkat: ${teamData.trueRank} dari 9 tim\n- Rekor: ${teamData.mw}W - ${teamData.ml}L\n- Game Diff: ${teamData.gw - teamData.gl > 0 ? '+' : ''}${teamData.gw - teamData.gl}\n- Lawan Sisa: [${remOpp.map(o => TEAM_ABBR[o]||o).join(', ')||'selesai'}]\n- Form 5 Laga: ${form5 || 'belum ada data'}\n- Prob Playoff: ${pPlayoff}%, Prob Upper Bracket: ${pUpper}%\n- Magic Number Playoff: ${magicNum === null ? (pPlayoff===100 ? 'Aman' : 'Tereliminasi') : magicNum}\n- Pesaing Terdekat: ${rivals.slice(0,4).join(', ')||'-'}\n${heroDataText}\nBerikan 5 poin insight analisis yang SANGAT DETAIL, komprehensif, dan tajam dalam Bahasa Indonesia. Bahas peluang mereka, kekuatan/kelemahan form mereka, dan spesifik bedah strategi draft mereka berdasarkan statistik hero pick, ban, winrate hero, dan kombo di atas.`;
      const payload = { contents: [{ parts: [{ text: prompt }] }], systemInstruction: { parts: [{ text: "Kamu adalah analis esports profesional MPL ID S17. Jangan batasi responmu, buatlah analisis detail dan panjang." }] }, generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { insights: { type: "ARRAY", items: { type: "STRING", description: "Analisis detail dan panjang, sekitar 30-60 kata per insight." } } } } } };
      const data = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=`, payload);
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text; let parsed = { insights: [] };
      if (rawText) { try { parsed = JSON.parse(rawText); } catch(e) {} }
      insightCacheRef.current[cacheKey] = { ...fallbackData, texts: parsed.insights || [] };
    } catch (err) {
      let texts = []; texts.push(`📊 Berada di peringkat ${teamData.trueRank} dengan rekor ${teamData.mw}W-${teamData.ml}L. Game diff ${teamData.gw - teamData.gl > 0 ? '+' : ''}${teamData.gw - teamData.gl}.`);
      if (pPlayoff === 100 && pUpper === 100) texts.push(`🏆 Upper Bracket TERKUNCI. Tim ini dipastikan finis Top 2.`); else if (pPlayoff === 100) texts.push(`✅ Tiket Playoff AMAN. Tidak mungkin terdepak dari Top 6.`); else if (pPlayoff === 0) texts.push(`❌ Secara matematis sudah TERELIMINASI dari persaingan Playoff.`); else if (magicNum !== null) texts.push(`🎯 Magic Number: butuh minimal ${magicNum} kemenangan lagi dari ${remOpp.length} laga sisa.`);
      if (topPicks.length > 0) texts.push(`⚔️ Kunci kekuatan ada di pick andalan: ${topPicks.join(', ')}.`); if (topOppBans.length > 0) texts.push(`🛡️ Tim lawan sangat mewaspadai hero: ${topOppBans.join(', ')}.`); if (topCombos.length > 0) texts.push(`🔥 Kombo berbahaya yang sering digunakan: ${topCombos.join(', ')}.`);
      insightCacheRef.current[cacheKey] = { ...fallbackData, texts: texts.slice(0, 5) };
    }
    setCurrentAiInsight(insightCacheRef.current[cacheKey]); setIsAiLoading(false);
  };

  const fetchWithRetry = async (url, payload, retries = 5) => {
    const delays = [1000, 2000, 4000, 8000, 16000];
    for (let i = 0; i < retries; i++) {
      try { const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); return await response.json(); } catch (e) { if (i === retries - 1) throw e; await new Promise(res => setTimeout(res, delays[i])); }
    }
  };

  const askCoachGemini = async (teamName) => {
    if (isCoachLoading) return; setIsCoachLoading(true); setCoachMessage(null);
    let teamData = sortedList.find(t => t.n === teamName); if(!teamData) { setIsCoachLoading(false); return; }
    try {
      const prompt = `Berikan pep talk/pesan motivasi singkat (maksimal 40 kata) bergaya coach esports profesional yang berapi-api untuk tim ${teamName}.\nKondisi saat ini: rekor ${teamData.mw} Menang, ${teamData.ml} Kalah. Peringkat ${teamData.trueRank} klasemen.`;
      const payload = { contents: [{ parts: [{ text: prompt }] }], systemInstruction: { parts: [{ text: "Kamu adalah coach esports yang penuh semangat dan motivasi." }] } };
      const data = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=`, payload);
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text; setCoachMessage(text || "Tetap semangat dan fokus pada pertandingan berikutnya!");
    } catch(e) { setCoachMessage("Maaf, Coach sedang sibuk menyusun strategi. Coba lagi nanti!"); } finally { setIsCoachLoading(false); }
  };

  const addComboHero = (hero) => { if (customComboHeroes.length < 5 && !customComboHeroes.includes(hero)) { setCustomComboHeroes(arr => [...arr, hero]); } setCustomComboInput(''); setShowComboDropdown(false); };
  const removeComboHero = (hero) => { setCustomComboHeroes(arr => arr.filter(h => h !== hero)); };
  const hideComboDropdownWithDelay = () => { setTimeout(() => setShowComboDropdown(false), 200); };

  // JSX Render
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
            <div className="absolute inset-2 rounded-full border-2 border-blue-400/40 animate-ping" style={{animationDelay: '0.2s'}}></div>
            <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-[0_0_30px_rgba(59,130,246,0.6)] flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg></div>
          </div>
          <div className="mt-8 text-blue-400 font-bold tracking-widest animate-pulse text-sm">Menyinkronkan Database...</div>
        </div>
      )}
      <div className={`host-wrapper text-slate-100 min-h-screen pb-12 relative bg-[#0b0f1a] font-sans ${!isAppReady ? 'opacity-0' : 'opacity-100 transition-opacity duration-1000'}`}>
        <div className={`fixed top-5 left-1/2 text-white px-6 py-3 rounded-full shadow-2xl font-bold z-[10000] pointer-events-none flex items-center gap-2 toast-container ${showToast ? 'toast-show' : ''} ${isToastError ? 'bg-red-600' : 'bg-emerald-600'}`}><span>{toastMsg}</span></div>
        <div className="bg-[#0c0c0c] border-b border-[#333] sticky top-0 z-[100] shadow-xl">
          <div className="max-w-[1400px] mx-auto px-4 flex justify-between items-center">
            <div className="flex">
              <button onClick={() => switchTab('standings')} className={`px-4 md:px-6 py-4 font-black uppercase tracking-wider text-xs md:text-sm transition-all border-b-2 flex items-center gap-2 ${activeTab === 'standings' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg> Standings</button>
              <button onClick={() => switchTab('analytics')} className={`px-4 md:px-6 py-4 font-black uppercase tracking-wider text-xs md:text-sm transition-all border-b-2 flex items-center gap-2 ${activeTab === 'analytics' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg> Hero Statistics</button>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={toggleAdmin} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 transition-all cursor-pointer ${isAdminMode ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50 shadow' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'}`}><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> {isAdminMode ? 'Admin Active' : 'Admin Login'}</button>
            </div>
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto px-4 pt-6">
          {activeTab === 'standings' && (
            <>
              <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-center md:text-left">
                  <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic flex items-center justify-center md:justify-start gap-3">MPL ID S17 <span className="text-blue-500">PREDICTOR</span></h1>
                  <p className="text-slate-400 font-medium mt-1">Simulasi Skenario & AI Analisis Klasemen</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 bg-slate-800/50 p-2 rounded-2xl border border-slate-700">
                  <div className="px-4 py-2 border-r border-slate-700 flex flex-col justify-center">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest">Data Master</span>
                    <span className={`font-bold text-sm ${syncColor}`}>{syncStatus}</span>
                  </div>
                  <button onClick={shareStandings} className="bg-slate-800 border border-slate-600 hover:bg-blue-600 text-slate-200 hover:text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm">Share</button>
                  <div className="relative group z-[60]">
                    <button className="bg-slate-800 border border-slate-600 hover:bg-indigo-600 text-slate-200 hover:text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm">Skenario ▾</button>
                    <div className="absolute left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-0 mt-2 w-[220px] bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all overflow-hidden z-[100]">
                      <div className="p-2.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest border-b border-slate-700 bg-slate-900/80 text-center">Simpan Skenario</div>
                      <div className="p-3 flex flex-wrap justify-center gap-2 border-b border-slate-700 bg-slate-800">
                        {[1,2,3,4,5,6,7,8,9].map(slot => <button key={slot} onClick={() => saveLocalScenario(slot)} className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-emerald-500 hover:text-white font-black text-xs transition-all">{slot}</button>)}
                      </div>
                      <div className="p-2.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest border-b border-slate-700 bg-slate-900/80 text-center">Muat Skenario</div>
                      <div className="p-3 flex flex-wrap justify-center gap-2 bg-slate-800">
                        {[1,2,3,4,5,6,7,8,9].map(slot => <button key={slot} onClick={() => loadLocalScenario(slot)} className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-blue-500 hover:text-white font-black text-xs transition-all">{slot}</button>)}
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
                      {isCalculating && <div className="flex items-center justify-center p-1" title="Menghitung..."><svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>}
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col justify-between overflow-x-auto overflow-y-hidden bg-[#111]">
                    <div className="w-full">
                      <table className="liqui-table text-left whitespace-nowrap w-full">
                        <thead>
                          <tr>
                            <th className="w-8 text-center cursor-pointer hover:bg-[#333]" onClick={() => handleSort('default')}># <span className="text-[10px] text-blue-400">{sortCol==='default' ? (sortAsc?'▲':'▼') : ''}</span></th>
                            <th>Team</th>
                            <th className="text-center w-12">M</th><th className="text-center w-12">G</th><th className="text-center w-12">Diff</th>
                            <th className="text-center w-24">Form</th>
                            <th className="text-center text-[11px] text-emerald-400 w-14 cursor-pointer" onClick={() => handleSort('playoff')}>Playoff {sortCol==='playoff' ? (sortAsc?'▲':'▼') : ''}</th>
                            <th className="text-center text-[11px] text-amber-500 w-14 cursor-pointer" onClick={() => handleSort('upper')}>Upper {sortCol==='upper' ? (sortAsc?'▲':'▼') : ''}</th>
                            <th className="text-center text-[11px] text-blue-400 w-14 cursor-pointer" onClick={() => handleSort('playin')}>Play In {sortCol==='playin' ? (sortAsc?'▲':'▼') : ''}</th>
                            <th className="text-center text-[11px] text-red-500 w-14 cursor-pointer" onClick={() => handleSort('elim')}>Elim {sortCol==='elim' ? (sortAsc?'▲':'▼') : ''}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedList.map((t, i) => (
                            <tr key={t.n} className={`border-b border-[#333] transition-colors ${i % 2 === 0 ? 'liqui-row-even' : 'liqui-row-odd'} ${highlightedTeam === t.n ? 'ring-2 ring-blue-500 ring-inset bg-blue-900/20' : 'hover:bg-[#2a2a2a]'} ${highlightedTeam && highlightedTeam !== t.n ? 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100' : ''}`}>
                              <td className={`text-center font-bold text-[14px] py-1.5 ${t.trueRank > 6 ? 'rank-eliminated' : 'rank-playoff'}`}>{t.trueRank}.</td>
                              <td className="py-1.5 px-2 flex items-center gap-2 min-w-[130px]">
                                {teamLogos[t.n] ? <img src={teamLogos[t.n]} className="w-6 h-6 object-contain shrink-0" /> : <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black shrink-0 bg-slate-800">{t.n.substring(0,2).toUpperCase()}</div>}
                                <div className="flex items-center">
                                  <span onClick={() => toggleHighlight(t.n)} className={`team-link cursor-pointer ${highlightedTeam === t.n ? 'text-yellow-400 font-black' : ''}`}>{t.n}</span>
                                  {getProb(t.n, 'upper') === 100 && <span className="text-[10px] text-amber-500 font-black ml-1 bg-amber-500/20 px-1 rounded">[U]</span>}
                                  {getProb(t.n, 'upper') !== 100 && getProb(t.n, 'playoff') === 100 && <span className="text-[10px] text-emerald-500 font-black ml-1 bg-emerald-500/20 px-1 rounded">[P]</span>}
                                  {getProb(t.n, 'playoff') === 0 && <span className="text-[10px] text-red-500 font-black ml-1 bg-red-500/20 px-1 rounded">[E]</span>}
                                </div>
                              </td>
                              <td className="py-1.5 px-2 text-center font-bold text-white">{t.mw} - {t.ml}</td>
                              <td className="py-1.5 px-2 text-center text-gray-300">{t.gw} - {t.gl}</td>
                              <td className={`py-1.5 px-2 text-center font-bold ${(t.gw - t.gl) > 0 ? 'text-white' : ((t.gw - t.gl) < 0 ? 'text-red-400' : 'text-gray-400')}`}>{(t.gw - t.gl) > 0 ? '+' : ''}{t.gw - t.gl}</td>
                              <td className="py-1.5 px-1 text-center whitespace-nowrap">
                                <div className="flex gap-1 justify-center items-center min-w-[105px]">
                                  {getEmptyFormArray(t.form.length).map((_, idx) => <div key={`empty-${idx}`} className="w-[18px] h-[18px] rounded-full bg-slate-700/50 flex items-center justify-center text-[9px] text-slate-500 border border-slate-600/50 shrink-0">-</div>)}
                                  {t.form.map((fMatch, idx) => (
                                    teamLogos[fMatch.opp] ? <img key={idx} src={teamLogos[fMatch.opp]} className="w-[18px] h-[18px] rounded-full object-contain bg-slate-800 shrink-0" className={`${fMatch.res === 'W' ? 'ring-1 ring-emerald-500 border border-emerald-900' : 'ring-1 ring-red-500 border border-red-900'}`} title={`${fMatch.res} vs ${fMatch.opp}`} /> : <div key={idx} className={`w-[18px] h-[18px] rounded-full bg-slate-800 flex items-center justify-center text-[8px] font-black text-white shrink-0 ${fMatch.res === 'W' ? 'ring-1 ring-emerald-500 border border-emerald-900' : 'ring-1 ring-red-500 border border-red-900'}`}>{fMatch.opp.substring(0,2).toUpperCase()}</div>
                                  ))}
                                </div>
                              </td>
                              <td className="py-1.5 px-1.5 text-center text-[12px] font-semibold text-emerald-400 border-l border-[#333] bg-prob-cell"><div className="prob-bar bg-emerald-500" style={{width: `${getProb(t.n, 'playoff')}%`}}></div>{getProb(t.n, 'playoff')}%</td>
                              <td className="py-1.5 px-1.5 text-center text-[12px] font-semibold text-amber-500 bg-prob-cell"><div className="prob-bar bg-amber-500" style={{width: `${getProb(t.n, 'upper')}%`}}></div>{getProb(t.n, 'upper')}%</td>
                              <td className="py-1.5 px-1.5 text-center text-[12px] font-semibold text-blue-400 bg-prob-cell"><div className="prob-bar bg-blue-500" style={{width: `${getProb(t.n, 'playin')}%`}}></div>{getProb(t.n, 'playin')}%</td>
                              <td className="py-1.5 px-1.5 text-center text-[12px] font-semibold text-red-500 bg-prob-cell"><div className="prob-bar bg-red-500" style={{width: `${getProb(t.n, 'elim')}%`}}></div>{getProb(t.n, 'elim')}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-5 bg-slate-800/60 backdrop-blur-md rounded-3xl border border-slate-700 shadow-2xl flex flex-col h-[550px] md:h-[600px] lg:h-full overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-700 bg-[#121826] shrink-0 flex items-center justify-between gap-4 h-[60px]">
                    <div id="weekNavScroll" className="flex gap-2 overflow-x-auto scrollbar-hide flex-1 scroll-smooth">
                      {highlightedTeam ? (
                        <div onClick={() => toggleHighlight(highlightedTeam)} className="bg-blue-900/40 text-blue-300 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-between gap-2 border border-blue-500/50 w-full cursor-pointer hover:bg-red-900/40 hover:border-red-500/50 hover:text-red-300 transition-all" title="Klik untuk membatalkan mode fokus">
                          <span>Fokus: {TEAM_ABBR[highlightedTeam] || highlightedTeam}</span>
                          <span className="text-[10px] uppercase font-black tracking-widest opacity-70">✕ Tutup</span>
                        </div>
                      ) : (
                        [1,2,3,4,5,6,7,8,9].map(w => (
                          <button key={w} id={`week-btn-${w}`} onClick={() => changeWeek(w)} className={`px-4 py-1.5 rounded-xl border text-xs font-black transition-all shrink-0 ${w === curWeek ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>W{w}</button>
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
                              <img src={teamLogos[highlightedTeam]} className="w-14 h-14 object-contain drop-shadow-xl" />
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
                            <button onClick={() => setFocusFilter('all')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${focusFilter === 'all' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-500' : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 border border-slate-700'}`}>Semua</button>
                            <button onClick={() => setFocusFilter('win')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${focusFilter === 'win' ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-500' : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 border border-slate-700'}`}>Win</button>
                            <button onClick={() => setFocusFilter('lose')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${focusFilter === 'lose' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] border border-red-500' : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 border border-slate-700'}`}>Lose</button>
                          </div>
                        </div>
                        {getMatchesByFixed(true).length > 0 && (
                          <>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Riwayat Pertandingan</h3>
                            {getMatchesByFixed(true).map(m => <MatchCard key={m.id} m={m} highlightedTeam={highlightedTeam} teamLogos={teamLogos} isAdminMode={isAdminMode} isHistoryMatch={isHistoryMatch} clearMatch={clearMatch} openDraftModal={openDraftModal} showPreview={showPreview} updatePreviewPos={updatePreviewPos} hidePreview={hidePreview} onDropdownScore={onDropdownScore} unlockGlobalScore={unlockGlobalScore} lockGlobalScore={lockGlobalScore} />)}
                          </>
                        )}
                        {getMatchesByFixed(false).length > 0 && focusFilter === 'all' && (
                          <>
                            <h3 id="focus-upcoming-header" className="text-xs font-bold text-yellow-500 uppercase tracking-widest mb-3 mt-4 pt-4 border-t border-slate-700">Sisa Jadwal Pertandingan</h3>
                            {getMatchesByFixed(false).map(m => <MatchCard key={m.id} m={m} highlightedTeam={highlightedTeam} teamLogos={teamLogos} isAdminMode={isAdminMode} isHistoryMatch={isHistoryMatch} clearMatch={clearMatch} openDraftModal={openDraftModal} showPreview={showPreview} updatePreviewPos={updatePreviewPos} hidePreview={hidePreview} onDropdownScore={onDropdownScore} unlockGlobalScore={unlockGlobalScore} lockGlobalScore={lockGlobalScore} />)}
                          </>
                        )}
                        {displayMatches.length === 0 && <div className="text-center text-slate-500 py-10 font-bold border-2 border-dashed border-slate-700 rounded-2xl bg-slate-800/30">Tidak ada data untuk filter yang dipilih.</div>}
                      </>
                    ) : (
                      displayMatches.map(m => <MatchCard key={m.id} m={m} highlightedTeam={highlightedTeam} teamLogos={teamLogos} isAdminMode={isAdminMode} isHistoryMatch={isHistoryMatch} clearMatch={clearMatch} openDraftModal={openDraftModal} showPreview={showPreview} updatePreviewPos={updatePreviewPos} hidePreview={hidePreview} onDropdownScore={onDropdownScore} unlockGlobalScore={unlockGlobalScore} lockGlobalScore={lockGlobalScore} />)
                    )}
                  </div>
                </div>
              </div>
              {highlightedTeam && currentAiInsight && (
                <div className="mt-6 w-full lg:w-7/12 transition-all duration-500">
                  <div className={`bg-gradient-to-br border rounded-2xl shadow-2xl overflow-hidden transition-all duration-500 ${currentAiInsight.statusColor}`}>
                    <div className="px-6 pt-5 pb-4 border-b border-slate-700/50 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-600/80 shadow-lg"><svg width="18" height="18" fill="none" stroke="white" strokeWidth="2.5"><path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg></div>
                        <div>
                          <h3 className="text-white font-black text-base flex items-center gap-2">AI Insight <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold">✨ GEMINI</span></h3>
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
                              <span className="shrink-0">{['📊', '⚔️', '🔥', '🎯'][idx] || '💡'}</span>
                              <p className="text-sm text-slate-300 leading-relaxed">{text}</p>
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
          {activeTab === 'analytics' && (
            <div className="animate-fade-in pb-8">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-4 gap-4">
                <div>
                  <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3"><span className="text-emerald-500">ADVANCED</span> ANALYTICS</h1>
                  <p className="text-slate-400 text-sm font-medium mt-1">Data Meta Hero & Signature Picks MPL ID S17</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 bg-slate-800/80 p-2 rounded-xl border border-slate-700 w-full lg:w-auto shadow-inner">
                  <div className="relative flex-1 lg:w-48">
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input type="text" value={heroSearchQuery} onChange={updateSearch} placeholder="Cari hero..." className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-blue-500 font-bold" />
                  </div>
                  <select value={heroRoleFilter} onChange={updateRoleFilter} className="bg-slate-900 border border-slate-600 text-white rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-emerald-500 font-bold cursor-pointer outline-none">
                    <option value="All">All Roles</option>
                    {heroRoleKeys.map(role => <option key={role} value={role}>{role}</option>)}
                  </select>
                </div>
              </div>
              <div className="mb-8">
                <h3 className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2 flex items-center gap-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Map Overview Filter</h3>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                  <button onClick={() => setHeroMapFilter('All')} className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm border ${heroMapFilter === 'All' ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-[#111827] text-slate-400 border-slate-700 hover:bg-slate-800'}`}>🌍 Compare All Maps</button>
                  {MAP_LIST.map(m => <button key={m} onClick={() => setHeroMapFilter(m)} className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm border ${heroMapFilter === m ? 'bg-emerald-600 text-white border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-[#111827] text-slate-400 border-slate-700 hover:bg-slate-800'}`}>📍 {m}</button>)}
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
                    <div className="relative z-10"><h4 className="text-[10px] text-orange-400 font-black uppercase tracking-widest mb-1">🔥 Most Picked</h4><div className="text-xl font-black text-white leading-tight truncate w-[90px]">{mapOverviewStats.topPick.name || '-'}</div><div className="text-[10px] font-bold text-slate-400">{mapOverviewStats.topPick.count} Picks</div></div>
                    {mapOverviewStats.topPick.name && <img src={getHeroIcon(mapOverviewStats.topPick.name)} className="w-12 h-12 rounded-lg border border-orange-500/50 object-cover shadow-lg relative z-10" />}
                  </div>
                  <div className="bg-gradient-to-br from-[#111827] to-[#0b0f19] border border-slate-700/50 p-4 rounded-2xl shadow-lg relative overflow-hidden group flex items-center justify-between">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl -mr-4 -mt-4 transition-all group-hover:bg-red-500/20"></div>
                    <div className="relative z-10"><h4 className="text-[10px] text-red-400 font-black uppercase tracking-widest mb-1">🚫 Most Banned</h4><div className="text-xl font-black text-white leading-tight truncate w-[90px]">{mapOverviewStats.topBan.name || '-'}</div><div className="text-[10px] font-bold text-slate-400">{mapOverviewStats.topBan.count} Bans</div></div>
                    {mapOverviewStats.topBan.name && <img src={getHeroIcon(mapOverviewStats.topBan.name)} className="w-12 h-12 rounded-lg border border-red-500/50 object-cover grayscale shadow-lg relative z-10" />}
                  </div>
                </div>
              )}
              {mapAssistant && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 animate-fade-in">
                  <div className="bg-[#111827] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                    <div className="px-5 py-3 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                      <h3 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Draft Assistant</h3>
                      <span className="text-[9px] bg-blue-900/50 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30 uppercase tracking-widest font-black">{heroMapFilter === 'All' ? 'Global' : heroMapFilter}</span>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-4 flex-1">
                      <div className="space-y-3">
                        <div className="text-[10px] text-emerald-400 font-black uppercase tracking-widest border-b border-emerald-900/50 pb-1.5 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Recommended Picks</div>
                        {mapAssistant.recPicks.map(h => (
                          <div key={h.name} className="flex items-center gap-2 group cursor-pointer" onClick={() => openHeroDetail(h.name)}>
                            <img src={getHeroIcon(h.name)} className="w-7 h-7 rounded-lg border border-emerald-500/30 object-cover group-hover:scale-110 transition-transform" />
                            <div><div className="text-xs font-bold text-slate-200">{h.name}</div><div className="text-[9px] text-emerald-400">{h.w_rate}% WR ({h.picks} Picks)</div></div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-3 border-l border-slate-700 pl-4">
                        <div className="text-[10px] text-red-400 font-black uppercase tracking-widest border-b border-red-900/50 pb-1.5 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Recommended Bans</div>
                        {mapAssistant.recBans.map(h => (
                          <div key={h.name} className="flex items-center gap-2 group cursor-pointer" onClick={() => openHeroDetail(h.name)}>
                            <img src={getHeroIcon(h.name)} className="w-7 h-7 rounded-lg border border-red-500/30 object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-transform" />
                            <div><div className="text-xs font-bold text-slate-200">{h.name}</div><div className="text-[9px] text-red-400">{h.bans} Bans</div></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#111827] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                    <div className="px-5 py-3 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                      <h3 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> Map Tier List</h3>
                    </div>
                    <div className="p-5 flex flex-col gap-4 flex-1 justify-center">
                      <div className="flex items-center gap-3 bg-[#0b0f1a] border border-slate-700/50 rounded-xl p-2.5 shadow-inner">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-black text-xl shadow-[0_0_10px_rgba(250,204,21,0.4)] shrink-0 border border-yellow-300/50">S</div>
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1 py-1">
                          {mapAssistant.sTier.map(h => <div key={h.name} className="relative group cursor-pointer shrink-0" onClick={() => openHeroDetail(h.name)}><img src={getHeroIcon(h.name)} className="w-10 h-10 rounded border-2 border-yellow-500/80 object-cover hover:scale-110 transition-all shadow-md" title={h.name} /></div>)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-[#0b0f1a] border border-slate-700/50 rounded-xl p-2.5 shadow-inner">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-black text-xl shadow-lg shrink-0 border border-slate-300/50">A</div>
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1 py-1">
                          {mapAssistant.aTier.map(h => <div key={h.name} className="relative group cursor-pointer shrink-0" onClick={() => openHeroDetail(h.name)}><img src={getHeroIcon(h.name)} className="w-10 h-10 rounded border-2 border-slate-400/80 object-cover hover:scale-110 transition-all shadow-md" title={h.name} /></div>)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-6">
                <div className="xl:col-span-8 flex flex-col gap-6">
                  <div className="bg-[#111827] border border-slate-700 rounded-3xl p-5 shadow-2xl relative">
                    <div className="flex justify-between items-center mb-4">
                      <div><h3 className="text-lg font-black text-white uppercase flex items-center gap-2"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg> Hero Quadrant</h3><p className="text-[10px] text-slate-400 font-medium">Y: Win Rate (%) | X: Pick+Ban Presence (%)</p></div>
                      <div className="flex gap-3 text-[9px] font-bold uppercase tracking-widest"><span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-orange-500"></div> Meta</span><span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-emerald-500"></div> Gem</span><span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-red-500"></div> Over</span></div>
                    </div>
                    <div className="relative w-full h-[320px] sm:h-[400px] bg-[#0b0f1a] border border-slate-700/50 rounded-xl overflow-hidden shadow-inner">
                      <div className="absolute top-0 right-0 w-[60%] h-[50%] bg-orange-500/5 border-l border-b border-orange-500/20 border-dashed"><span className="absolute top-2 right-2 text-[10px] font-black text-orange-500/40 uppercase tracking-widest">Meta Dominant</span></div>
                      <div className="absolute top-0 left-0 w-[40%] h-[50%] bg-emerald-500/5 border-b border-emerald-500/20 border-dashed"><span className="absolute top-2 left-2 text-[10px] font-black text-emerald-500/40 uppercase tracking-widest">Hidden Gem</span></div>
                      <div className="absolute bottom-0 right-0 w-[60%] h-[50%] bg-red-500/5 border-l border-red-500/20 border-dashed"><span className="absolute bottom-2 right-2 text-[10px] font-black text-red-500/40 uppercase tracking-widest">Overrated</span></div>
                      <div className="absolute bottom-0 left-0 w-[40%] h-[50%] bg-slate-500/5"><span className="absolute bottom-2 left-2 text-[10px] font-black text-slate-500/40 uppercase tracking-widest">Niche / Weak</span></div>
                      <div className="absolute bottom-[50%] left-0 w-full border-b border-slate-600 border-dashed opacity-50"></div>
                      <div className="absolute left-[40%] top-0 h-full border-r border-slate-600 border-dashed opacity-50"></div>
                      {filteredHeroData.filter(h => h.pb_rate > 0).map(h => (
                        <div key={h.name} className="absolute w-5 h-5 sm:w-7 sm:h-7 -ml-2.5 -mb-2.5 sm:-ml-3.5 sm:-mb-3.5 cursor-pointer hover:z-50 group"
                          style={{left: `${h.pb_rate > 95 ? 95 : (h.pb_rate < 2 ? 2 : h.pb_rate)}%`, bottom: `${h.w_rate > 95 ? 95 : (h.w_rate < 2 ? 2 : h.w_rate)}%`}}
                          onClick={() => openHeroDetail(h.name)}>
                          <div className={`w-full h-full rounded-full border-2 transition-transform duration-200 group-hover:scale-[1.8] shadow-md relative z-10 ${getDotColor(h.label)}`}>
                            <img src={getHeroIcon(h.name)} className="w-full h-full rounded-full object-cover" />
                          </div>
                          <div className={`absolute hidden group-hover:block bg-[#0f141e]/95 backdrop-blur-md border border-slate-600 text-white text-[10px] px-3 py-2 rounded-lg shadow-xl whitespace-nowrap z-[100] pointer-events-none ${h.w_rate > 80 ? 'top-full mt-2 sm:mt-3' : 'bottom-full mb-2 sm:mb-3'} ${h.pb_rate < 20 ? 'left-0' : (h.pb_rate > 80 ? 'right-0' : 'left-1/2 -translate-x-1/2')}`}>
                            <span className="font-black text-blue-400 text-xs block mb-0.5">{h.name}</span>
                            <span className="font-bold text-slate-300">WR: <span className={h.w_rate >= 50 ? 'text-emerald-400' : 'text-red-400'}>{h.w_rate}%</span></span> |
                            <span className="font-bold text-slate-300">P+B: <span className="text-orange-400">{h.pb_rate}%</span></span>
                            <div className={`text-[8px] uppercase tracking-widest mt-1 font-black ${getLabelTextColor(h.label)}`}>{h.label}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-[#111827] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-700 bg-[#0c0c0c] flex justify-between items-center">
                      <h3 className="text-lg font-black text-white uppercase tracking-wide">Data Matrix</h3>
                      <span className="text-xs text-slate-400 font-bold">{filteredHeroData.length} Hero Ditampilkan</span>
                    </div>
                    <div className="overflow-x-auto overflow-y-auto w-full relative max-h-[500px]">
                      <table className="liqui-table text-left whitespace-nowrap w-full min-w-[900px]">
                        <thead className="bg-[#1a1a1a] sticky top-0 z-20 shadow-sm">
                          <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-[#333]">
                            <th className="w-8 text-center" onClick={() => sortHero('name')}>#</th>
                            <th className="w-40 cursor-pointer hover:bg-[#333]" onClick={() => sortHero('name')}>Hero</th>
                            <th className="cursor-pointer hover:bg-[#333] border-r border-[#333]" onClick={() => sortHero('role')}>Role</th>
                            <th className="text-center cursor-pointer hover:bg-[#333]" onClick={() => sortHero('picks')}>Picks</th>
                            <th className="text-center cursor-pointer hover:bg-[#333]" onClick={() => sortHero('bans')}>Bans</th>
                            <th className="text-center cursor-pointer hover:bg-[#333]" onClick={() => sortHero('pb_rate')}>Presence</th>
                            <th className="text-center cursor-pointer hover:bg-[#333]" onClick={() => sortHero('w_rate')}>Win Rate</th>
                            <th className="text-center cursor-pointer hover:bg-[#333] border-l border-[#333]" onClick={() => sortHero('impact')}>Impact</th>
                            <th className="text-center cursor-pointer hover:bg-[#333]" onClick={() => sortHero('label')}>Tier Label</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredHeroData.map((h, i) => (
                            <tr key={h.name} className={`border-b border-slate-800/50 hover:bg-[#2a2a2a] cursor-pointer ${i % 2 === 0 ? 'liqui-row-even' : 'liqui-row-odd'}`} onClick={() => openHeroDetail(h.name)}>
                              <td className="text-center font-bold text-slate-500 py-2">{i + 1}</td>
                              <td className="py-2 px-2 flex items-center gap-3"><img src={getHeroIcon(h.name)} className="w-8 h-8 object-cover rounded shadow-md border border-slate-700" /><span className="font-bold text-slate-200">{h.name}</span></td>
                              <td className="py-2 px-2 text-[10px] font-bold text-slate-400 border-r border-[#333]">{h.role}</td>
                              <td className="text-center font-bold text-white">{h.picks}</td>
                              <td className="text-center font-bold text-red-400">{h.bans}</td>
                              <td className="text-center font-bold text-orange-400 bg-orange-900/5">{h.pb_rate}%</td>
                              <td className={`text-center font-black ${h.w_rate >= 50 ? (h.w_rate >= 60 ? 'text-emerald-400 bg-emerald-900/10' : 'text-emerald-500') : 'text-red-400'}`}>{h.w_rate}%</td>
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
                    <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 px-5 py-4 border-b border-slate-700">
                      <h3 className="text-lg font-black text-white uppercase flex items-center gap-2"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Meta Analysis</h3>
                    </div>
                    <div className="p-5 space-y-6">
                      <div>
                        <h4 className="text-xs font-black text-orange-400 uppercase tracking-widest border-b border-slate-700 pb-2 mb-3 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div> Top Meta (Impact)</h4>
                        <div className="space-y-2.5">
                          {analyticsInsights.topMeta.map(h => (
                            <div key={h.name} className="flex items-center justify-between group cursor-pointer" onClick={() => openHeroDetail(h.name)}>
                              <div className="flex items-center gap-2.5"><img src={getHeroIcon(h.name)} className="w-6 h-6 rounded border border-orange-500/30 object-cover group-hover:scale-110 transition-transform" /><span className="text-xs font-bold text-slate-200 group-hover:text-orange-400 transition-colors">{h.name}</span></div>
                              <div className="text-[10px] font-black text-orange-400 bg-orange-900/20 px-1.5 py-0.5 rounded">{h.impact} pts</div>
                            </div>
                          ))}
                          {analyticsInsights.topMeta.length === 0 && <span className="text-xs text-slate-500">Belum ada data</span>}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest border-b border-slate-700 pb-2 mb-3 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Hidden Gems (High WR)</h4>
                        <div className="space-y-2.5">
                          {analyticsInsights.hiddenGems.map(h => (
                            <div key={h.name} className="flex items-center justify-between group cursor-pointer" onClick={() => openHeroDetail(h.name)}>
                              <div className="flex items-center gap-2.5"><img src={getHeroIcon(h.name)} className="w-6 h-6 rounded border border-emerald-500/30 object-cover group-hover:scale-110 transition-transform" /><span className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">{h.name}</span></div>
                              <div className="text-[10px] font-black text-emerald-400 bg-emerald-900/20 px-1.5 py-0.5 rounded">{h.w_rate}% WR</div>
                            </div>
                          ))}
                          {analyticsInsights.hiddenGems.length === 0 && <span className="text-xs text-slate-500">Belum ada data</span>}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-red-400 uppercase tracking-widest border-b border-slate-700 pb-2 mb-3 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Priority Bans</h4>
                        <div className="flex flex-wrap gap-2">
                          {analyticsInsights.mustBan.map(h => (
                            <div key={h.name} className="relative group cursor-pointer" onClick={() => openHeroDetail(h.name)} title={`${h.name} - ${h.bans} Bans`}>
                              <img src={getHeroIcon(h.name)} className="w-8 h-8 rounded border border-red-500/50 object-cover grayscale hover:grayscale-0 transition-all shadow-sm hover:scale-110" />
                              <span className="absolute -bottom-1 -right-1 bg-red-600 text-[8px] font-black text-white px-1 rounded-sm">{h.bans}</span>
                            </div>
                          ))}
                          {analyticsInsights.mustBan.length === 0 && <span className="text-xs text-slate-500">Belum ada data</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-[#111827] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                  <div className="px-5 py-4 border-b border-slate-700 bg-slate-800/50">
                    <h3 className="text-base font-black text-white uppercase tracking-wide flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Red vs Blue Dynamics</h3>
                  </div>
                  <div className="p-5 flex-1 flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 bg-blue-900/20 border border-blue-500/30 rounded-xl p-3 text-center"><div className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1">🔵 Blue Side WR</div><div className="text-2xl font-black text-white">{sideAnalytics.blueWr}%</div></div>
                      <div className="text-slate-500 font-black text-xs">VS</div>
                      <div className="flex-1 bg-red-900/20 border border-red-500/30 rounded-xl p-3 text-center"><div className="text-[10px] text-red-400 font-black uppercase tracking-widest mb-1">🔴 Red Side WR</div><div className="text-2xl font-black text-white">{sideAnalytics.redWr}%</div></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 flex-1">
                      <div className="space-y-3 border-r border-slate-700 pr-4">
                        <div className="text-[9px] text-blue-400 font-bold uppercase border-b border-blue-900/50 pb-1 mb-2">Best at Blue (First Pick)</div>
                        {sideAnalytics.blueOp.map(h => (
                          <div key={h.name} className="flex items-center gap-2 group cursor-pointer" onClick={() => openHeroDetail(h.name)}>
                            <img src={getHeroIcon(h.name)} className="w-6 h-6 rounded border border-blue-500/30 object-cover group-hover:scale-110 transition-transform" />
                            <div><div className="text-xs font-bold text-slate-200">{h.name}</div><div className="text-[9px] text-blue-400">{h.bWr.toFixed(0)}% WR</div></div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-3 pl-2">
                        <div className="text-[9px] text-red-400 font-bold uppercase border-b border-red-900/50 pb-1 mb-2">Best at Red (Last Pick)</div>
                        {sideAnalytics.redOp.map(h => (
                          <div key={h.name} className="flex items-center gap-2 group cursor-pointer" onClick={() => openHeroDetail(h.name)}>
                            <img src={getHeroIcon(h.name)} className="w-6 h-6 rounded border border-red-500/30 object-cover group-hover:scale-110 transition-transform" />
                            <div><div className="text-xs font-bold text-slate-200">{h.name}</div><div className="text-[9px] text-red-400">{h.rWr.toFixed(0)}% WR</div></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-[#111827] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                  <div className="px-5 py-4 border-b border-slate-700 bg-slate-800/50">
                    <h3 className="text-base font-black text-white uppercase tracking-wide flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> Combo Synergy</h3>
                  </div>
                  <div className="p-5 border-b border-slate-700/80 bg-[#0b0f1a]/30">
                    <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center">
                      <div className="relative w-full xl:w-64 z-50">
                        <input type="text" placeholder="Tambah combo (Maks 5)..." value={customComboInput} onChange={(e) => { setCustomComboInput(e.target.value); setShowComboDropdown(true); }} onFocus={() => setShowComboDropdown(true)} onBlur={hideComboDropdownWithDelay} className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg py-2 pl-3 pr-8 text-xs focus:outline-none focus:border-blue-500 font-bold shadow-inner" />
                        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        {showComboDropdown && comboSuggestions.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl overflow-hidden z-[100]">
                            {comboSuggestions.map(h => (
                              <div key={h} className="px-3 py-2 text-xs font-bold text-slate-200 hover:bg-blue-600 cursor-pointer flex items-center gap-2 transition-colors" onClick={() => addComboHero(h)}>
                                <img src={getHeroIcon(h)} className="w-5 h-5 rounded object-cover border border-slate-600" /> {h}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 flex-1 items-center min-h-[32px]">
                        {customComboHeroes.map(h => (
                          <div key={h} className="bg-slate-800 border border-slate-600 rounded-lg pr-2 flex items-center gap-2 animate-fade-in group shadow-sm">
                            <img src={getHeroIcon(h)} className="w-8 h-8 rounded-l-lg object-cover" />
                            <span className="text-xs font-bold text-white tracking-wide">{h}</span>
                            <button onClick={() => removeComboHero(h)} className="text-slate-400 hover:text-red-400 font-black text-xs ml-1 outline-none">✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                    {customComboResult && customComboHeroes.length > 0 && (
                      <>
                        <div className="mt-4 flex gap-4 bg-slate-800/60 p-3 rounded-xl border border-blue-900/50 shadow-inner items-center animate-fade-in">
                          <div className="flex-1 text-center border-r border-slate-700/80"><div className="text-[9px] uppercase font-black tracking-widest text-slate-400 mb-0.5">Win Rate</div><div className={`text-xl font-black ${customComboResult.wr >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>{customComboResult.wr.toFixed(1)}%</div></div>
                          <div className="flex-1 text-center border-r border-slate-700/80"><div className="text-[9px] uppercase font-black tracking-widest text-slate-400 mb-0.5">Total Match</div><div className="text-xl font-black text-white">{customComboResult.total}</div></div>
                          <div className="flex-1 text-center"><div className="text-[9px] uppercase font-black tracking-widest text-slate-400 mb-0.5">W - L</div><div className="text-xl font-black"><span className="text-emerald-400">{customComboResult.wins}</span> <span className="text-slate-600 text-sm font-normal mx-1">vs</span> <span className="text-red-400">{customComboResult.losses}</span></div></div>
                        </div>
                        {customComboResult.mapBreakdown.length > 0 && (
                          <div className="mt-4 border-t border-slate-700/50 pt-3 animate-fade-in">
                            <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2 flex items-center gap-1">📍 Map Performance Synergy</div>
                            <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1 custom-scrollbar">
                              {customComboResult.mapBreakdown.map(m => (
                                <div key={m.map} className="flex justify-between items-center text-xs bg-slate-800/40 px-3 py-1.5 rounded">
                                  <span className="text-blue-300 font-bold truncate flex-1">{m.map}</span>
                                  <div className="flex items-center gap-3 shrink-0"><span className={`font-black ${m.wr >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>{m.wr.toFixed(0)}%</span><span className="text-[9px] text-slate-500 w-12 text-right">{m.wins}W - {m.losses}L</span></div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="p-5 flex-1 grid grid-cols-2 gap-6 relative z-10">
                    <div className="space-y-3">
                      <div className="text-[10px] text-emerald-400 font-black uppercase tracking-widest border-b border-emerald-900/50 pb-2 mb-3">🤝 Best Combo (2 Heroes)</div>
                      {comboStats.best.map(c => (
                        <div key={c.heroes[0]} className="bg-[#0b0f1a] border border-emerald-900/30 rounded-xl p-2 flex justify-between items-center hover:border-emerald-500/50 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <img src={getHeroIcon(c.heroes[0])} className="w-6 h-6 rounded border border-slate-600 object-cover cursor-pointer" onClick={() => openHeroDetail(c.heroes[0])} />
                            <span className="text-[8px] text-slate-500 font-bold">+</span>
                            <img src={getHeroIcon(c.heroes[1])} className="w-6 h-6 rounded border border-slate-600 object-cover cursor-pointer" onClick={() => openHeroDetail(c.heroes[1])} />
                          </div>
                          <div className="text-right"><div className="text-[10px] font-black text-emerald-400">{c.wr.toFixed(0)}%</div><div className="text-[8px] font-bold text-slate-500">{c.total}x Pick</div></div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3 border-l border-slate-700 pl-6">
                      <div className="text-[10px] text-red-400 font-black uppercase tracking-widest border-b border-red-900/50 pb-2 mb-3">💔 Failed Draft (2 Heroes)</div>
                      {comboStats.failed.map(c => (
                        <div key={c.heroes[0]} className="bg-[#0b0f1a] border border-red-900/30 rounded-xl p-2 flex justify-between items-center hover:border-red-500/50 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <img src={getHeroIcon(c.heroes[0])} className="w-6 h-6 rounded border border-slate-600 object-cover grayscale hover:grayscale-0 cursor-pointer" onClick={() => openHeroDetail(c.heroes[0])} />
                            <span className="text-[8px] text-slate-500 font-bold">+</span>
                            <img src={getHeroIcon(c.heroes[1])} className="w-6 h-6 rounded border border-slate-600 object-cover grayscale hover:grayscale-0 cursor-pointer" onClick={() => openHeroDetail(c.heroes[1])} />
                          </div>
                          <div className="text-right"><div className="text-[10px] font-black text-red-400">{c.wr.toFixed(0)}%</div><div className="text-[8px] font-bold text-slate-500">{c.total}x Pick</div></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-[#111827] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden mb-8">
                <div className="px-5 py-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                  <h3 className="text-base font-black text-white uppercase tracking-wide flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> Team Signatures</h3>
                  <button onClick={() => setShowCompareModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-lg">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 3h5v5"/><path d="M21 3 9 15"/><path d="M8 3H3v5"/><path d="M3 3l12 12"/><path d="M21 21h-5v-5"/><path d="M21 21 9 9"/><path d="M8 21H3v-5"/><path d="M3 21l12-12"/></svg>
                    Compare Teams
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-5">
                  {teamSignatures.map(ts => (
                    <div key={ts.team} className="bg-[#0b0f1a] border border-slate-700/50 rounded-2xl p-4 shadow-lg flex flex-col justify-between group">
                      <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-3 cursor-pointer hover:bg-slate-800/50 p-2 rounded-xl transition-colors" onClick={() => setTeamSignatureModal(ts.team)}>
                        <img src={teamLogos[ts.team]} className="w-7 h-7 object-contain drop-shadow-md" />
                        <span className="font-black text-slate-100 text-sm tracking-widest uppercase">{ts.abbr}</span>
                        <span className="text-[10px] text-blue-400 font-bold ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">Detail ↗</span>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <div className="text-[9px] text-emerald-400 font-black uppercase mb-2 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Most Picked</div>
                          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                            {ts.picks.map(h => (
                              <div key={h.name} className="relative shrink-0 cursor-pointer flex flex-col items-center gap-1.5" onClick={() => openHeroDetail(h.name)} title={`${h.name} dipick ${h.count} kali sebagai ${h.role}`}>
                                <div className="relative">
                                  <img src={getHeroIcon(h.name)} className="w-10 h-10 rounded-xl border border-emerald-500/30 object-cover shadow-sm hover:border-emerald-400 hover:scale-105 transition-all" />
                                  <span className="absolute -top-2 -right-2 bg-emerald-600 text-[9px] font-black text-white w-5 h-5 flex items-center justify-center rounded-full shadow border border-[#0b0f1a]">{h.count}</span>
                                </div>
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-600 w-full text-center">{h.role}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] text-red-400 font-black uppercase mb-2 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Most Banned</div>
                          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                            {ts.bans.map(h => (
                              <div key={h.name} className="relative shrink-0 cursor-pointer flex flex-col items-center gap-1.5" onClick={() => openHeroDetail(h.name)} title={`${h.name} diban ${h.count} kali`}>
                                <div className="relative">
                                  <img src={getHeroIcon(h.name)} className="w-10 h-10 rounded-xl border border-red-500/30 object-cover shadow-sm grayscale hover:grayscale-0 hover:border-red-400 hover:scale-105 transition-all" />
                                  <span className="absolute -top-2 -right-2 bg-red-600 text-[9px] font-black text-white w-5 h-5 flex items-center justify-center rounded-full shadow border border-[#0b0f1a]">{h.count}</span>
                                </div>
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
              <div className="flex items-center gap-4 flex-1">
                <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">⚔️ COMPARE <span className="text-blue-400">HERO POOL</span></h2>
                <div className="h-6 w-px bg-slate-700 hidden sm:block"></div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Map Filter:</span>
                  <select value={heroMapFilter} onChange={(e) => setHeroMapFilter(e.target.value)} className="bg-slate-900 border border-slate-600 text-white rounded py-1 px-2 text-xs focus:outline-none focus:border-blue-500 font-bold cursor-pointer outline-none">
                    <option value="All">Semua Map</option>
                    {MAP_LIST.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={() => setShowCompareModal(false)} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-all text-slate-400">X</button>
            </div>
            <div className="bg-[#111827] px-4 sm:px-6 py-4 border-b border-slate-700 flex justify-between items-center sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-3 w-[40%]">
                <img src={teamLogos[compareTeamA]} className="w-10 h-10 object-contain drop-shadow-md hidden sm:block" />
                <select value={compareTeamA} onChange={(e) => setCompareTeamA(e.target.value)} className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-500 font-black uppercase cursor-pointer">
                  {TEAMS.map(t => <option key={t} value={t}>{TEAM_ABBR[t] || t}</option>)}
                </select>
              </div>
              <div className="w-[15%] text-center text-slate-500 font-black text-xl sm:text-2xl italic tracking-tighter">VS</div>
              <div className="flex items-center gap-3 w-[40%] justify-end">
                <select value={compareTeamB} onChange={(e) => setCompareTeamB(e.target.value)} className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-red-500 font-black uppercase text-right cursor-pointer" dir="rtl">
                  {TEAMS.map(t => <option key={t} value={t}>{TEAM_ABBR[t] || t}</option>)}
                </select>
                <img src={teamLogos[compareTeamB]} className="w-10 h-10 object-contain drop-shadow-md hidden sm:block" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0b0f1a] space-y-4 custom-scrollbar">
              {['EXP Lane', 'Jungle', 'Mid Lane', 'Gold Lane', 'Roam'].map(role => (
                <div key={role} className="bg-[#111827] border border-slate-700/50 rounded-2xl flex overflow-hidden shadow-lg min-h-[120px]">
                  <div className="flex-1 p-3 sm:p-4 flex flex-wrap content-start gap-2 justify-end bg-blue-900/5 border-r border-slate-700/30">
                    {(teamCompareData.rolesA[role] || []).map(h => (
                      <div key={h.name} className="relative group cursor-pointer" onClick={() => openHeroDetail(h.name)} title={`${h.name} - ${h.count}x`}>
                        <img src={getHeroIcon(h.name)} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 border-blue-500/30 object-cover shadow-sm group-hover:border-blue-400 group-hover:scale-110 transition-all" />
                        <span className="absolute -top-1.5 -left-1.5 bg-blue-600 text-[9px] font-black text-white w-4 h-4 flex items-center justify-center rounded-full shadow border border-[#111827]">{h.count}</span>
                      </div>
                    ))}
                  </div>
                  <div className="w-20 sm:w-28 bg-slate-800 flex flex-col justify-center items-center shrink-0 shadow-inner px-2">
                    <span className="text-[9px] sm:text-xs font-black uppercase tracking-widest text-slate-300 text-center">{role}</span>
                  </div>
                  <div className="flex-1 p-3 sm:p-4 flex flex-wrap content-start gap-2 justify-start bg-red-900/5 border-l border-slate-700/30">
                    {(teamCompareData.rolesB[role] || []).map(h => (
                      <div key={h.name} className="relative group cursor-pointer" onClick={() => openHeroDetail(h.name)} title={`${h.name} - ${h.count}x`}>
                        <img src={getHeroIcon(h.name)} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 border-red-500/30 object-cover shadow-sm group-hover:border-red-400 group-hover:scale-110 transition-all" />
                        <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-[9px] font-black text-white w-4 h-4 flex items-center justify-center rounded-full shadow border border-[#111827]">{h.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* HOVER DRAFT PREVIEW */}
      {hoveredMatchPreview && draftState[hoveredMatchPreview.id] && draftState[hoveredMatchPreview.id].length > 0 && (
        <div className="fixed pointer-events-none z-[10005] bg-[#1a1f2e]/95 backdrop-blur-xl border border-slate-600/50 rounded-2xl shadow-2xl p-4 w-[420px]" style={{left: previewX, top: previewY}}>
          <div className="flex justify-between items-center border-b border-slate-700/50 pb-3 mb-3">
            <div className="flex items-center gap-2 w-1/3"><span className="text-blue-400 font-black text-xs uppercase">{TEAM_ABBR[hoveredMatchPreview.t1] || hoveredMatchPreview.t1}</span></div>
            <div className="w-1/3 flex flex-col items-center justify-center">
              <div className="text-white font-black text-sm tracking-widest">{hoveredMatchPreview.s1 !== null ? hoveredMatchPreview.s1 : '-'} : {hoveredMatchPreview.s2 !== null ? hoveredMatchPreview.s2 : '-'}</div>
              <div className="text-[8px] text-slate-500 font-bold tracking-widest">(BO3)</div>
            </div>
            <div className="flex items-center justify-end gap-2 w-1/3"><span className="text-red-400 font-black text-xs uppercase">{TEAM_ABBR[hoveredMatchPreview.t2] || hoveredMatchPreview.t2}</span></div>
          </div>
          <div className="space-y-4">
            {draftState[hoveredMatchPreview.id].map((game, gIdx) => (
              <div key={gIdx} className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <div className={`w-4 h-4 rounded text-[8px] font-black flex items-center justify-center text-white shrink-0 ${game.t1Result === 'W' ? 'bg-emerald-600' : (game.t1Result === 'L' ? 'bg-red-600' : 'bg-slate-700')}`}>{game.t1Result || '-'}</div>
                  <div className="flex gap-0.5 shrink-0 ml-2">{game.t1Picks.map((p, idx) => p && <img key={idx} src={getHeroIcon(p)} className={`w-6 h-6 rounded-sm object-cover border ${game.t1Side === 'blue' ? 'border-blue-500/50' : 'border-red-500/50'}`} />)}</div>
                  <div className="text-[10px] font-black text-white px-2 shrink-0">{game.duration || '00:00'}</div>
                  <div className="flex gap-0.5 shrink-0 mr-2">{game.t2Picks.map((p, idx) => p && <img key={idx} src={getHeroIcon(p)} className={`w-6 h-6 rounded-sm object-cover border ${game.t2Side === 'blue' ? 'border-blue-500/50' : 'border-red-500/50'}`} />)}</div>
                  <div className={`w-4 h-4 rounded text-[8px] font-black flex items-center justify-center text-white shrink-0 ${game.t2Result === 'W' ? 'bg-emerald-600' : (game.t2Result === 'L' ? 'bg-red-600' : 'bg-slate-700')}`}>{game.t2Result || '-'}</div>
                </div>
                <div className="flex items-center gap-2 w-[90%] mx-auto"><div className="h-px bg-slate-700/50 flex-1"></div><span className="text-[8px] uppercase font-black tracking-widest text-slate-400">{game.map || 'Unknown Map'}</span><div className="h-px bg-slate-700/50 flex-1"></div></div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-700/50">
            <div className="text-center mb-2"><span className="text-orange-500 font-black text-[9px] uppercase tracking-widest">BANS</span></div>
            <div className="space-y-2">
              {draftState[hoveredMatchPreview.id].map((game, gIdx) => (
                <div key={gIdx} className="flex justify-between items-center">
                  <div className="flex gap-0.5 shrink-0">{game.t1Bans.map((b, idx) => b && <img key={idx} src={getHeroIcon(b)} className="w-5 h-5 rounded-sm border border-slate-700 grayscale object-cover" />)}</div>
                  <span className="text-[8px] text-blue-300/80 font-bold uppercase tracking-widest px-2">Game {gIdx+1}</span>
                  <div className="flex gap-0.5 shrink-0">{game.t2Bans.map((b, idx) => b && <img key={idx} src={getHeroIcon(b)} className="w-5 h-5 rounded-sm border border-slate-700 grayscale object-cover" />)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* DRAFT PREVIEW MODAL */}
      {draftModalMatch && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151a24] border border-slate-700/60 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-fade-in relative">
            <div className="px-6 py-4 flex justify-between items-center bg-[#1a202c] border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3 w-1/3">
                <span className="text-blue-400 font-black text-lg uppercase tracking-wider">{TEAM_ABBR[draftModalMatch.t1] || draftModalMatch.t1}</span>
                {teamLogos[draftModalMatch.t1] && <img src={teamLogos[draftModalMatch.t1]} className="w-8 h-8 object-contain drop-shadow-md" />}
              </div>
              <div className="w-1/3 flex flex-col items-center justify-center">
                <div className="text-white font-black text-2xl tracking-widest">{draftModalMatch.s1 !== null ? draftModalMatch.s1 : '-'} : {draftModalMatch.s2 !== null ? draftModalMatch.s2 : '-'}</div>
                <div className="text-[10px] text-slate-500 font-bold tracking-widest">(BO3)</div>
              </div>
              <div className="flex items-center justify-end gap-3 w-1/3">
                {teamLogos[draftModalMatch.t2] && <img src={teamLogos[draftModalMatch.t2]} className="w-8 h-8 object-contain drop-shadow-md" />}
                <span className="text-red-400 font-black text-lg uppercase tracking-wider">{TEAM_ABBR[draftModalMatch.t2] || draftModalMatch.t2}</span>
              </div>
              <button onClick={closeDraftModal} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-all text-slate-400 z-10">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col bg-[#151a24]">
              {(!draftState[draftModalMatch.id] || draftState[draftModalMatch.id].length === 0) && <div className="text-center text-slate-500 py-10 font-bold">Belum ada data draft.</div>}
              <div className="p-6 space-y-6">
                {(draftState[draftModalMatch.id] || []).map((game, gIdx) => (
                  <div key={gIdx} className="flex flex-col gap-4 border-b border-slate-800/80 pb-6 last:border-0 last:pb-0">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded text-[11px] font-black flex items-center justify-center shadow-sm shrink-0 ${game.t1Result === 'W' ? 'bg-emerald-600 text-white' : (game.t1Result === 'L' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-400')}`}>{game.t1Result || '-'}</div>
                        <div className="flex gap-1 shrink-0">
                          {game.t1Picks.map((p, idx) => (
                            <div key={idx} className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded overflow-hidden shrink-0 border-2 bg-slate-800 ${game.t1Side === 'blue' ? 'border-blue-500/80' : 'border-red-500/80'}`}>
                              <span className="absolute top-0 left-0 bg-black/80 text-[8px] text-white px-1 rounded-br z-10">{idx+1}</span>
                              {p && <img src={getHeroIcon(p)} className="w-full h-full object-cover" />}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="text-base font-black text-white px-4 shrink-0">{game.duration || '00:00'}</div>
                      <div className="flex items-center gap-3 justify-end">
                        <div className="flex gap-1 shrink-0">
                          {game.t2Picks.map((p, idx) => (
                            <div key={idx} className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded overflow-hidden shrink-0 border-2 bg-slate-800 ${game.t2Side === 'blue' ? 'border-blue-500/80' : 'border-red-500/80'}`}>
                              <span className="absolute top-0 left-0 bg-black/80 text-[8px] text-white px-1 rounded-br z-10">{idx+1}</span>
                              {p && <img src={getHeroIcon(p)} className="w-full h-full object-cover" />}
                            </div>
                          ))}
                        </div>
                        <div className={`w-7 h-7 rounded text-[11px] font-black flex items-center justify-center shadow-sm shrink-0 ${game.t2Result === 'W' ? 'bg-emerald-600 text-white' : (game.t2Result === 'L' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-400')}`}>{game.t2Result || '-'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 w-[80%] mx-auto"><div className="h-px bg-slate-700/60 flex-1"></div><span className="text-[10px] uppercase font-black tracking-widest text-slate-400">{game.map || 'Unknown Map'}</span><div className="h-px bg-slate-700/60 flex-1"></div></div>
                  </div>
                ))}
              </div>
              {draftState[draftModalMatch.id] && draftState[draftModalMatch.id].length > 0 && (
                <div className="bg-[#11151c] p-6 mt-auto">
                  <div className="text-center mb-5"><span className="text-orange-500 font-black text-[11px] uppercase tracking-widest">BANS</span></div>
                  <div className="space-y-4">
                    {draftState[draftModalMatch.id].map((game, gIdx) => (
                      <div key={gIdx} className="flex justify-between items-center">
                        <div className="flex gap-1.5 shrink-0">
                          {game.t1Bans.map((b, idx) => (
                            <div key={idx} className="relative w-8 h-8 sm:w-9 sm:h-9 rounded border border-slate-700 bg-slate-800 overflow-hidden shrink-0">
                              <span className="absolute top-0 left-0 bg-black/80 text-[7px] text-white px-0.5 rounded-br z-10">{idx+1}</span>
                              {b && <img src={getHeroIcon(b)} className="w-full h-full object-cover grayscale opacity-80 hover:opacity-100 transition-opacity" />}
                            </div>
                          ))}
                        </div>
                        <span className="text-[10px] text-blue-300/80 font-bold uppercase tracking-widest px-4 shrink-0">Game {gIdx+1}</span>
                        <div className="flex gap-1.5 shrink-0">
                          {game.t2Bans.map((b, idx) => (
                            <div key={idx} className="relative w-8 h-8 sm:w-9 sm:h-9 rounded border border-slate-700 bg-slate-800 overflow-hidden shrink-0">
                              <span className="absolute top-0 left-0 bg-black/80 text-[7px] text-white px-0.5 rounded-br z-10">{idx+1}</span>
                              {b && <img src={getHeroIcon(b)} className="w-full h-full object-cover grayscale opacity-80 hover:opacity-100 transition-opacity" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}