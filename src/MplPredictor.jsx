// src/MplPredictor.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

// Import Constants & Utils
import { 
  CUSTOM_FIREBASE_CONFIG, CUSTOM_APP_ID, SPREADSHEET_API_URL, 
  TM, TEAMS, TEAM_ABBR, FALLBACK_LOGOS, HERO_ROLES, MAP_LIST, history, schedule 
} from "./constants";
import { calculate, getDisplayMatches } from "./utils";

// Import Components
import { MatchCard } from "./components/MatchCard";
import { CompareTeamsModal, HoverDraftPreview, DraftPreviewModal, HeroDetailModal } from "./components/Modals";

// Helper Global (Fallback jika tidak ada di utils)
const getHeroImg = (name) => `https://api.mlbb.duniagames.co.id/storage/hero/${name?.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'unknown'}.png`;
const getStateSeed = (state) => state.reduce((acc, m) => acc + (m.s1 || 0) + (m.s2 || 0), 0);
const mulberry32 = (a) => () => { let t = a += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };

export default function MplPredictor() {
  // --- 1. STATE MANAGEMENT ---
  const [isAppReady, setIsAppReady] = useState(false);
  const [activeTab, setActiveTab] = useState("standings");
  const [isAdminMode, setIsAdminMode] = useState(false);
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
  const [previewX, setPreviewX] = useState(0); const [previewY, setPreviewY] = useState(0);
  const [heroSortCol, setHeroSortCol] = useState("pb_rate"); const [heroSortAsc, setHeroSortAsc] = useState(false);
  const [heroDetailModal, setHeroDetailModal] = useState(null); const [heroSearchQuery, setHeroSearchQuery] = useState("");
  const [heroRoleFilter, setHeroRoleFilter] = useState("All"); const [heroMapFilter, setHeroMapFilter] = useState("All");
  const [compareMapFilter, setCompareMapFilter] = useState("All"); const [customComboHeroes, setCustomComboHeroes] = useState([]);
  const [customComboInput, setCustomComboInput] = useState(""); const [showComboDropdown, setShowComboDropdown] = useState(false);
  const [teamSignatureModal, setTeamSignatureModal] = useState(null); const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareTeamA, setCompareTeamA] = useState(TEAMS[0]); const [compareTeamB, setCompareTeamB] = useState(TEAMS[1] || TEAMS[0]);
  const [isCalculating, setIsCalculating] = useState(false); const [syncStatus, setSyncStatus] = useState("Menyambungkan Database...");
  const [syncColor, setSyncColor] = useState("text-slate-400"); const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false); const [isToastError, setIsToastError] = useState(false);
  const [currentAiInsight, setCurrentAiInsight] = useState(null); const [isAiLoading, setIsAiLoading] = useState(false);
  const [globalScores, setGlobalScores] = useState({});

  const dbRef = useRef(null); const authRef = useRef(null); const currentUserRef = useRef(null);
  const appIdRef = useRef(CUSTOM_APP_ID); const officialMatchesRef = useRef([]); const insightCacheRef = useRef({});
  const unsubscribeDraftsRef = useRef(null); const unsubscribeScoresRef = useRef(null);

  // --- 2. MEMOIZED DATA & CALCULATIONS ---
  const heroRoleKeys = useMemo(() => Object.keys(HERO_ROLES), []);
  const allHeroes = useMemo(() => Object.values(HERO_ROLES).flat().sort(), []);
  const getHeroIcon = useCallback((name) => getHeroImg(name), []);
  const isHistoryMatch = useCallback((id) => history.some((hm) => hm.id === id), []);
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
    return { mWin, mLose, mWR: mTotal > 0 ? Math.round((mWin / mTotal) * 100) : 0, gWin, gLose, gWR: gTotal > 0 ? Math.round((gWin / gTotal) * 100) : 0 };
  }, [highlightedTeam, state]);

  const displayMatches = useMemo(() => getDisplayMatches(state, highlightedTeam, focusFilter, sortedList, curWeek), [state, highlightedTeam, focusFilter, sortedList, curWeek]);
  
  const filteredDraftState = useMemo(() => {
    const mapFilter = heroMapFilter; const original = draftState;
    if (mapFilter === "All") return original;
    const filtered = {};
    Object.entries(original).forEach(([mId, games]) => {
      const matchedGames = games.filter((g) => g.map === mapFilter);
      if (matchedGames.length > 0) filtered[parseInt(mId)] = matchedGames;
    });
    return filtered;
  }, [heroMapFilter, draftState]);

  const getTotalGamesPlayed = useCallback(() => {
    let count = 0; Object.values(filteredDraftState).forEach((games) => (count += games.length)); return count;
  }, [filteredDraftState]);

  const getRole = useCallback((heroName) => {
    for (const [r, list] of Object.entries(HERO_ROLES)) { if (list.includes(heroName)) return r; } return "Unknown";
  }, []);

  const mapOverviewStats = useMemo(() => {
    const games = Object.values(filteredDraftState).flat(); if (games.length === 0) return null;
    let totalSec = 0, countDur = 0, minSec = Infinity, maxSec = 0, bW = 0, rW = 0, picks = {}, bans = {};
    games.forEach((g) => {
      if (g.duration && g.duration.includes(":")) {
        const p = g.duration.split(":");
        if (p.length === 2) {
          const sec = parseInt(p[0]) * 60 + parseInt(p[1]);
          if (sec > 0) { totalSec += sec; countDur++; if (sec < minSec) minSec = sec; if (sec > maxSec) maxSec = sec; }
        }
      }
      if (g.t1Result === "W") { if (g.t1Side === "blue") bW++; else rW++; }
      if (g.t2Result === "W") { if (g.t2Side === "blue") bW++; else rW++; }
      (g.t1Picks || []).concat(g.t2Picks || []).filter(Boolean).forEach((h) => (picks[h] = (picks[h] || 0) + 1));
      (g.t1Bans || []).concat(g.t2Bans || []).filter(Boolean).forEach((h) => (bans[h] = (bans[h] || 0) + 1));
    });
    const formatDur = (sec) => `${Math.floor(sec / 60).toString().padStart(2, "0")}:${(sec % 60).toString().padStart(2, "0")}`;
    let tw = bW + rW; let topP = Object.entries(picks).sort((a, b) => b[1] - a[1])[0] || [null, 0]; let topB = Object.entries(bans).sort((a, b) => b[1] - a[1])[0] || [null, 0];
    return {
      avgDur: countDur > 0 ? formatDur(Math.round(totalSec / countDur)) : "00:00", fastestDur: minSec === Infinity ? "00:00" : formatDur(minSec), longestDur: maxSec === 0 ? "00:00" : formatDur(maxSec),
      bWr: tw > 0 ? ((bW / tw) * 100).toFixed(1) : "0.0", rWr: tw > 0 ? ((rW / tw) * 100).toFixed(1) : "0.0", totalGames: games.length, topPick: { name: topP[0], count: topP[1] }, topBan: { name: topB[0], count: topB[1] },
    };
  }, [filteredDraftState]);

  const processedHeroData = useMemo(() => {
    const stats = {}; const roleMap = ["EXP Lane", "Jungle", "Mid Lane", "Gold Lane", "Roam"];
    Object.values(HERO_ROLES).flat().forEach((h) => {
      stats[h] = { name: h, picks: 0, bans: 0, wins: 0, losses: 0, bPicks: 0, bWins: 0, bLosses: 0, rPicks: 0, rWins: 0, rLosses: 0, roleCounts: { "EXP Lane": 0, Jungle: 0, "Mid Lane": 0, "Gold Lane": 0, Roam: 0 }, role: getRole(h) };
    });
    let totalGames = 0;
    Object.values(filteredDraftState).forEach((matchDrafts) => {
      matchDrafts.forEach((game) => {
        totalGames++;
        const processPicks = (picks, side, res) => {
          picks.forEach((h, idx) => {
            if (!h) return; stats[h].picks++;
            if (res === "W") stats[h].wins++; else if (res === "L") stats[h].losses++;
            if (side === "blue") { stats[h].bPicks++; if (res === "W") stats[h].bWins++; else if (res === "L") stats[h].bLosses++; }
            else { stats[h].rPicks++; if (res === "W") stats[h].rWins++; else if (res === "L") stats[h].rLosses++; }
            if (idx >= 0 && idx < 5) stats[h].roleCounts[roleMap[idx]]++;
          });
        };
        processPicks(game.t1Picks, game.t1Side, game.t1Result); processPicks(game.t2Picks, game.t2Side, game.t2Result);
        game.t1Bans.concat(game.t2Bans).forEach((h) => { if (h) stats[h].bans++; });
      });
    });
    const tg = Math.max(1, totalGames);
    let arr = Object.values(stats).filter((h) => h.picks + h.bans > 0).map((h) => {
      let pb_rate = parseFloat((((h.picks + h.bans) / tg) * 100).toFixed(2));
      let w_rate = h.picks > 0 ? parseFloat(((h.wins / h.picks) * 100).toFixed(2)) : 0;
      let label = "💤 Niche / Weak";
      if (pb_rate >= 25 && w_rate >= 50) label = "🔥 Meta Dominant";
      else if (pb_rate >= 25 && w_rate < 50) label = "⚠️ Overrated";
      else if (pb_rate < 25 && w_rate >= 55 && h.picks >= 2) label = "💎 Hidden Gem";
      let impact = parseFloat((h.picks * (w_rate / 100) + h.bans * 1.2).toFixed(1));
      let finalRole = h.role, maxRoleVal = 0;
      for (const [rName, count] of Object.entries(h.roleCounts)) { if (count > maxRoleVal) { maxRoleVal = count; finalRole = rName; } }
      return {
        ...h, role: finalRole, p_rate: parseFloat(((h.picks / tg) * 100).toFixed(2)), b_rate: parseFloat(((h.bans / tg) * 100).toFixed(2)), pb_count: h.picks + h.bans, pb_rate, w_rate, impact, label,
        b_winrate: h.bPicks > 0 ? parseFloat(((h.bWins / h.bPicks) * 100).toFixed(2)) : 0, r_winrate: h.rPicks > 0 ? parseFloat(((h.rWins / h.rPicks) * 100).toFixed(2)) : 0,
      };
    });
    arr.sort((a, b) => typeof a[heroSortCol] === "number" ? (heroSortAsc ? a[heroSortCol] - b[heroSortCol] : b[heroSortCol] - a[heroSortCol]) : (heroSortAsc ? a[heroSortCol].localeCompare(b[heroSortCol]) : b[heroSortCol].localeCompare(a[heroSortCol])));
    return arr;
  }, [filteredDraftState, getRole, heroSortCol, heroSortAsc]);

  const filteredHeroData = useMemo(() => processedHeroData.filter((h) => (!heroSearchQuery || h.name.toLowerCase().includes(heroSearchQuery.toLowerCase())) && (heroRoleFilter === "All" || h.role === heroRoleFilter)), [processedHeroData, heroSearchQuery, heroRoleFilter]);
  
  const analyticsInsights = useMemo(() => ({
    totalMatches: getTotalGamesPlayed(), uniquePicks: processedHeroData.filter((h) => h.picks > 0).length,
    topPick: [...processedHeroData].sort((a, b) => b.picks - a.picks)[0], topBan: [...processedHeroData].sort((a, b) => b.bans - a.bans)[0],
    topMeta: processedHeroData.filter((h) => h.label === "🔥 Meta Dominant").sort((a, b) => b.impact - a.impact).slice(0, 5),
    hiddenGems: processedHeroData.filter((h) => h.label === "💎 Hidden Gem").sort((a, b) => b.w_rate - a.w_rate).slice(0, 5),
    mustBan: [...processedHeroData].sort((a, b) => b.bans - a.bans).slice(0, 5),
  }), [processedHeroData, getTotalGamesPlayed]);

  const mapAssistant = useMemo(() => {
    const sTier = filteredHeroData.filter((h) => h.pb_rate >= 20 && h.w_rate >= 55).sort((a, b) => b.impact - a.impact).slice(0, 6);
    return {
      recPicks: filteredHeroData.filter((h) => h.picks >= 1).sort((a, b) => b.w_rate * Math.log10(b.picks + 1) - a.w_rate * Math.log10(a.picks + 1)).slice(0, 4),
      recBans: [...filteredHeroData].sort((a, b) => b.bans - a.bans).slice(0, 4),
      sTier: sTier.length > 0 ? sTier : [...filteredHeroData].sort((a, b) => b.impact - a.impact).slice(0, 6),
      aTier: filteredHeroData.filter((h) => h.pb_rate >= 10 && h.w_rate >= 50 && !sTier.includes(h)).sort((a, b) => b.impact - a.impact).slice(0, 6),
    };
  }, [filteredHeroData]);

  const teamSignatures = useMemo(() => {
    let td = {}; const roleMap = ["EXP", "JUG", "MID", "GOLD", "ROAM"]; TEAMS.forEach((t) => { td[TEAM_ABBR[t] || t] = { picks: {}, bans: {} }; });
    Object.entries(filteredDraftState).forEach(([mId, games]) => {
      let match = state.find((x) => x.id == parseInt(mId)); if (!match) return;
      games.forEach((g) => {
        let pPicks = (team, picks) => { let t = TEAM_ABBR[team] || team; picks.filter(Boolean).forEach((p, idx) => { if (!td[t].picks[p]) td[t].picks[p] = { count: 0, roles: { EXP: 0, JUG: 0, MID: 0, GOLD: 0, ROAM: 0 } }; td[t].picks[p].count++; if (idx < 5) td[t].picks[p].roles[roleMap[idx]]++; }); };
        let pBans = (team, bans) => { let t = TEAM_ABBR[team] || team; bans.filter(Boolean).forEach((b) => (td[t].bans[b] = (td[t].bans[b] || 0) + 1)); };
        if (match.t1) { pPicks(match.t1, g.t1Picks); pBans(match.t1, g.t1Bans); } if (match.t2) { pPicks(match.t2, g.t2Picks); pBans(match.t2, g.t2Bans); }
      });
    });
    return TEAMS.map((team) => {
      let abbr = TEAM_ABBR[team] || team; let teamData = td[abbr] || { picks: {}, bans: {} };
      return { team, abbr, picks: Object.entries(teamData.picks || {}).map(([name, data]) => { let mR = "N/A", mx = 0; for (let r in data.roles) { if (data.roles[r] > mx) { mx = data.roles[r]; mR = r; } } return { name, count: data.count, role: mR }; }).sort((a, b) => b.count - a.count).slice(0, 5), bans: Object.entries(teamData.bans || {}).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5) };
    });
  }, [filteredDraftState, state]);

  const teamCompareData = useMemo(() => {
    const tA = compareTeamA; const tB = compareTeamB; const roleMap = ["EXP Lane", "Jungle", "Mid Lane", "Gold Lane", "Roam"];
    const dataA = { "EXP Lane": {}, Jungle: {}, "Mid Lane": {}, "Gold Lane": {}, Roam: {} }; const dataB = { "EXP Lane": {}, Jungle: {}, "Mid Lane": {}, "Gold Lane": {}, Roam: {} };
    Object.entries(draftState).forEach(([mId, games]) => {
      const match = state.find((x) => x.id == parseInt(mId)); if (!match) return;
      games.forEach((g) => {
        if (compareMapFilter !== "All" && g.map !== compareMapFilter) return;
        let pA = [], wA = false; if (match.t1 === tA || TEAM_ABBR[match.t1] === tA) { pA = g.t1Picks; wA = g.t1Result === "W"; } if (match.t2 === tA || TEAM_ABBR[match.t2] === tA) { pA = g.t2Picks; wA = g.t2Result === "W"; }
        pA.forEach((h, idx) => { if (h && idx < 5) { if (!dataA[roleMap[idx]][h]) dataA[roleMap[idx]][h] = { count: 0, wins: 0 }; dataA[roleMap[idx]][h].count++; if (wA) dataA[roleMap[idx]][h].wins++; } });
        let pB = [], wB = false; if (match.t1 === tB || TEAM_ABBR[match.t1] === tB) { pB = g.t1Picks; wB = g.t1Result === "W"; } if (match.t2 === tB || TEAM_ABBR[match.t2] === tB) { pB = g.t2Picks; wB = g.t2Result === "W"; }
        pB.forEach((h, idx) => { if (h && idx < 5) { if (!dataB[roleMap[idx]][h]) dataB[roleMap[idx]][h] = { count: 0, wins: 0 }; dataB[roleMap[idx]][h].count++; if (wB) dataB[roleMap[idx]][h].wins++; } });
      });
    });
    const resultA = {}; const resultB = {};
    for (const role of roleMap) {
      resultA[role] = Object.entries(dataA[role]).map(([name, s]) => ({ name, count: s.count, wr: Math.round((s.wins / s.count) * 100) })).sort((a, b) => b.count - a.count);
      resultB[role] = Object.entries(dataB[role]).map(([name, s]) => ({ name, count: s.count, wr: Math.round((s.wins / s.count) * 100) })).sort((a, b) => b.count - a.count);
    }
    return { teamA: tA, teamB: tB, rolesA: resultA, rolesB: resultB };
  }, [compareTeamA, compareTeamB, compareMapFilter, draftState, state]);

  const sideAnalytics = useMemo(() => {
    let blueWins = 0, redWins = 0, totalGames = 0; const heroSide = {};
    Object.values(filteredDraftState).forEach((games) => {
      games.forEach((g) => {
        if (g.t1Result === "W" || g.t2Result === "W") totalGames++;
        const processSide = (side, res, picks) => {
          if (side === "blue" && res === "W") blueWins++; if (side === "red" && res === "W") redWins++;
          picks.filter(Boolean).forEach((h) => {
            if (!heroSide[h]) heroSide[h] = { blueW: 0, blueL: 0, redW: 0, redL: 0 };
            if (side === "blue") { if (res === "W") heroSide[h].blueW++; else if (res === "L") heroSide[h].blueL++; }
            else { if (res === "W") heroSide[h].redW++; else if (res === "L") heroSide[h].redL++; }
          });
        };
        processSide(g.t1Side, g.t1Result, g.t1Picks); processSide(g.t2Side, g.t2Result, g.t2Picks);
      });
    });
    const heroArr = Object.entries(heroSide).map(([name, s]) => { const bTotal = s.blueW + s.blueL; const rTotal = s.redW + s.redL; return { name, bTotal, rTotal, bWr: bTotal > 0 ? (s.blueW / bTotal) * 100 : 0, rWr: rTotal > 0 ? (s.redW / rTotal) * 100 : 0, diff: (bTotal > 0 ? (s.blueW / bTotal) * 100 : 0) - (rTotal > 0 ? (s.redW / rTotal) * 100 : 0) }; });
    return {
      blueWr: totalGames > 0 ? ((blueWins / totalGames) * 100).toFixed(1) : "0.0", redWr: totalGames > 0 ? ((redWins / totalGames) * 100).toFixed(1) : "0.0",
      blueOp: [...heroArr].filter((h) => h.bTotal >= 3).sort((a, b) => b.diff - a.diff).slice(0, 4), redOp: [...heroArr].filter((h) => h.rTotal >= 3).sort((a, b) => a.diff - b.diff).slice(0, 4),
    };
  }, [filteredDraftState]);

  const comboStats = useMemo(() => {
    const combos = {};
    Object.values(filteredDraftState).forEach((games) => {
      games.forEach((g) => {
        const processTeam = (picks, res) => {
          const validPicks = picks.filter(Boolean).sort();
          for (let i = 0; i < validPicks.length; i++) {
            for (let j = i + 1; j < validPicks.length; j++) {
              const key = validPicks[i] + " & " + validPicks[j]; if (!combos[key]) combos[key] = { heroes: [validPicks[i], validPicks[j]], wins: 0, losses: 0, total: 0 };
              combos[key].total++; if (res === "W") combos[key].wins++; else if (res === "L") combos[key].losses++;
            }
          }
        };
        processTeam(g.t1Picks, g.t1Result); processTeam(g.t2Picks, g.t2Result);
      });
    });
    const comboArr = Object.values(combos).filter((c) => c.total >= 2).map((c) => ({ ...c, wr: (c.wins / c.total) * 100 }));
    return { best: [...comboArr].sort((a, b) => b.wr === a.wr ? b.total - a.total : b.wr - a.wr).slice(0, 5), failed: [...comboArr].filter((c) => c.total >= 3).sort((a, b) => a.wr === b.wr ? b.total - a.total : a.wr - b.wr).slice(0, 5) };
  }, [filteredDraftState]);

  const comboSuggestions = useMemo(() => customComboInput ? allHeroes.filter((h) => h.toLowerCase().includes(customComboInput.toLowerCase()) && !customComboHeroes.includes(h)).slice(0, 5) : [], [customComboInput, allHeroes, customComboHeroes]);
  
  const customComboResult = useMemo(() => {
    let heroes = customComboHeroes; if (heroes.length === 0) return null;
    let total = 0, wins = 0, losses = 0; let mapStats = {}; MAP_LIST.forEach((m) => (mapStats[m] = { total: 0, wins: 0, losses: 0 }));
    Object.values(draftState).forEach((games) => {
      games.forEach((g) => {
        let t1Has = heroes.every((h) => g.t1Picks.includes(h)); let t2Has = heroes.every((h) => g.t2Picks.includes(h)); const mapName = g.map || "Unknown";
        if (!mapStats[mapName]) mapStats[mapName] = { total: 0, wins: 0, losses: 0 };
        if (t1Has) { total++; mapStats[mapName].total++; if (g.t1Result === "W") { wins++; mapStats[mapName].wins++; } else if (g.t1Result === "L") { losses++; mapStats[mapName].losses++; } }
        if (t2Has) { total++; mapStats[mapName].total++; if (g.t2Result === "W") { wins++; mapStats[mapName].wins++; } else if (g.t2Result === "L") { losses++; mapStats[mapName].losses++; } }
      });
    });
    return { total, wins, losses, wr: total > 0 ? (wins / total) * 100 : 0, mapBreakdown: Object.entries(mapStats).filter(([_, s]) => s.total > 0).map(([map, s]) => ({ map, ...s, wr: (s.wins / s.total) * 100 })).sort((a, b) => b.wr - a.wr) };
  }, [customComboHeroes, draftState]);

  // --- 3. EFFECTS & FIREBASE ---
  const runSimulation = useCallback((currentState) => {
    if (!currentState || currentState.length === 0) return;
    const iterations = 20000; let counts = {}; TEAMS.forEach((t) => (counts[t] = { upper: 0, playin: 0, playoff: 0, elim: 0 }));
    let seed = getStateSeed(currentState); let seededRandom = mulberry32(seed); const teamIndices = {}; TEAMS.forEach((t, i) => (teamIndices[t] = i));
    const baseMw = new Int32Array(9); const baseMl = new Int32Array(9); const baseGw = new Int32Array(9); const baseGl = new Int32Array(9); const baseH2h = Array.from({ length: 9 }, () => new Int32Array(9));
    const unplayed = [];
    for (let i = 0; i < currentState.length; i++) {
      const m = currentState[i]; if (!TEAM_ABBR[m.t1] || !TEAM_ABBR[m.t2]) continue;
      const t1 = teamIndices[m.t1]; const t2 = teamIndices[m.t2];
      if (m.s1 !== null && m.s2 !== null && (m.s1 === 2 || m.s2 === 2)) {
        baseGw[t1] += m.s1; baseGl[t1] += m.s2; baseGw[t2] += m.s2; baseGl[t2] += m.s1;
        if (m.s1 > m.s2) { baseMw[t1]++; baseMl[t2]++; baseH2h[t1][t2]++; } else if (m.s2 > m.s1) { baseMw[t2]++; baseMl[t1]++; baseH2h[t2][t1]++; }
      } else { unplayed.push({ t1, t2, curS1: m.s1 || 0, curS2: m.s2 || 0 }); }
    }
    const unplayedLen = unplayed.length; const simMw = new Int32Array(9); const simGw = new Int32Array(9); const simGl = new Int32Array(9); const simH2h = new Int32Array(81); const baseH2hFlat = new Int32Array(81);
    for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) baseH2hFlat[i * 9 + j] = baseH2h[i][j];
    for (let iter = 0; iter < iterations; iter++) {
      const iterStandings = [0, 1, 2, 3, 4, 5, 6, 7, 8];
      for (let i = 0; i < 9; i++) { simMw[i] = baseMw[i]; simGw[i] = baseGw[i]; simGl[i] = baseGl[i]; }
      for (let i = 0; i < 81; i++) simH2h[i] = baseH2hFlat[i];
      for (let i = 0; i < unplayedLen; i++) {
        const m = unplayed[i]; let s1 = m.curS1; let s2 = m.curS2;
        while (s1 < 2 && s2 < 2) { if (seededRandom() > 0.5) s1++; else s2++; }
        simGw[m.t1] += s1; simGl[m.t1] += s2; simGw[m.t2] += s2; simGl[m.t2] += s1;
        if (s1 > s2) { simMw[m.t1]++; simH2h[m.t1 * 9 + m.t2]++; } else { simMw[m.t2]++; simH2h[m.t2 * 9 + m.t1]++; }
      }
      iterStandings.sort((a, b) => {
        if (simMw[b] !== simMw[a]) return simMw[b] - simMw[a];
        const gdA = simGw[a] - simGl[a]; const gdB = simGw[b] - simGl[b];
        if (gdB !== gdA) return gdB - gdA;
        const h2hDiff = simH2h[b * 9 + a] - simH2h[a * 9 + b];
        if (h2hDiff !== 0) return h2hDiff;
        let gwrA = (simGw[a] + simGl[a]) > 0 ? simGw[a] / (simGw[a] + simGl[a]) : 0;
        let gwrB = (simGw[b] + simGl[b]) > 0 ? simGw[b] / (simGw[b] + simGl[b]) : 0;
        if (gwrB !== gwrA) return gwrB - gwrA;
        return TEAMS[a].localeCompare(TEAMS[b]);
      });
      for (let i = 0; i < 9; i++) {
        const teamName = TEAMS[iterStandings[i]];
        if (i < 2) counts[teamName].upper++; if (i >= 2 && i < 6) counts[teamName].playin++;
        if (i < 6) counts[teamName].playoff++; if (i >= 6) counts[teamName].elim++;
      }
    }
    let tempProbs = {};
    TEAMS.forEach((t) => { tempProbs[t] = { upper: ((counts[t].upper / iterations) * 100).toFixed(2), playin: ((counts[t].playin / iterations) * 100).toFixed(2), playoff: ((counts[t].playoff / iterations) * 100).toFixed(2), elim: ((counts[t].elim / iterations) * 100).toFixed(2) }; });
    setProbs(tempProbs);
  }, []);

  useEffect(() => { if (state.length > 0) { setIsCalculating(true); const timer = setTimeout(() => { runSimulation(state); setIsCalculating(false); }, 0); return () => clearTimeout(timer); } }, [state, runSimulation]);
  useEffect(() => { setTeamLogos(FALLBACK_LOGOS); initBaseState().then(() => { setTimeout(() => { setIsAppReady(true); initFirebase(); }, 500); }); }, []);

  // --- 4. HANDLERS & FUNCTIONS ---
  const updateSearch = (e) => setHeroSearchQuery(e.target.value);
  const updateRoleFilter = (e) => setHeroRoleFilter(e.target.value);
  const switchTab = (tab) => { setActiveTab(tab); if (tab === "standings") setTimeout(() => scrollToActiveWeek(), 300); };
  const showPreview = (match, e) => { setHoveredMatchPreview(match); updatePreviewPos(e); };
  const updatePreviewPos = (e) => { let x = e.clientX - 480; if (x < 20) x = e.clientX + 30; let y = e.clientY - 150; if (y < 20) y = 20; setPreviewX(x); setPreviewY(y); };
  const hidePreview = () => setHoveredMatchPreview(null);
  const closeDraftModal = () => setDraftModalMatch(null);
  const openDraftModal = (m) => setDraftModalMatch(m);
  
  const openHeroDetail = (heroName) => setHeroDetailModal(heroName);
  const closeHeroDetail = () => setHeroDetailModal(null);

  const toggleAdmin = () => { if (isAdminMode) { setIsAdminMode(false); triggerToast("Mode Admin Dinonaktifkan."); return; } const pwd = prompt("Masukkan Kunci Rahasia Admin:"); if (pwd === "admin123") { setIsAdminMode(true); triggerToast("Mode Admin Diaktifkan! Akses Edit Terbuka."); } else if (pwd !== null) { triggerToast("Kunci Rahasia Salah!", true); } };
  
  const toggleHighlight = (team) => setHighlightedTeam(team === highlightedTeam ? null : team);
  const handleSort = (col) => { if (sortCol === col) setSortAsc(!sortAsc); else { setSortCol(col); setSortAsc(false); } };
  const sortHero = (col) => { if (heroSortCol === col) setHeroSortAsc(!heroSortAsc); else { setHeroSortCol(col); setHeroSortAsc(false); } };
  const getProb = (team, type) => probs[team]?.[type] || "0.0";
  const getEmptyFormArray = (len) => Array(Math.max(0, 5 - len)).fill(null);
  const getMatchesByFixed = (isFixed) => displayMatches.filter(m => m.fixed === isFixed);
  const changeWeek = (w) => setCurWeek(w);
  const triggerAiInsight = (team) => { /* AI Logic Placeholder */ };
  const shareStandings = () => triggerToast("Link Standings Disalin!");
  const addComboHero = (h) => { if(customComboHeroes.length < 5) setCustomComboHeroes([...customComboHeroes, h]); setCustomComboInput(""); setShowComboDropdown(false); };
  const removeComboHero = (h) => setCustomComboHeroes(customComboHeroes.filter(x => x !== h));
  const hideComboDropdownWithDelay = () => setTimeout(() => setShowComboDropdown(false), 200);
  const getDotColor = (label) => label.includes("Meta") ? "bg-orange-500 border-orange-400" : label.includes("Gem") ? "bg-emerald-500 border-emerald-400" : label.includes("Over") ? "bg-red-500 border-red-400" : "bg-slate-500 border-slate-400";
  const getLabelTextColor = (label) => label.includes("Meta") ? "text-orange-400" : label.includes("Gem") ? "text-emerald-400" : label.includes("Over") ? "text-red-400" : "text-slate-400";
  const getLabelBadgeColor = (label) => label.includes("Meta") ? "bg-orange-900/40 text-orange-400 border-orange-500/50" : label.includes("Gem") ? "bg-emerald-900/40 text-emerald-400 border-emerald-500/50" : label.includes("Over") ? "bg-red-900/40 text-red-400 border-red-500/50" : "bg-slate-800 text-slate-400 border-slate-600";

  const initBaseState = async () => {
    let tempState = []; officialMatchesRef.current = []; let currentId = 1;
    history.forEach((m) => { let mId = m.id || currentId; tempState.push({ id: mId, w: m.w, t1: TM[m.t1] || m.t1, t2: TM[m.t2] || m.t2, s1: m.s1, s2: m.s2, fixed: m.s1 === 2 || m.s2 === 2, _csvParsed: true }); currentId = Math.max(currentId, mId) + 1; });
    schedule.forEach((wf) => { wf.m.forEach((match) => { tempState.push({ id: currentId++, w: wf.w, t1: TM[match[0]] || match[0], t2: TM[match[1]] || match[1], s1: 0, s2: 0, fixed: false, _csvParsed: false }); }); });
    try {
      const response = await fetch(SPREADSHEET_API_URL + (SPREADSHEET_API_URL.includes("?") ? "&" : "?") + "nocache=" + new Date().getTime(), { cache: "no-store" });
      if (response.ok) {
        const csvText = await response.text(); const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l);
        for (let i = 0; i < lines.length; i++) {
          const rawTokens = lines[i].split(",").map((t) => t.replace(/^"|"$/g, "").trim());
          const findTeam = (inputStr) => { if (!inputStr) return null; let up = inputStr.toUpperCase(); let teamNamesMap = [ { key: "ONIC", names: ["ONIC", "FNATIC ONIC"] }, { key: "BTR", names: ["BTR", "BIGETRON", "BIGETRON VITALITY", "BIGETRON ALPHA"] }, { key: "EVOS", names: ["EVOS", "EVOS LEGENDS", "EVOS GLORY"] }, { key: "DEWA", names: ["DEWA", "DEWA UNITED", "DEWA UNITED ESPORTS"] }, { key: "TLID", names: ["TLID", "LIQUID", "TEAM LIQUID", "TEAM LIQUID ID", "AURA"] }, { key: "AE", names: ["AE", "ALTER EGO"] }, { key: "GEEK", names: ["GEEK", "GEEK FAM", "GEEK FAM ID"] }, { key: "NAVI", names: ["NAVI", "NATUS VINCERE"] }, { key: "RRQ", names: ["RRQ", "RRQ HOSHI"] } ]; for (let t of teamNamesMap) { if (t.names.some((name) => up.includes(name))) return TM[t.key]; } return null; };
          let parsedWeek = null; let wMatch = lines[i].match(/WEEK\s*([1-9])/i) || lines[i].match(/W\s*([1-9])/i); if (wMatch) parsedWeek = parseInt(wMatch[1]); else { let num = parseInt(rawTokens[0]); if (!isNaN(num) && num >= 1 && num <= 9) parsedWeek = num; }
          let s1 = null, s2 = null, t1Str = null, t2Str = null; let vsIdx = rawTokens.findIndex((t) => t.toUpperCase() === "VS");
          if (vsIdx !== -1 && vsIdx >= 2 && vsIdx + 2 < rawTokens.length) { s1 = parseInt(rawTokens[vsIdx - 1]); s2 = parseInt(rawTokens[vsIdx + 1]); t1Str = findTeam(rawTokens[vsIdx - 2]); t2Str = findTeam(rawTokens[vsIdx + 2]); }
          else { let nums = rawTokens.filter((t) => /^[012]$/.test(t)).map((t) => parseInt(t)); if (nums.length >= 2) { s1 = nums[nums.length - 2]; s2 = nums[nums.length - 1]; } let foundTeams = rawTokens.map((t) => findTeam(t)).filter(Boolean); let uniqueTeams = [...new Set(foundTeams)]; if (uniqueTeams.length >= 2) { t1Str = uniqueTeams[0]; t2Str = uniqueTeams[1]; } }
          if (s1 !== null && s2 !== null && !isNaN(s1) && !isNaN(s2) && (s1 > 0 || s2 > 0) && t1Str && t2Str) {
            let allPairMatches = tempState.filter((m) => (m.t1 === t1Str && m.t2 === t2Str) || (m.t1 === t2Str && m.t2 === t1Str));
            let targetMatch = (parsedWeek !== null && !isNaN(parsedWeek) && parsedWeek > 0) ? allPairMatches.find((m) => m.w === parsedWeek) : allPairMatches.find((m) => !m._csvParsed);
            if (targetMatch) { targetMatch._csvParsed = true; if (targetMatch.t1 === t1Str) { targetMatch.s1 = s1; targetMatch.s2 = s2; } else { targetMatch.s1 = s2; targetMatch.s2 = s1; } targetMatch.fixed = targetMatch.s1 >= 2 || targetMatch.s2 >= 2; }
          }
        }
      }
    } catch (err) { console.error("Gagal memuat eksternal spreadsheet", err); }
    history.forEach((hm) => { let match = tempState.find((m) => m.id === hm.id); if (match) { match.s1 = hm.s1; match.s2 = hm.s2; match.fixed = hm.s1 === 2 || hm.s2 === 2; match._csvParsed = true; } });
    tempState.forEach((m) => { if (typeof m.s1 === "number" && typeof m.s2 === "number" && (m.s1 > 0 || m.s2 > 0 || m.fixed)) { officialMatchesRef.current.push({ id: m.id, s1: m.s1, s2: m.s2, fixed: m.fixed }); } delete m._csvParsed; });
    setState(tempState); determineCurrentWeek(tempState);
  };

  const determineCurrentWeek = (currentState = state) => { let unplayedMatch = currentState.find((m) => m.s1 === 0 && m.s2 === 0 && !m.fixed); if (unplayedMatch) setCurWeek(unplayedMatch.w); else setCurWeek(Math.max(...currentState.map((m) => m.w))); scrollToActiveWeek(); };
  const scrollToActiveWeek = () => { setTimeout(() => { const container = document.getElementById("weekNavScroll"); const activeBtn = document.getElementById("week-btn-" + curWeek); if (container && activeBtn) { const scrollLeft = activeBtn.offsetLeft - container.clientWidth / 2 + activeBtn.clientWidth / 2; container.scrollTo({ left: scrollLeft, behavior: "smooth" }); } }, 100); };
  const initFirebase = async () => { try { const apps = getApps(); let myApp = apps.length ? apps[0] : initializeApp(CUSTOM_FIREBASE_CONFIG, "MPLCustomApp_vFinal"); dbRef.current = getFirestore(myApp); authRef.current = getAuth(myApp); await signInAnonymously(authRef.current); onAuthStateChanged(authRef.current, async (user) => { currentUserRef.current = user || { uid: "public-guest" }; listenToGlobalData(); }); } catch (e) { updateSync("Offline", "text-slate-400"); } };
  const listenToGlobalData = () => {
    if (!dbRef.current) return;
    if (unsubscribeDraftsRef.current) unsubscribeDraftsRef.current(); if (unsubscribeScoresRef.current) unsubscribeScoresRef.current();
    unsubscribeDraftsRef.current = onSnapshot(doc(dbRef.current, "artifacts", appIdRef.current, "public", "data", "mpl_global", "drafts_data"), (docSnap) => { if (docSnap.exists()) { const data = docSnap.data()["drafts"]; if (data) setDraftState(data); } syncMatches(); updateSync("Global Synced", "text-emerald-400"); }, (err) => console.error(err));
    unsubscribeScoresRef.current = onSnapshot(doc(dbRef.current, "artifacts", appIdRef.current, "public", "data", "mpl_global", "official_scores"), (docSnap) => { if (docSnap.exists()) { const data = docSnap.data()["scores"]; if (data) setGlobalScores(data); } syncMatches(); });
  };
  const syncMatches = () => { setState((currentMatches) => { const newMatches = currentMatches.map((m) => { const hMatch = officialMatchesRef.current.find((om) => om.id === m.id); if (hMatch) return { ...m, s1: hMatch.s1, s2: hMatch.s2, fixed: hMatch.fixed }; const dbScore = globalScores[m.id]; if (dbScore) return { ...m, s1: dbScore.s1, s2: dbScore.s2, fixed: dbScore.s1 === 2 || dbScore.s2 === 2 }; return { ...m, fixed: false }; }); determineCurrentWeek(newMatches); return newMatches; }); };
  const lockGlobalScore = async (id, s1, s2) => { if (!dbRef.current) return triggerToast("Database Master tidak terkoneksi!", true); const currentScores = { ...globalScores }; currentScores[id] = { s1, s2 }; await setDoc(doc(dbRef.current, "artifacts", appIdRef.current, "public", "data", "mpl_global", "official_scores"), { scores: currentScores }, { merge: true }); triggerToast(`Match ${id} Berhasil Dikunci (Global)!`); };
  const unlockGlobalScore = async (id) => { if (!dbRef.current) return triggerToast("Database Master tidak terkoneksi!", true); const currentScores = { ...globalScores }; delete currentScores[id]; await setDoc(doc(dbRef.current, "artifacts", appIdRef.current, "public", "data", "mpl_global", "official_scores"), { scores: currentScores }, { merge: true }); triggerToast(`Match ${id} Berhasil Dibuka!`); };
  const updateSync = (msg, color) => { setSyncStatus(msg); setSyncColor(color); };
  const onDropdownScore = (event) => { let val = parseInt(event.val); setState((s) => s.map((m) => { if (m.id === event.id && !m.fixed) { let newM = { ...m }; if (event.team === 1) { newM.s1 = val; if (val === 2 && newM.s2 === 2) newM.s2 = 0; } else { newM.s2 = val; if (val === 2 && newM.s1 === 2) newM.s1 = 0; } return newM; } return m; })); };
  const clearMatch = (id) => { setState((s) => s.map((m) => (m.id === id && !m.fixed ? { ...m, s1: 0, s2: 0 } : m))); };
  const clearCurrentWeek = () => { setState((s) => s.map((m) => (m.w === curWeek && !m.fixed ? { ...m, s1: 0, s2: 0 } : m))); };
  const randomizeCurrentWeek = () => { setState((s) => s.map((m) => { if (!m.fixed && m.w === curWeek && m.s1 === 0 && m.s2 === 0) { let win = Math.random() > 0.5; let clean = Math.random() > 0.5; return { ...m, s1: win ? 2 : clean ? 0 : 1, s2: win ? (clean ? 0 : 1) : 2 }; } return m; })); };
  const randomizeRemaining = () => { setState((s) => s.map((m) => { if (!m.fixed && m.s1 === 0 && m.s2 === 0) { let win = Math.random() > 0.5; let clean = Math.random() > 0.5; return { ...m, s1: win ? 2 : clean ? 0 : 1, s2: win ? (clean ? 0 : 1) : 2 }; } return m; })); insightCacheRef.current = {}; };
  const resetSim = () => { setState((s) => s.map((m) => (!m.fixed ? { ...m, s1: 0, s2: 0 } : m))); insightCacheRef.current = {}; determineCurrentWeek(); };
  const saveLocalScenario = (slotNum) => { const dataToSave = state.filter((m) => !m.fixed).map((m) => ({ id: m.id, s1: m.s1, s2: m.s2 })); localStorage.setItem(`mpl_id_scenario_slot_${slotNum}`, JSON.stringify(dataToSave)); triggerToast(`Prediksi berhasil disimpan ke Slot ${slotNum}`); };
  const loadLocalScenario = (slotNum) => { const savedStr = localStorage.getItem(`mpl_id_scenario_slot_${slotNum}`); if (savedStr) { const savedData = JSON.parse(savedStr); setState((s) => s.map((m) => { const sm = savedData.find((x) => x.id === m.id); return sm && !m.fixed ? { ...m, s1: sm.s1, s2: sm.s2 } : m; })); triggerToast(`Memuat Skenario dari Slot ${slotNum}`); } else { triggerToast(`Slot ${slotNum} masih kosong!`, true); } };
  const triggerToast = (msg, isError = false) => { setToastMsg(msg); setIsToastError(isError); setShowToast(true); setTimeout(() => setShowToast(false), 3000); };

  // --- HERO DETAIL DATA CALCULATION (NEW FEATURE) ---
  const heroDetailData = useMemo(() => {
    if (!heroDetailModal) return { byTeam: [], withHero: [], againstHero: [], matchHistory: [] };
    
    const targetHero = heroDetailModal;
    const teamStats = {};
    const synergyStats = {};
    const counterStats = {};
    const matchHistory = [];

    Object.entries(draftState).forEach(([mId, games]) => {
      const matchInfo = state.find((m) => m.id === parseInt(mId));
      if (!matchInfo) return;

      games.forEach((game, gIdx) => {
        const t1Picks = game.t1Picks || [];
        const t2Picks = game.t2Picks || [];
        const t1Bans = game.t1Bans || [];
        const t2Bans = game.t2Bans || [];
        
        const allHeroesInGame = [...t1Picks, ...t2Picks, ...t1Bans, ...t2Bans];
        if (!allHeroesInGame.includes(targetHero)) return;

        let heroSide = null; 
        let heroRole = null; 
        let heroTeamName = null;
        let enemyPicks = [];

        if (t1Picks.includes(targetHero)) {
          heroSide = 't1'; heroRole = 'pick';
          heroTeamName = matchInfo.t1; enemyPicks = t2Picks;
        } else if (t2Picks.includes(targetHero)) {
          heroSide = 't2'; heroRole = 'pick';
          heroTeamName = matchInfo.t2; enemyPicks = t1Picks;
        } else if (t1Bans.includes(targetHero)) {
          heroSide = 't1'; heroRole = 'ban';
          heroTeamName = matchInfo.t1; 
        } else if (t2Bans.includes(targetHero)) {
          heroSide = 't2'; heroRole = 'ban';
          heroTeamName = matchInfo.t2; 
        }

        const isWin = heroSide === 't1' ? game.t1Result === 'W' : game.t2Result === 'W';
        const isLoss = heroSide === 't1' ? game.t1Result === 'L' : game.t2Result === 'L';

        if (heroRole === 'pick') {
          if (!teamStats[heroTeamName]) teamStats[heroTeamName] = { name: heroTeamName, total: 0, wins: 0 };
          teamStats[heroTeamName].total++;
          if (isWin) teamStats[heroTeamName].wins++;

          const myPicks = heroSide === 't1' ? t1Picks : t2Picks;
          myPicks.forEach((h) => {
            if (h && h !== targetHero) {
              if (!synergyStats[h]) synergyStats[h] = { name: h, total: 0, wins: 0 };
              synergyStats[h].total++;
              if (isWin) synergyStats[h].wins++;
            }
          });

          enemyPicks.forEach((h) => {
            if (h) {
              if (!counterStats[h]) counterStats[h] = { name: h, total: 0, losses: 0 };
              counterStats[h].total++;
              if (isLoss) counterStats[h].losses++;
            }
          });
        }

        matchHistory.push({
          matchId: matchInfo.id, gameIdx: gIdx + 1, t1: matchInfo.t1, t2: matchInfo.t2,
          map: game.map || 'Unknown', duration: game.duration || '00:00',
          t1Side: game.t1Side, t2Side: game.t2Side, t1Result: game.t1Result, t2Result: game.t2Result,
          t1Picks, t2Picks, t1Bans, t2Bans, heroRole, heroSide, heroTeamName, isWin
        });
      });
    });

    const formatArr = (obj, sortKey, limit = 5) => 
      Object.values(obj)
        .map((v) => ({ ...v, wr: v.total > 0 ? Math.round(((sortKey === 'losses' ? v.losses : v.wins) / v.total) * 100) : 0 }))
        .sort((a, b) => b.total - a.total || b[sortKey] - a[sortKey])
        .slice(0, limit);

    return {
      byTeam: formatArr(teamStats, 'wins', 5),
      withHero: formatArr(synergyStats, 'wins', 5),
      againstHero: Object.values(counterStats)
        .map(v => ({ name: v.name, total: v.total, losses: v.losses, wins: v.total - v.losses }))
        .sort((a, b) => b.losses - a.losses || b.total - a.total)
        .slice(0, 5),
      matchHistory: matchHistory.sort((a, b) => b.matchId - a.matchId || b.gameIdx - a.gameIdx)
    };
  }, [heroDetailModal, draftState, state]);

  // --- 5. RENDER ---
  return (
    <>
      <style>{`
        .host-wrapper { font-family: 'Inter', sans-serif; background-color: #0b0f1a; }
        .animate-fade-in { animation: fadeIn 0.2s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .liqui-table { border-collapse: collapse; font-size: 12px; width: 100%; }
        .liqui-table th { font-weight: bold; padding: 8px; }
        .liqui-row-even { background-color: #161616; }
        .liqui-row-odd { background-color: #111111; }
        .rank-playoff { background-color: #1e4a2e; color: white; border-right: 1px solid #333; }
        .rank-eliminated { background-color: #5c1c1c; color: white; border-right: 1px solid #333; }
        .team-link { color: #66b2ff; text-decoration: none; font-weight: 500; cursor: pointer; }
        .bg-prob-cell { position: relative; z-index: 1; }
        .prob-bar { position: absolute; top: 0; bottom: 0; left: 0; z-index: -1; opacity: 0.2; transition: width 0.3s ease; }
        .toast-container { transition: opacity 0.3s ease, transform 0.3s ease; transform: translate(-50%, -20px); visibility: hidden; opacity: 0; }
        .toast-show { visibility: visible; opacity: 1; transform: translate(-50%, 0); }
      `}</style>
      
      {!isAppReady && (
        <div className="fixed inset-0 z-[9999] bg-[#0b0f1a] flex flex-col items-center justify-center">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 animate-ping"></div>
            <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-[0_0_30px_rgba(59,130,246,0.6)] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>
            </div>
          </div>
          <div className="mt-8 text-blue-400 font-bold tracking-widest animate-pulse text-sm">Menyinkronkan Database...</div>
        </div>
      )}

      <div className={`host-wrapper text-slate-100 min-h-screen pb-12 relative font-sans ${!isAppReady ? "opacity-0" : "opacity-100 duration-1000"}`}>
        {/* Header & Tabs */}
        <div className="bg-[#0c0c0c] border-b border-[#333] sticky top-0 z-[100] shadow-xl">
          <div className="max-w-[1400px] mx-auto px-4 flex justify-between items-center">
            <div className="flex">
              <button onClick={() => switchTab("standings")} className={`px-4 md:px-6 py-4 font-black uppercase tracking-wider text-xs md:text-sm border-b-2 flex items-center gap-2 ${activeTab === "standings" ? "border-blue-500 text-blue-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg> Standings</button>
              <button onClick={() => switchTab("analytics")} className={`px-4 md:px-6 py-4 font-black uppercase tracking-wider text-xs md:text-sm border-b-2 flex items-center gap-2 ${activeTab === "analytics" ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg> Hero Statistics</button>
            </div>
            <button onClick={toggleAdmin} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 ${isAdminMode ? "bg-amber-500/20 text-amber-500 border border-amber-500/50 shadow" : "bg-slate-800 text-slate-400 border border-slate-700"}`}><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> {isAdminMode ? "Admin Active" : "Admin Login"}</button>
          </div>
        </div>

        <div className={`fixed top-5 left-1/2 text-white px-6 py-3 rounded-full shadow-2xl font-bold z-[10000] pointer-events-none flex items-center gap-2 toast-container ${showToast ? "toast-show" : ""} ${isToastError ? "bg-red-600" : "bg-emerald-600"}`}><span>{toastMsg}</span></div>

        <div className="max-w-[1400px] mx-auto px-4 pt-6">
          {activeTab === "standings" && (
            <>
              {/* Standings Header */}
              <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-center md:text-left">
                  <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic flex items-center justify-center md:justify-start gap-3">MPL ID S17 <span className="text-blue-500">PREDICTOR</span></h1>
                  <p className="text-slate-400 font-medium mt-1">Simulasi Skenario & AI Analisis Klasemen</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 bg-slate-800/50 p-2 rounded-2xl border border-slate-700">
                  <div className="px-4 py-2 border-r border-slate-700 flex flex-col justify-center">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest">Data Master</span>
                    <span className={`font-bold text-sm ${syncColor}`}>{syncStatus}</span>
                  </div>
                  <button onClick={shareStandings} className="bg-slate-800 border border-slate-600 hover:bg-blue-600 text-slate-200 hover:text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm">Share</button>
                  <button onClick={randomizeRemaining} className="bg-slate-800 border border-slate-600 hover:bg-purple-600 text-slate-200 hover:text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm">Auto-Fill Semua</button>
                  <button onClick={resetSim} className="bg-slate-800 border border-slate-600 hover:bg-red-600 text-slate-200 hover:text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm">Reset</button>
                </div>
              </header>

              {/* Standings Table & Match Cards Grid */}
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
                      <table className="liqui-table text-left whitespace-nowrap">
                        <thead>
                          <tr>
                            <th className="w-8 text-center cursor-pointer hover:bg-[#333]" onClick={() => handleSort("default")}># <span className="text-[10px] text-blue-400">{sortCol === "default" ? (sortAsc ? "▲" : "▼") : ""}</span></th>
                            <th>Team</th><th className="text-center w-12">M</th><th className="text-center w-12">G</th><th className="text-center w-12">Diff</th><th className="text-center w-24">Form</th>
                            <th className="text-center text-[11px] text-emerald-400 w-14 cursor-pointer" onClick={() => handleSort("playoff")}>Playoff</th>
                            <th className="text-center text-[11px] text-amber-500 w-14 cursor-pointer" onClick={() => handleSort("upper")}>Upper</th>
                            <th className="text-center text-[11px] text-blue-400 w-14 cursor-pointer" onClick={() => handleSort("playin")}>Play In</th>
                            <th className="text-center text-[11px] text-red-500 w-14 cursor-pointer" onClick={() => handleSort("elim")}>Elim</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedList.map((t, i) => (
                            <tr key={t.n} className={`border-b border-[#333] transition-colors ${i % 2 === 0 ? "liqui-row-even" : "liqui-row-odd"} ${highlightedTeam === t.n ? "ring-2 ring-blue-500 ring-inset bg-blue-900/20" : "hover:bg-[#2a2a2a]"} ${highlightedTeam && highlightedTeam !== t.n ? "opacity-40 grayscale hover:grayscale-0 hover:opacity-100" : ""}`}>
                              <td className={`text-center font-bold text-[14px] py-1.5 ${t.trueRank > 6 ? "rank-eliminated" : "rank-playoff"}`}>{t.trueRank}.</td>
                              <td className="py-1.5 px-2 flex items-center gap-2 min-w-[130px]">
                                {teamLogos[t.n] ? <img src={teamLogos[t.n]} className="w-6 h-6 object-contain shrink-0" /> : <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black shrink-0 bg-slate-800">{t.n.substring(0, 2).toUpperCase()}</div>}
                                <div className="flex items-center">
                                  <span onClick={() => toggleHighlight(t.n)} className={`team-link ${highlightedTeam === t.n ? "text-yellow-400 font-black" : ""}`}>{t.n}</span>
                                </div>
                              </td>
                              <td className="py-1.5 px-2 text-center font-bold text-white">{t.mw} - {t.ml}</td>
                              <td className="py-1.5 px-2 text-center text-gray-300">{t.gw} - {t.gl}</td>
                              <td className={`py-1.5 px-2 text-center font-bold ${t.gw - t.gl > 0 ? "text-white" : t.gw - t.gl < 0 ? "text-red-400" : "text-gray-400"}`}>{t.gw - t.gl > 0 ? "+" : ""}{t.gw - t.gl}</td>
                              <td className="py-1.5 px-1 text-center whitespace-nowrap">
                                <div className="flex gap-1 justify-center items-center min-w-[105px]">
                                  {getEmptyFormArray(t.form.length).map((_, idx) => ( <div key={`empty-${idx}`} className="w-[18px] h-[18px] rounded-full bg-slate-700/50 flex items-center justify-center text-[9px] text-slate-500 border border-slate-600/50 shrink-0">-</div> ))}
                                  {t.form.map((fMatch, idx) => teamLogos[fMatch.opp] ? ( <img key={idx} src={teamLogos[fMatch.opp]} className={`w-[18px] h-[18px] rounded-full object-contain bg-slate-800 shrink-0 ${fMatch.res === "W" ? "ring-1 ring-emerald-500 border border-emerald-900" : "ring-1 ring-red-500 border border-red-900"}`} title={`${fMatch.res} vs ${fMatch.opp}`} /> ) : ( <div key={idx} className={`w-[18px] h-[18px] rounded-full bg-slate-800 flex items-center justify-center text-[8px] font-black text-white shrink-0 ${fMatch.res === "W" ? "ring-1 ring-emerald-500 border border-emerald-900" : "ring-1 ring-red-500 border border-red-900"}`}>{fMatch.opp.substring(0, 2).toUpperCase()}</div> ))}
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
                    <div id="weekNavScroll" className="flex gap-2 overflow-x-auto scrollbar-hide flex-1 scroll-smooth">
                      {highlightedTeam ? (
                        <div onClick={() => toggleHighlight(highlightedTeam)} className="bg-blue-900/40 text-blue-300 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-between gap-2 border border-blue-500/50 w-full cursor-pointer hover:bg-red-900/40 hover:border-red-500/50 hover:text-red-300 transition-all" title="Klik untuk membatalkan mode fokus">
                          <span>Fokus: {TEAM_ABBR[highlightedTeam] || highlightedTeam}</span><span className="text-[10px] uppercase font-black tracking-widest opacity-70">✕ Tutup</span>
                        </div>
                      ) : (
                        [1, 2, 3, 4, 5, 6, 7, 8, 9].map((w) => (
                          <button key={w} id={`week-btn-${w}`} onClick={() => changeWeek(w)} className={`px-4 py-1.5 rounded-xl border text-xs font-black transition-all shrink-0 ${w === curWeek ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40 border-blue-500" : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"}`}>W{w}</button>
                        ))
                      )}
                    </div>
                  </div>
                  <div id="matchScrollArea" className="flex-1 overflow-y-auto relative scroll-smooth bg-[#0b0f1a]/30 p-5 flex flex-col">
                    {displayMatches.map((m) => ( 
                      <MatchCard 
                        key={m.id} 
                        m={m} 
                        highlightedTeam={highlightedTeam} 
                        teamLogos={teamLogos} 
                        isAdminMode={isAdminMode} 
                        isHistoryMatch={isHistoryMatch} 
                        clearMatch={clearMatch} 
                        openDraftModal={openDraftModal} 
                        showPreview={showPreview} 
                        updatePreviewPos={updatePreviewPos} 
                        hidePreview={hidePreview} 
                        onDropdownScore={onDropdownScore} 
                        unlockGlobalScore={unlockGlobalScore} 
                        lockGlobalScore={lockGlobalScore} 
                      /> 
                    ))}
                    {displayMatches.length === 0 && <div className="text-center text-slate-500 py-10 font-bold border-2 border-dashed border-slate-700 rounded-2xl bg-slate-800/30">Tidak ada data untuk filter yang dipilih.</div>}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "analytics" && (
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

              {/* Hero Quadrant & Matrix */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-6">
                <div className="xl:col-span-8 flex flex-col gap-6">
                  <div className="bg-[#111827] border border-slate-700 rounded-3xl p-5 shadow-2xl relative">
                    <div className="flex justify-between items-center mb-4">
                      <div><h3 className="text-lg font-black text-white uppercase flex items-center gap-2"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg> Hero Quadrant</h3></div>
                    </div>
                    <div className="relative w-full h-[320px] sm:h-[400px] bg-[#0b0f1a] border border-slate-700/50 rounded-xl overflow-hidden shadow-inner">
                      {filteredHeroData.filter((h) => h.pb_rate > 0).map((h) => (
                        <div key={h.name} className="absolute w-5 h-5 sm:w-7 sm:h-7 -ml-2.5 -mb-2.5 sm:-ml-3.5 sm:-mb-3.5 cursor-pointer hover:z-50 group" style={{ left: `${h.pb_rate > 95 ? 95 : h.pb_rate < 2 ? 2 : h.pb_rate}%`, bottom: `${h.w_rate > 95 ? 95 : h.w_rate < 2 ? 2 : h.w_rate}%` }} onClick={() => openHeroDetail(h.name)}>
                          <div className={`w-full h-full rounded-full border-2 transition-transform duration-200 group-hover:scale-[1.8] shadow-md relative z-10 ${getDotColor(h.label)}`}><img src={getHeroIcon(h.name)} className="w-full h-full rounded-full object-cover" /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-[#111827] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-700 bg-[#0c0c0c] flex justify-between items-center"><h3 className="text-lg font-black text-white uppercase tracking-wide">Data Matrix</h3></div>
                    <div className="overflow-x-auto overflow-y-auto w-full relative max-h-[500px]">
                      <table className="liqui-table text-left whitespace-nowrap w-full min-w-[900px]">
                        <thead className="bg-[#1a1a1a] sticky top-0 z-20 shadow-sm">
                          <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-[#333]">
                            <th className="w-8 text-center">#</th>
                            <th className="w-40 cursor-pointer hover:bg-[#333]" onClick={() => sortHero("name")}>Hero</th>
                            <th className="text-center cursor-pointer hover:bg-[#333]" onClick={() => sortHero("picks")}>Picks</th>
                            <th className="text-center cursor-pointer hover:bg-[#333]" onClick={() => sortHero("bans")}>Bans</th>
                            <th className="text-center cursor-pointer hover:bg-[#333]" onClick={() => sortHero("w_rate")}>Win Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredHeroData.map((h, i) => (
                            <tr key={h.name} className={`border-b border-slate-800/50 hover:bg-[#2a2a2a] cursor-pointer ${i % 2 === 0 ? "liqui-row-even" : "liqui-row-odd"}`} onClick={() => openHeroDetail(h.name)}>
                              <td className="text-center font-bold text-slate-500 py-2">{i + 1}</td>
                              <td className="py-2 px-2 flex items-center gap-3"><img src={getHeroIcon(h.name)} className="w-8 h-8 object-cover rounded shadow-md border border-slate-700" /><span className="font-bold text-slate-200">{h.name}</span></td>
                              <td className="text-center font-bold text-white">{h.picks}</td>
                              <td className="text-center font-bold text-red-400">{h.bans}</td>
                              <td className={`text-center font-black ${h.w_rate >= 50 ? "text-emerald-400" : "text-red-400"}`}>{h.w_rate}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="xl:col-span-4 flex flex-col gap-6">
                  <div className="bg-[#111827] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-full">
                    <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 px-5 py-4 border-b border-slate-700"><h3 className="text-lg font-black text-white uppercase flex items-center gap-2">Meta Analysis</h3></div>
                    <div className="p-5 space-y-6">
                      <div>
                        <h4 className="text-xs font-black text-orange-400 uppercase tracking-widest border-b border-slate-700 pb-2 mb-3">Top Meta (Impact)</h4>
                        <div className="space-y-2.5">
                          {analyticsInsights.topMeta.map((h) => (
                            <div key={h.name} className="flex items-center justify-between group cursor-pointer" onClick={() => openHeroDetail(h.name)}>
                              <div className="flex items-center gap-2.5"><img src={getHeroIcon(h.name)} className="w-6 h-6 rounded border border-orange-500/30 object-cover group-hover:scale-110 transition-transform" /><span className="text-xs font-bold text-slate-200 group-hover:text-orange-400 transition-colors">{h.name}</span></div>
                              <div className="text-[10px] font-black text-orange-400 bg-orange-900/20 px-1.5 py-0.5 rounded">{h.impact} pts</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#111827] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden mb-8">
                <div className="px-5 py-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                  <h3 className="text-base font-black text-white uppercase tracking-wide flex items-center gap-2">Team Signatures</h3>
                  <button onClick={() => setShowCompareModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-lg">Compare Teams</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-5">
                  {teamSignatures.map((ts) => (
                    <div key={ts.team} className="bg-[#0b0f1a] border border-slate-700/50 rounded-2xl p-4 shadow-lg flex flex-col justify-between group">
                      <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-3">
                        <img src={teamLogos[ts.team]} className="w-7 h-7 object-contain drop-shadow-md" />
                        <span className="font-black text-slate-100 text-sm tracking-widest uppercase">{ts.abbr}</span>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <div className="text-[9px] text-emerald-400 font-black uppercase mb-2">Most Picked</div>
                          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                            {ts.picks.map((h) => (
                              <div key={h.name} className="relative shrink-0 cursor-pointer flex flex-col items-center gap-1.5" onClick={() => openHeroDetail(h.name)}>
                                <img src={getHeroIcon(h.name)} className="w-10 h-10 rounded-xl border border-emerald-500/30 object-cover shadow-sm hover:border-emerald-400 hover:scale-105 transition-all" />
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

      {/* --- MODALS (IMPORTED FROM COMPONENTS) --- */}
      <CompareTeamsModal 
        showCompareModal={showCompareModal} 
        teamCompareData={teamCompareData} 
        compareTeamA={compareTeamA}
        setCompareTeamA={setCompareTeamA}
        compareTeamB={compareTeamB}
        setCompareTeamB={setCompareTeamB}
        compareMapFilter={compareMapFilter}
        setCompareMapFilter={setCompareMapFilter}
        teamLogos={teamLogos} 
        openHeroDetail={openHeroDetail} 
        setShowCompareModal={setShowCompareModal}
        MAP_LIST={MAP_LIST}
        TEAMS={TEAMS}
        TEAM_ABBR={TEAM_ABBR}
        getHeroIcon={getHeroIcon}
      />
      
      <HoverDraftPreview 
        hoveredMatchPreview={hoveredMatchPreview} 
        draftState={draftState} 
        previewX={previewX} 
        previewY={previewY} 
        TEAM_ABBR={TEAM_ABBR}
        getHeroIcon={getHeroIcon}
      />
      
      <DraftPreviewModal 
        draftModalMatch={draftModalMatch} 
        draftState={draftState} 
        teamLogos={teamLogos} 
        closeDraftModal={closeDraftModal} 
        TEAM_ABBR={TEAM_ABBR}
        getHeroIcon={getHeroIcon}
      />
      
      <HeroDetailModal 
        heroDetailModal={heroDetailModal} 
        heroDetailData={heroDetailData} 
        processedHeroData={processedHeroData} 
        teamLogos={teamLogos} 
        closeHeroDetail={closeHeroDetail} 
        setHeroDetailModal={setHeroDetailModal}
        getHeroIcon={getHeroIcon} 
      />
    </>
  );
}
