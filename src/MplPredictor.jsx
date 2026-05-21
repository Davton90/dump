// src/MplPredictor.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

// Import Constants & Utils
import { CUSTOM_FIREBASE_CONFIG, CUSTOM_APP_ID, SPREADSHEET_API_URL, TM, TEAMS, TEAM_ABBR, FALLBACK_LOGOS, HERO_ROLES, MAP_LIST, history, schedule } from "./constants";
import { calculate, getDisplayMatches, runSimulation } from "./utils";

// Import Components
import { MatchCard } from "./components/MatchCard";
import { CompareTeamsModal, HoverDraftPreview, DraftPreviewModal, HeroDetailModal } from "./components/Modals";

export default function MplPredictor() {
  // --- 1. STATE MANAGEMENT ---
  const [isAppReady, setIsAppReady] = useState(false);
  const [activeTab, setActiveTab] = useState("standings");
  // ... (Salin semua useState dan useRef dari kode asli di sini) ...

  // --- 2. MEMOIZED DATA & CALCULATIONS ---
  const heroRoleKeys = useMemo(() => Object.keys(HERO_ROLES), []);
  // src/components/Modals.jsx
export const HeroDetailModal = ({ heroDetailModal, heroDetailData, processedHeroData, teamLogos, closeHeroDetail, setHeroDetailModal, getHeroIcon }) => {
  if (!heroDetailModal) return null;
  
  const heroStats = processedHeroData.find((h) => h.name === heroDetailModal);

  return (
    <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-fade-in relative">
        
        {/* HEADER */}
        <div className="bg-[#0b0f19] px-6 py-5 border-b border-slate-700 flex justify-between items-start shrink-0">
          <div className="flex items-center gap-4">
            <img src={getHeroIcon(heroDetailModal)} className="w-16 h-16 rounded-xl border-2 border-slate-600 object-cover shadow-lg" />
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">{heroDetailModal}</h2>
              <span className="text-xs text-emerald-400 font-bold uppercase tracking-widest">{heroStats?.role || "Unknown"}</span>
            </div>
          </div>
          <button onClick={closeHeroDetail} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-all text-slate-400">✕</button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#111827] custom-scrollbar">
          
          {/* 1. STATISTIK INTI */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#1a2333] border border-slate-700/50 rounded-xl p-3 text-center">
              <div className="text-[10px] text-slate-400 font-black uppercase mb-1">Pick Rate</div>
              <div className="text-xl font-black text-white">{heroStats?.p_rate || 0}%</div>
            </div>
            <div className="bg-[#1a2333] border border-slate-700/50 rounded-xl p-3 text-center">
              <div className="text-[10px] text-slate-400 font-black uppercase mb-1">Ban Rate</div>
              <div className="text-xl font-black text-red-400">{heroStats?.b_rate || 0}%</div>
            </div>
            <div className="bg-[#1a2333] border border-slate-700/50 rounded-xl p-3 text-center">
              <div className="text-[10px] text-slate-400 font-black uppercase mb-1">Win Rate</div>
              <div className="text-xl font-black text-emerald-400">{heroStats?.w_rate || 0}%</div>
            </div>
            <div className="bg-[#1a2333] border border-slate-700/50 rounded-xl p-3 text-center">
              <div className="text-[10px] text-slate-400 font-black uppercase mb-1">Impact Score</div>
              <div className="text-xl font-black text-blue-400">{heroStats?.impact || 0}</div>
            </div>
          </div>

          {/* 2. RELASI HERO (TEAM, SYNERGY, COUNTER) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              { t: "Most Picked By (Team)", d: heroDetailData.byTeam, c: "blue", type: "team" },
              { t: "Best With (Synergy)", d: heroDetailData.withHero, c: "emerald", type: "hero" },
              { t: "Worst Against (Counters)", d: heroDetailData.againstHero, c: "orange", type: "counter" }
            ].map((sec) => (
              <div key={sec.t} className="space-y-3 bg-[#0b0f1a] p-4 rounded-2xl border border-slate-800">
                <h4 className={`text-[10px] text-${sec.c}-400 font-black uppercase tracking-widest border-b border-${sec.c}-900/50 pb-2`}>{sec.t}</h4>
                {sec.d.map((x, idx) => (
                  <div key={idx} className="flex justify-between items-center group cursor-pointer" onClick={() => sec.type !== "team" && setHeroDetailModal(x.name)}>
                    <span className={`text-xs font-bold text-slate-300 flex items-center gap-2 group-hover:text-${sec.c}-400`}>
                      {sec.type === "team" ? (
                        teamLogos[x.name] ? <img src={teamLogos[x.name]} className="w-4 h-4 object-contain" /> : <span className="w-4 text-center text-[9px]">{x.name.substring(0,2)}</span>
                      ) : (
                        <img src={getHeroIcon(x.name)} className="w-5 h-5 rounded object-cover" />
                      )}
                      {sec.type === "team" ? (x.name.length > 12 ? x.name.substring(0, 10) + "..." : x.name) : x.name}
                    </span>
                    <span className="text-[10px] font-black text-slate-400">
                      {sec.type === "counter" ? (
                        <>{x.losses}L <span className="text-slate-600">/</span> {x.wins}W</>
                      ) : (
                        <>{x.total}x <span className={x.wr >= 50 ? "text-emerald-400" : "text-red-400"}>({x.wr}%)</span></>
                      )}
                    </span>
                  </div>
                ))}
                {sec.d.length === 0 && <div className="text-xs text-slate-500 text-center py-4">Belum ada data</div>}
              </div>
            ))}
          </div>

          {/* 3. MATCH HISTORY (PICK & BAN) */}
          <div className="border-t border-slate-700 pt-4">
            <h4 className="text-sm text-white font-black uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="text-blue-400">📜</span> Match History ({heroDetailData.matchHistory.length} Games)
            </h4>
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {heroDetailData.matchHistory.map((hist, idx) => (
                <div key={idx} className="bg-[#0b0f1a] border border-slate-700/50 rounded-xl p-3 text-xs">
                  <div className="flex justify-between items-center mb-2 text-slate-400 font-bold">
                    <span>Match {hist.matchId} - Game {hist.gameIdx}</span>
                    <span>📍 {hist.map} | ⏱️ {hist.duration}</span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-black text-sm ${hist.heroSide === 't1' ? 'text-blue-400' : 'text-slate-300'}`}>{hist.t1}</span>
                    <div className="flex gap-2 items-center">
                       <span className={`font-black ${hist.t1Result === 'W' ? 'text-emerald-400' : 'text-red-400'}`}>{hist.t1Result === 'W' ? 'WIN' : 'LOSS'}</span>
                       <span className="text-slate-600 text-[10px]">VS</span>
                       <span className={`font-black ${hist.t2Result === 'W' ? 'text-emerald-400' : 'text-red-400'}`}>{hist.t2Result === 'W' ? 'WIN' : 'LOSS'}</span>
                    </div>
                    <span className={`font-black text-sm ${hist.heroSide === 't2' ? 'text-red-400' : 'text-slate-300'}`}>{hist.t2}</span>
                  </div>

                  {/* Draft Visual */}
                  <div className="flex items-center justify-between gap-2 bg-slate-900/50 p-2 rounded-lg">
                    <div className="flex gap-1">
                      {hist.t1Picks.map((p, i) => p && <img key={i} src={getHeroIcon(p)} className={`w-6 h-6 rounded border ${p === heroDetailModal ? 'border-yellow-400 ring-1 ring-yellow-400 z-10 scale-110' : 'border-slate-600'}`} />)}
                    </div>
                    <div className="text-[9px] text-slate-500 font-bold">VS</div>
                    <div className="flex gap-1">
                      {hist.t2Picks.map((p, i) => p && <img key={i} src={getHeroIcon(p)} className={`w-6 h-6 rounded border ${p === heroDetailModal ? 'border-yellow-400 ring-1 ring-yellow-400 z-10 scale-110' : 'border-slate-600'}`} />)}
                    </div>
                  </div>
                  
                  {/* Status Indicator */}
                  <div className="mt-2 text-center">
                    {hist.heroRole === 'pick' ? (
                      <span className={`font-black uppercase tracking-wider ${hist.isWin ? 'text-emerald-400' : 'text-red-400'}`}>
                        ✅ Picked by {hist.heroTeamName} ({hist.heroSide === 't1' ? hist.t1Side : hist.t2Side} side) - {hist.isWin ? 'VICTORY' : 'DEFEAT'}
                      </span>
                    ) : (
                      <span className="text-orange-400 font-black uppercase tracking-wider">
                        🚫 Banned by {hist.heroTeamName}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {heroDetailData.matchHistory.length === 0 && (
                <div className="text-center text-slate-500 py-6 border-2 border-dashed border-slate-700 rounded-xl">
                  Belum ada riwayat pertandingan untuk hero ini.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

  // --- 3. EFFECTS & FIREBASE ---
  useEffect(() => { /* ... */ }, [state, runSimulation]);
  // ... (Salin semua useEffect dari kode asli di sini) ...
  
  // --- 4. HANDLERS & FUNCTIONS ---
  const updateSearch = (e) => setHeroSearchQuery(e.target.value);
  // ... (Salin semua fungsi handler seperti toggleAdmin, initBaseState, syncMatches, dll di sini) ...
              // --- HANDLERS ---
const openHeroDetail = (heroName) => setHeroDetailModal(heroName);
const closeHeroDetail = () => setHeroDetailModal(null);

// --- HERO DETAIL DATA CALCULATION ---
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
      
      // Cek apakah hero ada di game ini (Pick atau Ban)
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

      // 1. Pick by Team Stats
      if (heroRole === 'pick') {
        if (!teamStats[heroTeamName]) teamStats[heroTeamName] = { name: heroTeamName, total: 0, wins: 0 };
        teamStats[heroTeamName].total++;
        if (isWin) teamStats[heroTeamName].wins++;

        // 2. Best With (Synergy)
        const myPicks = heroSide === 't1' ? t1Picks : t2Picks;
        myPicks.forEach((h) => {
          if (h && h !== targetHero) {
            if (!synergyStats[h]) synergyStats[h] = { name: h, total: 0, wins: 0 };
            synergyStats[h].total++;
            if (isWin) synergyStats[h].wins++;
          }
        });

        // 3. Worst Against (Counters)
        enemyPicks.forEach((h) => {
          if (h) {
            if (!counterStats[h]) counterStats[h] = { name: h, total: 0, losses: 0 };
            counterStats[h].total++;
            if (isLoss) counterStats[h].losses++;
          }
        });
      }

      // 4. Push ke Match History
      matchHistory.push({
        matchId: matchInfo.id,
        gameIdx: gIdx + 1,
        t1: matchInfo.t1,
        t2: matchInfo.t2,
        map: game.map || 'Unknown',
        duration: game.duration || '00:00',
        t1Side: game.t1Side,
        t2Side: game.t2Side,
        t1Result: game.t1Result,
        t2Result: game.t2Result,
        t1Picks, t2Picks, t1Bans, t2Bans,
        heroRole, 
        heroSide, 
        heroTeamName,
        isWin
      });
    });
  });

  // Helper Format Array
  const formatArr = (obj, sortKey, limit = 5) => 
    Object.values(obj)
      .map((v) => ({ 
        ...v, 
        wr: v.total > 0 ? Math.round(((sortKey === 'losses' ? v.losses : v.wins) / v.total) * 100) : 0 
      }))
      .sort((a, b) => b.total - a.total || b[sortKey] - a[sortKey])
      .slice(0, limit);

  return {
    byTeam: formatArr(teamStats, 'wins', 5),
    withHero: formatArr(synergyStats, 'wins', 5),
    againstHero: Object.values(counterStats)
      .map(v => ({
        name: v.name,
        total: v.total,
        losses: v.losses,
        wins: v.total - v.losses,
      }))
      .sort((a, b) => b.losses - a.losses || b.total - a.total)
      .slice(0, 5),
    matchHistory: matchHistory.sort((a, b) => b.matchId - a.matchId || b.gameIdx - a.gameIdx) // Urutkan dari yang terbaru
  };
}, [heroDetailModal, draftState, state]);
  // --- 5. RENDER ---
  return (
    <>
      <style>{`...`}</style>
      
      {!isAppReady && ( /* Loading Screen */ )}
      
      <div className={`host-wrapper text-slate-100 min-h-screen pb-12 relative font-sans ${!isAppReady ? "opacity-0" : "opacity-100 duration-1000"}`}>
        {/* Header & Tabs */}
        
        <div className="max-w-[1400px] mx-auto px-4 pt-6">
          {activeTab === "standings" && (
            <>
              {/* Standings Header & Table */}
              {/* Match Cards Area */}
              {displayMatches.map((m) => (
                <MatchCard 
                  key={m.id} 
                  m={m} 
                  highlightedTeam={highlightedTeam} 
                  teamLogos={teamLogos} 
                  // ... pass props lainnya ...
                />
              ))}
            </>
          )}

          {activeTab === "analytics" && (
            <>
              {/* Analytics Hero Quadrant, Matrix, Meta Analysis, dll */}
            </>
          )}
        </div>
      </div>

      {/* --- MODALS --- */}
      <CompareTeamsModal 
        showCompareModal={showCompareModal} 
        teamCompareData={teamCompareData} 
        // ... pass props ...
      />
      
      <HoverDraftPreview 
        hoveredMatchPreview={hoveredMatchPreview} 
        draftState={draftState} 
        previewX={previewX} 
        previewY={previewY} 
      />
      
      <DraftPreviewModal 
        draftModalMatch={draftModalMatch} 
        draftState={draftState} 
        teamLogos={teamLogos} 
        closeDraftModal={closeDraftModal} 
      />
      
      <HeroDetailModal 
        heroDetailModal={heroDetailModal} 
        heroDetailData={heroDetailData} 
        processedHeroData={processedHeroData} 
        teamLogos={teamLogos} 
        closeHeroDetail={closeHeroDetail} 
        setHeroDetailModal={setHeroDetailModal} 
      />
    </>
  );
}
