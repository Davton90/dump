// src/components/MatchCard.jsx
import React from "react";
import { TEAM_ABBR } from "../constants";

export const MatchCard = ({ m, highlightedTeam, teamLogos, isAdminMode, isHistoryMatch, clearMatch, openDraftModal, showPreview, updatePreviewPos, hidePreview, onDropdownScore, unlockGlobalScore, lockGlobalScore }) => {
  const isPredicted = m.s1 > 0 || m.s2 > 0;
  
  return (
    <div className={`p-3.5 rounded-2xl border mb-4 transition-all relative ${m.borderClass}`}>
      {/* ... (Salin seluruh isi return JSX MatchCard dari kode asli di sini) ... */}
    </div>
  );
};
