# MPL Draft Predictor & Simulator

A React-based web application for simulating and predicting Mobile Legends: Bang Bang Professional League (MPL) draft phases. This app allows users to simulate team drafts, track match history, view schedules, and analyze team performance.

## Features

- **Draft Simulation**: Simulate the draft phase for MPL matches with hero selection based on roles
- **Match History**: View historical match results with scores and winners
- **Schedule Viewer**: Browse upcoming matches organized by week
- **Team Standings**: Track team performance across the season
- **Firebase Integration**: Real-time data synchronization with Firebase Firestore
- **Custom Spreadsheet API**: Fetch additional data from Google Sheets API
- **Responsive UI**: Built with Tailwind CSS for a modern, responsive design

## Teams Included

- ONIC
- Bigetron Vitality (BTR)
- EVOS
- Dewa United Esports (DEWA)
- Team Liquid ID (TLID)
- Alter Ego (AE)
- Geek Fam ID (GEEK)
- Natus Vincere (NAVI)
- RRQ Hoshi (RRQ)

## Hero Roles

Heroes are categorized into 5 roles:
- **EXP Lane**: Fighters and tanks for the experience lane
- **Jungle**: Assassins and junglers
- **Mid Lane**: Mages and mid-lane specialists
- **Gold Lane**: Marksmen and gold laners
- **Roam**: Supports and roam heroes

## Maps

- Broken Walls
- Dangerous Grass
- Expanding Rivers
- Flying Cloud

## Tech Stack

- **React**: Frontend framework with hooks (useState, useEffect, useMemo, useCallback, useRef)
- **Firebase**: Backend services
  - Firebase Authentication (Anonymous sign-in)
  - Firestore Database (Real-time data sync)
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Google Sheets API**: External data source for match information

## Project Structure

```
/workspace
├── Qwen_jsx_20260503_yr2n0mmwi.jsx  # Main React component (~1757 lines)
├── README.md                         # This file
└── .gitignore                        # Git ignore rules
```

## Setup & Installation

### Prerequisites

- Node.js (v14 or higher recommended)
- npm or yarn package manager

### Installation Steps

1. **Create a new React project** (if starting fresh):
   ```bash
   npx create-react-app mpl-draft-predictor
   cd mpl-draft-predictor
   ```

2. **Install dependencies**:
   ```bash
   npm install firebase
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```

3. **Configure Tailwind CSS**:
   Update your `tailwind.config.js` to include the content paths:
   ```js
   module.exports = {
     content: ["./src/**/*.{js,jsx,ts,tsx}"],
     theme: { extend: {} },
     plugins: [],
   }
   ```

4. **Add Tailwind directives** to your `src/index.css`:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

5. **Copy the main component**:
   Copy the contents of `Qwen_jsx_20260503_yr2n0mmwi.jsx` into your `src/App.jsx` or create a new component file.

6. **Start the development server**:
   ```bash
   npm start
   ```

## Firebase Configuration

The app uses the following Firebase configuration (already embedded in the code):

```javascript
{
  apiKey: "AIzaSyC6sj2eCAbg-IZTUYHxbSzEnAnUfba_gQ4",
  authDomain: "mpl-predictor-1ec.firebaseapp.com",
  projectId: "mpl-predictor-1ec",
  storageBucket: "mpl-predictor-1ec.firebasestorage.app",
  messagingSenderId: "224310331537",
  appId: "1:224310331537:web:4a5de42403b753b326d730"
}
```

**Note**: For production use, you should configure your own Firebase project and update the configuration accordingly.

## External APIs

### Google Sheets API

The app fetches data from a Google Apps Script web app:
```
https://script.google.com/macros/s/AKfycbxczfPr7NShN7B8Tw1PPMOLFpLtF-SJ7XWIwOFLhmd3nlO6GqaPEcYTY2Iza4Aq5hWC/exec
```

## Usage

1. **Authentication**: The app uses anonymous Firebase authentication automatically
2. **Draft Phase**: Select teams and simulate the draft process
3. **View History**: Browse past match results with detailed scores
4. **Check Schedule**: View upcoming matches organized by week
5. **Track Standings**: Monitor team rankings and performance

## Customization

- **Team Logos**: Custom logos are loaded from Imgur with fallback support
- **Hero Images**: Hero icons are loaded from a CDN repository
- **Color Schemes**: Each team has a custom color scheme for branding

## License

This project is provided as-is for educational and demonstration purposes.

## Disclaimer

This application is a fan-made project and is not affiliated with Moonton, MPL, or any official Mobile Legends: Bang Bang entities. All team names, logos, and hero assets are property of their respective owners.

