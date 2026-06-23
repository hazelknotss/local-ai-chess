# 🎮 Retro 8-Bit Chess RPG – Local PC Deployment Instructions

Deploy and run your Retro 8-Bit Chess RPG application locally on your computer with this step-by-step setup guide. 

This game includes an **interactive 8-bit Retro sound synthesiser (Synth)**, **RPG Wizard Mana and Spellcasting Mechanics**, and supports an AI engine integrated with **LM Studio** operating directly on your local machine!

---

## 📋 Prerequisites

Before starting, make sure you have the following installed on your machine:
* **Node.js** (v18.0.0 or higher is recommended)
* **npm** (comes bundled with Node.js)
* **LM Studio** (optional, only required if you want to run the Gemma/quantum local AI opponent offline)

---

## ⚡ First-Time Installation & Setup

### 1. Extract or Clone Project Files
Unpack your project ZIP file or clone the repository to your chosen local directory:
```bash
cd chess-8bit-rpg
```

### 2. Install Project Dependencies
Run the installation command in your terminal folder to configure all Vite, React, and Lucide package environments:
```bash
npm install
```

### 3. Add Local Configuration
Duplicate the provided environment configuration template structure to customize your variables:
```bash
cp .env.example .env
```

---

## 🧠 Optional: Local AI Integration (LM Studio)

If you want the chess game to employ local intelligent board moves using state-of-the-art Large Language Models running on your processor:

1. **Download LM Studio** from [lmstudio.ai](https://lmstudio.ai/) and launch it.
2. Search and download a compact instruction-following model such as **`gemma-2-2b-it`** or other tiny/medium quantized GGUFs.
3. Head to the **Local Server** tab (the double-headed arrow symbol on the left toolbar).
4. Select your downloaded model from the dropdown list and start the server (default port binds to `1234` rendering your API baseline at `http://localhost:1234/v1`).
5. In the game screen on your browser, click **COGNITIVE ENGINE SETTINGS** (the retro monitor panel/gear icon), and ensure your connection is set to **BROWSER DIRECT** (which directs the browser to communicate directly with your localhost port without intermediate container proxies).

---

## 🚀 Running the App

### 🛠️ Developer Server (With Hot Reloading)
To run a reactive server environment that live-rebuilds when code modifications are detected:
```bash
npm run dev
```
Once booted, open your browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

### 📦 Production Build & Run (Best Performance)
To bundle the application assets securely into highly-optimized static outputs and run the self-contained Express server:

1. **Compile and Bundle Assets:**
   ```bash
   npm run build
   ```
2. **Launch the Server:**
   ```bash
   npm run start
   ```
3. Open your browser and navigate to:
   👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🪄 Magic Spell Mechanics Rulesheet (Reference)

Your local deploy comes loaded with several interactive retro wizardry capabilities! Gain **MP (Mana Points)** by completing standard board movements (+15 MP) or tactical captures (+35 MP), and cast these spells directly on the matrix:

* **⚡ Lightning Strike (35 MP):** Obliterates any selected active enemy piece. Hand turn back to Black.
* **❄️ Frost Nova (25 MP):** Freeze any selected enemy piece for 2 full AI turns. The AI is prevented from selecting or making moves with this frozen square.
* **🧪 Alchemical Mutation (40 MP):** Transmute any friendly Pawn into a dangerous Knight.
* **🔄 Time-Warp Chrono Shift (30 MP):** Shift back the space-time continuum! Performs a double-undo reverting previous actions.
