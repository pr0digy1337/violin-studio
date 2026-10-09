 <div align="center">

# 🎻 Sur Sadhana — Violin Studio

### Find your sur. Refine your sound. Feel the rhythm.

A personal practice space for violinists and Indian classical music learners — bringing pitch detection, swara practice, rhythm training, and tanpura drone into one focused studio.

<p>
  <a href="https://github.com/pr0digy1337/violin-studio/actions">
    <img src="https://img.shields.io/github/actions/workflow/status/pr0digy1337/violin-studio/ci.yml?branch=main&style=for-the-badge&logo=githubactions&logoColor=white&label=Build" alt="Build status" />
  </a>
  <a href="https://github.com/pr0digy1337/violin-studio">
    <img src="https://img.shields.io/github/last-commit/pr0digy1337/violin-studio?style=for-the-badge&logo=git&logoColor=white" alt="Last commit" />
  </a>
  <a href="https://github.com/pr0digy1337/violin-studio/issues">
    <img src="https://img.shields.io/github/issues/pr0digy1337/violin-studio?style=for-the-badge&logo=github" alt="Open issues" />
  </a>
  <a href="https://github.com/pr0digy1337/violin-studio/stargazers">
    <img src="https://img.shields.io/github/stars/pr0digy1337/violin-studio?style=for-the-badge&logo=github" alt="GitHub stars" />
  </a>
</p>

<p>
  <img src="https://img.shields.io/badge/React-UI-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Vite-Dev%20Server-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/Web%20Audio-API-DB4437?style=for-the-badge" alt="Web Audio API" />
</p>

</div>

---

## ✨ About the project

**Sur Sadhana — Violin Studio** is a browser-based music practice app designed to make everyday practice more interactive and organized. It combines a live microphone-based tuner with swara references, customizable Alankar sequences, a taal metronome, a digital tanpura drone, and practice recordings.

> 🎶 **Practise with focus. Find your sur. Stay in rhythm.**

## 🎼 Features

| Feature | Description |
|---|---|
| 🎯 **Swara Tuner** | Detects incoming pitch through your microphone and displays the detected frequency, western note, Indian swara, and cents deviation. |
| 〰️ **Live Pitch Visualization** | Displays a live waveform and pitch-deviation graph to help you understand pitch stability. |
| 🎵 **Alankar Practice** | Practise swara sequences and adjust note-hold duration for your exercises. |
| 🥁 **Taal & Laya** | Use a metronome with selectable beat cycles and adjustable tempo in BPM. |
| 🪕 **Digital Tanpura** | Generate a continuous reference drone based on your selected Sa and tuning layout. |
| ⏺️ **Practice Recordings** | Record and replay practice takes in the browser. |

## 🖥️ Preview

Add a screenshot of your app to make the repository landing page more engaging.

1. Create a folder named `screenshots` in the project root.
2. Save a screenshot as `screenshots/studio.png`.
3. Add this Markdown to display it:

```html
<p align="center">
  <img src="screenshots/studio.png" alt="Sur Sadhana app preview" width="900">
</p>
```

## 🧰 Built with

- **React** — interactive user interface
- **Vite** — development server and build tooling
- **JavaScript** — application logic
- **Web Audio API** — microphone input, pitch analysis, and generated drone audio
- **HTML Canvas** — real-time waveform and pitch graph rendering
- **CSS** — responsive layout and visual theme
- **Browser Media APIs** — microphone access and audio recording

## 🚀 Getting started

### Prerequisites

Install [Node.js](https://nodejs.org/) and npm, which is included with Node.js.

### 1. Clone the repository

```bash
git clone https://github.com/pr0digy1337/violin-studio.git
cd violin-studio
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

Open the local URL printed in your terminal, usually `http://localhost:5173`.

### 4. Build for production

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## 🎻 How to use

1. **Choose your Shruti (Sa):** Select the root note.
2. **Enable the microphone:** Click the microphone control and approve the browser permission prompt.
3. **Tune and observe:** Play a sustained note and observe the detected swara, frequency, cents deviation, and pitch visualization.
4. **Practise Alankars:** Enter a swara sequence and adjust the hold duration.
5. **Keep taal:** Select a beat cycle, set the BPM, and start the metronome.
6. **Use the tanpura:** Start the digital drone as a reference while practising.
7. **Review a take:** Record and replay a practice session.

## 🎙️ Microphone and browser notes

- Microphone access generally requires `localhost` or a secure HTTPS connection.
- If the tuner does not respond, check browser permissions and reduce background noise.
- Room acoustics, instrument harmonics, and unstable notes can affect pitch detection.
- Use the pitch display as a practice aid alongside careful listening.
- Browser recordings are not automatically uploaded to a server and may not persist after a reload.

## 📁 Project structure

A typical Vite + React project looks like this. Adjust the paths to match your actual files.

```text
violin-studio/
├── public/
├── src/
│   ├── App.jsx
│   ├── styles.css
│   └── main.jsx
├── index.html
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

## 🗺️ Roadmap

- [ ] Automatically advance to the next Alankar swara.
- [ ] Add configurable in-tune tolerance and clearer sharp/flat feedback.
- [ ] Save practice history and track progress.
- [ ] Add more taal patterns and traditional bols.
- [ ] Build a raga reference library with Aroha and Avaroha.
- [ ] Add named recordings and export controls.
- [ ] Add saved tuning profiles and keyboard shortcuts.

## 🤝 Contributing

Ideas, bug reports, and improvements are welcome.

1. Fork the repository.
2. Create a feature branch:

   ```bash
   git checkout -b feat/your-feature
   ```

3. Commit your changes:

   ```bash
   git add .
   git commit -m "Add: describe your change"
   ```

4. Push your branch and open a pull request.

## 🔒 Privacy

The app's current core practice features use browser audio capabilities. Review future integrations before adding network uploads or analytics.

## 📜 License

No license has been specified yet. If you intend to make this project open source, add a `LICENSE` file and update this section with your chosen license.

---

<div align="center">

**Made for the love of music. 🎶**

*Sur Sadhana — a little more focus in every practice session.*

</div>