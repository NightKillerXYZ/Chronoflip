# ChronoFlip

![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/react-19.2.4-61DAFB.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.0-3178C6.svg)

**ChronoFlip** is a high-aesthetic, production-grade time management application designed for focus and productivity. It features a retro-modern flip clock, persistent alarms, focus timers, and a daily schedule manager, all wrapped in a sleek, dark-themed UI.

![Screenshot Placeholder](https://via.placeholder.com/800x450?text=ChronoFlip+Dashboard)

## Features

*   **🕰️ Retro Flip Clock**: A beautifully animated flip clock with a distraction-free "Zen Mode" (Fullscreen).
*   **⏰ Smart Alarms**: Persistent alarms with duplicate prevention, snoozing, and custom sound support.
*   **⏳ Focus Timers**: Multiple concurrent timers with background accuracy (resilient to tab throttling).
*   **📅 Daily Timetable**: Editable schedule with local storage persistence and file import (JSON/TXT/CSV).
*   **🎨 Dynamic Themes**: Toggle between a professional Dark Mode (OLED friendly) and a clean Light Mode.
*   **🔊 Audio Engine**: Built-in Web Audio API synthesizers and support for custom audio file uploads.
*   **♿ Accessible**: Fully keyboard navigable with ARIA labels and focus management.

## Tech Stack

*   **Frontend**: React 19, TypeScript
*   **Styling**: Tailwind CSS (Dark mode first)
*   **Icons**: Lucide React
*   **State Management**: React Hooks + LocalStorage (with cross-tab sync)
*   **Audio**: Web Audio API (No external sound assets required)

## Getting Started

### Prerequisites

*   Node.js (v18+)
*   npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/chronoflip.git
    cd chronoflip
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run the development server:
    ```bash
    npm run dev
    ```

4.  Open [http://localhost:5173](http://localhost:5173) in your browser.

## Reliability & Performance

ChronoFlip is engineered for reliability:
*   **Background Throttling**: Timers use absolute timestamps (`endTime`) to remain accurate even when the browser tab is inactive or throttled.
*   **Memory Management**: Audio nodes are strictly managed and garbage collected to prevent leaks.
*   **Edge Case Handling**: Alarms are de-bounced to prevent duplicate triggers within the same minute.

## Screenshots

| Clock View | Alarm Manager |
|:---:|:---:|
| ![Clock](https://via.placeholder.com/400x250?text=Flip+Clock) | ![Alarm](https://via.placeholder.com/400x250?text=Alarm+Settings) |

| Focus Timer | Timetable |
|:---:|:---:|
| ![Timer](https://via.placeholder.com/400x250?text=Focus+Timer) | ![Timetable](https://via.placeholder.com/400x250?text=Schedule) |

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with precision by Shorya Goyal.
