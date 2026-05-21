// src/components/Modals.jsx
import React from "react";
import { TEAM_ABBR, TEAMS, MAP_LIST } from "../constants";

// 1. Compare Teams Modal
export const CompareTeamsModal = ({ showCompareModal, teamCompareData, compareTeamA, setCompareTeamA, compareTeamB, setCompareTeamB, compareMapFilter, setCompareMapFilter, teamLogos, openHeroDetail, setShowCompareModal }) => {
  if (!showCompareModal || !teamCompareData) return null;
  return (
    <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      {/* ... (Salin JSX Compare Teams Modal di sini) ... */}
    </div>
  );
};

// 2. Hover Draft Preview
export const HoverDraftPreview = ({ hoveredMatchPreview, draftState, previewX, previewY }) => {
  if (!hoveredMatchPreview || !draftState[hoveredMatchPreview.id] || draftState[hoveredMatchPreview.id].length === 0) return null;
  return (
    <div className="fixed pointer-events-none z-[10005] bg-[#1a1f2e]/95 backdrop-blur-xl border border-slate-600/50 rounded-2xl shadow-2xl p-4 w-[420px]" style={{ left: previewX, top: previewY }}>
      {/* ... (Salin JSX Hover Draft Preview di sini) ... */}
    </div>
  );
};

// 3. Draft Preview Modal (Full Screen)
export const DraftPreviewModal = ({ draftModalMatch, draftState, teamLogos, closeDraftModal }) => {
  if (!draftModalMatch) return null;
  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      {/* ... (Salin JSX Draft Preview Modal di sini) ... */}
    </div>
  );
};

// 4. Hero Detail Modal
export const HeroDetailModal = ({ heroDetailModal, heroDetailData, processedHeroData, teamLogos, closeHeroDetail, setHeroDetailModal }) => {
  if (!heroDetailModal) return null;
  return (
    <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      {/* ... (Salin JSX Hero Detail Modal di sini) ... */}
    </div>
  );
};
