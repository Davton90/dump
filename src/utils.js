// src/utils.js
import { TEAMS, TEAM_ABBR } from './constants';

// --- ADVANCED KLASEMEN CALCULATION ---
export function calculate(matches) {
  let s = {};
  TEAMS.forEach((t) => (s[t] = { n: t, mw: 0, ml: 0, gw: 0, gl: 0, form: [] }));
  
  matches.forEach((m) => {
    if (!s[m.t1] || !s[m.t2]) return;
    if (typeof m.s1 === "number" && typeof m.s2 === "number") {
      if (m.fixed || m.s1 > 0 || m.s2 > 0) {
        s[m.t1].gw += m.s1; s[m.t1].gl += m.s2;
        s[m.t2].gw += m.s2; s[m.t2].gl += m.s1;
        if (m.s1 > m.s2) {
          s[m.t1].mw++; s[m.t2].ml++;
          s[m.t1].form.push({ res: "W", opp: m.t2 }); s[m.t2].form.push({ res: "L", opp: m.t1 });
        } else if (m.s2 > m.s1) {
          s[m.t2].mw++; s[m.t1].ml++;
          s[m.t2].form.push({ res: "W", opp: m.t1 }); s[m.t1].form.push({ res: "L", opp: m.t2 });
        }
      }
    }
  });
  
  TEAMS.forEach((t) => { s[t].form = s[t].form.slice(-5); });
  let list = Object.values(s);
  
  list.sort((a, b) => {
    if (b.mw !== a.mw) return b.mw - a.mw;
    let gdA = a.gw - a.gl; let gdB = b.gw - b.gl;
    if (gdB !== gdA) return gdB - gdA;
    return 0;
  });

  let buckets = [];
  let currentBucket = [list[0]];
  for (let i = 1; i < list.length; i++) {
    let prev = list[i - 1]; let curr = list[i];
    if (curr.mw === prev.mw && (curr.gw - curr.gl) === (prev.gw - prev.gl)) {
      currentBucket.push(curr);
    } else {
      buckets.push(currentBucket);
      currentBucket = [curr];
    }
  }
  buckets.push(currentBucket);

  let finalStandings = [];
  buckets.forEach((bucket) => {
    if (bucket.length === 1) { finalStandings.push(bucket[0]); return; }
    let tiedNames = bucket.map((t) => t.n);
    let miniStats = {};
    tiedNames.forEach((name) => { miniStats[name] = { mw: 0, gw: 0, gl: 0 }; });
    
    matches.forEach((m) => {
      if (typeof m.s1 !== "number" || typeof m.s2 !== "number") return;
      if (m.s1 === 0 && m.s2 === 0 && !m.fixed) return;
      if (tiedNames.includes(m.t1) && tiedNames.includes(m.t2)) {
        miniStats[m.t1].gw += m.s1; miniStats[m.t1].gl += m.s2;
        miniStats[m.t2].gw += m.s2; miniStats[m.t2].gl += m.s1;
        if (m.s1 > m.s2) miniStats[m.t1].mw++;
        else if (m.s2 > m.s1) miniStats[m.t2].mw++;
      }
    });
    
    bucket.sort((a, b) => {
      let statsA = miniStats[a.n]; let statsB = miniStats[b.n];
      if (statsB.mw !== statsA.mw) return statsB.mw - statsA.mw;
      let miniGdA = statsA.gw - statsA.gl; let miniGdB = statsB.gw - statsB.gl;
      if (miniGdB !== miniGdA) return miniGdB - miniGdA;
      let gwrA = (a.gw + a.gl) > 0 ? a.gw / (a.gw + a.gl) : 0;
      let gwrB = (b.gw + b.gl) > 0 ? b.gw / (b.gw + b.gl) : 0;
      if (gwrB !== gwrA) return gwrB - gwrA;
      return a.n.localeCompare(b.n);
    });
    finalStandings.push(...bucket);
  });
  return finalStandings;
}

// --- MATCH DISPLAY HELPER ---
export function getDisplayMatches(currentState, focusTeam, filter, currentList, curWeek) {
  // ... (Salin seluruh isi fungsi getDisplayMatches dari kode asli di sini) ...
}

// --- MONTE CARLO SIMULATION ENGINE ---
export const runSimulation = (currentState, setProbs, getStateSeed, mulberry32) => {
  // ... (Salin seluruh isi fungsi runSimulation dari kode asli di sini) ...
  // Catatan: Pastikan fungsi helper getStateSeed dan mulberry32 juga dipindahkan ke utils.js atau didefinisikan di atas fungsi ini.
};
