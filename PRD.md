# Buzzer Battle - Product Requirements Document (PRD)

---

## 1. Introduction & Overview

- **Project:** Buzzer Battle - Real-Time Interactive Quiz Game Platform
- **Purpose:** A digital buzzer-based quiz game system designed for corporate team-building events, enabling live competition between teams with real-time buzzer mechanics, admin-controlled game flow, and audience presentation capabilities.
- **Outcome:** An engaging, scalable, and mobile-first quiz platform that replaces physical buzzer hardware with a seamless digital experience, allowing event organizers to host professional-grade quiz competitions.

---

## 2. Business Opportunity & Problem Statement

### The Challenge
Traditional corporate quiz events rely on expensive physical buzzer hardware, require complex setup, and lack modern engagement features. Event organizers need a digital solution that:
- Works on any device (no special hardware required)
- Provides real-time responsiveness for competitive buzzer mechanics
- Offers professional presentation views for large audiences
- Enables easy administration and scoring

### Key Pain Points Solved
| Pain Point | Buzzer Battle Solution |
|------------|----------------------|
| **Hardware Dependency** | Zero hardware required - any smartphone becomes a buzzer |
| **Complex Setup** | Session-based system with simple QR code/link joining |
| **Slow Response Time** | Sub-100ms buzzer registration via WebSocket |
| **Manual Scoring** | Automated leaderboard with real-time updates |
| **Audience Engagement** | Dedicated Presenter View for big-screen display |
| **Limited Scalability** | Supports up to 1000 concurrent users |

---

## 3. Target Audience

| User Type | Description |
|-----------|-------------|
| **Primary: Event Organizers** | Corporate HR teams, event management companies hosting team-building activities |
| **Secondary: Quiz Masters** | Administrators who control the game flow during live events |
| **End Users: Participants** | Corporate employees participating in team quiz competitions |
| **Viewers: Audience** | Spectators watching the competition on projection screens |

---

## 4. Goals & Objectives

| Objective | Success Criteria |
|-----------|------------------|
| **Real-Time Competition** | Buzzer press registration within 100ms accuracy |
| **Seamless User Experience** | Mobile-first design with intuitive controls |
| **Professional Presentation** | Cinematic presenter view suitable for large venues |
| **Admin Control** | Complete game flow control without technical expertise |
| **Scalability** | Support 1000+ concurrent users per session |
| **Reliability** | 99.9% uptime during live events |

---

## 5. Product Features & Functionality

### 5.1 Team/Player Features

| Feature | Description |
|---------|-------------|
| **Quick Join** | Join game via session link, select team number, enter team name |
| **Digital Buzzer** | Large, responsive buzzer button with haptic-like visual feedback |
| **Buzzer Leaderboard** | Real-time ranking by buzzer press speed (own time visible only) |
| **Question Display** | View questions with text, images, and video support |
| **Answer Feedback** | Instant "Nailed It!" or "Close Call" feedback from admin decisions |
| **Score Tracking** | Live leaderboard with team rankings and scores |
| **Auto-Navigation** | Automatic screen transitions based on game state |

### 5.2 Admin Features

| Feature | Description |
|---------|-------------|
| **Secure Login** | Password-protected admin access per session |
| **Game Dashboard** | Overview of teams, scores, and game statistics |
| **Remote Control** | Mobile-friendly interface to control game flow |
| **Buzzer Statistics** | Real-time view of which teams pressed and their times |
| **Manual Scoring** | Mark verbal answers as correct/wrong |
| **Pass to 2nd Team** | Award second-fastest team a chance to answer |
| **Team Management** | Edit team names and scores mid-game |
| **Presenter View** | Full-screen audience display with buzzer queue and leaderboard |

### 5.3 Presenter View Features

| Feature | Description |
|---------|-------------|
| **Split-Screen Layout** | 70% game view, 30% leaderboard/buzzer queue |
| **Cinematic Question Display** | Large typography with image/video support |
| **Dynamic Buzzer Queue** | Shows teams ranked by buzzer speed with timestamps |
| **Live Leaderboard** | Podium-style display of top teams |
| **Audio Support** | Sound effects for buzzer press and state changes |

---

## 6. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE                                │
│                   (CDN + Edge Deployment)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│    Client     │     │    Client     │     │    Client     │
│  (React SPA)  │     │   (Admin)     │     │  (Presenter)  │
└───────────────┘     └───────────────┘     └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   WebSocket +     │
                    │   REST API        │
                    │   (Node.js)       │
                    └─────────┬─────────┘
                              │
                    ┌─────────┴─────────┐
                    │     MongoDB       │
                    │    (Database)     │
                    └───────────────────┘
```

---

## 7. Use Cases & User Flows

### 7.1 Team Participant Journey

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Receive   │───▶│  Open Link  │───▶│ Enter Team  │───▶│   Select    │
│  Game Link  │    │  on Phone   │    │    Name     │    │ Team Number │
└─────────────┘    └─────────────┘    └─────────────┘    └──────┬──────┘
                                                                 │
       ┌─────────────────────────────────────────────────────────┘
       ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Wait in   │───▶│ See Question│───▶│    Press    │───▶│ View Buzzer │
│   Lobby     │    │   Appear    │    │   Buzzer    │    │ Leaderboard │
└─────────────┘    └─────────────┘    └─────────────┘    └──────┬──────┘
                                                                 │
       ┌─────────────────────────────────────────────────────────┘
       ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  If Picked: │───▶│Answer Aloud │───▶│See Feedback │───▶│    View     │
│ See Question│    │ (Verbally)  │    │(Correct/Not)│    │ Leaderboard │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### 7.2 Admin/Quiz Master Journey

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Access Admin│───▶│   Login to  │───▶│   Review    │───▶│    Open     │
│    Link     │    │   Session   │    │  Dashboard  │    │Remote Ctrl  │
└─────────────┘    └─────────────┘    └─────────────┘    └──────┬──────┘
                                                                 │
       ┌─────────────────────────────────────────────────────────┘
       ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    Click    │───▶│Monitor Buzzer│──▶│   Select    │───▶│   Wait for  │
│"Next Question│    │   Stats     │    │ Top Team    │    │Verbal Answer│
└─────────────┘    └─────────────┘    └─────────────┘    └──────┬──────┘
                                                                 │
       ┌─────────────────────────────────────────────────────────┘
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DECISION POINT                               │
├─────────────────────────┬─────────────────────┬─────────────────────┤
│    ✅ Mark Correct      │    ❌ Mark Wrong     │     ➡️ Pass to      │
│   (+Points, Next Q)     │   (No Points)        │     2nd Team       │
└─────────────────────────┴─────────────────────┴─────────────────────┘
```

---

## 8. Technical Specifications

### 8.1 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 + TypeScript | Component-based UI development |
| **Build Tool** | Vite | Fast development and optimized builds |
| **State Management** | Redux Toolkit + RTK Query | Centralized state and API caching |
| **UI Framework** | Material UI (MUI) | Consistent, responsive components |
| **Backend** | Node.js + Express | REST API and WebSocket server |
| **Real-Time** | Socket.IO | Bi-directional WebSocket communication |
| **Database** | MongoDB + Mongoose | Document-based data storage |
| **Hosting** | Cloudflare | CDN, edge deployment, DDoS protection |

### 8.2 Data Models

| Model | Key Fields | Purpose |
|-------|------------|---------|
| **Session** | sessionName, numberOfTeams, questions[], status | Game configuration |
| **Team** | teamNumber, teamName, teamScore, session | Participant data |
| **GameState** | gameStatus, currentQuestionIndex, currentAnsweringTeam | Live game tracking |
| **BuzzerQueue** | teamId, questionId, timestamp (bigint) | Buzzer press records |
| **Question** | questionText, options[], correctAnswer, score | Quiz content |

### 8.3 API Endpoints Summary

| Category | Endpoints |
|----------|-----------|
| **Session** | GET /session, GET /session/teams/:id |
| **Team** | POST /teams, GET /teams/me, GET /teams/leaderboard |
| **Game State** | GET/POST game-state (pause, resume, next-question, mark-answer) |
| **Buzzer** | GET /buzzer/leaderboard, GET /buzzer/stats |
| **Admin** | POST /admin/login, GET /admin/dashboard, PUT /admin/teams/:id |

### 8.4 WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `press-buzzer` | Client → Server | Team presses buzzer |
| `BUZZER_PRESSED` | Server → All | Broadcast buzzer press |
| `GAME_STATE_CHANGED` | Server → All | Game status update |
| `ANSWER_MARKED_CORRECT` | Server → All | Admin marked correct |
| `ANSWER_MARKED_WRONG` | Server → All | Admin marked wrong |

---

## 9. Non-Functional Requirements

| Requirement | Specification |
|-------------|---------------|
| **Performance** | < 100ms buzzer registration latency |
| **Scalability** | 1000+ concurrent users per session |
| **Availability** | 99.9% uptime during live events |
| **Load Time** | < 2 seconds initial page load |
| **Mobile Support** | Fully responsive, touch-optimized |
| **Security** | HTTPS encryption, session-based auth |
| **Browser Support** | Chrome, Safari, Firefox, Edge (latest 2 versions) |

---

## 10. Design & UX Requirements

### 10.1 Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Mobile-First** | Optimized for smartphone usage (participants) |
| **Instant Feedback** | Visual confirmation on every action |
| **Minimal Distraction** | Clean UI during active gameplay |
| **Large Touch Targets** | Buzzer button is prominent and easy to press |
| **Real-Time Updates** | No manual refresh required |

### 10.2 Color Themes

| Interface | Primary Color | Secondary Color |
|-----------|---------------|-----------------|
| **User (Game)** | Blue (#2196F3) | White |
| **Admin** | Dark Navy | Gold Accents |
| **Presenter** | Black background | White/Golden text |

---

## 11. Key Deliverables (Complete)

| Deliverable | Status |
|-------------|--------|
| ✅ User Mobile App (Web) | Complete |
| ✅ Admin Dashboard | Complete |
| ✅ Remote Control Interface | Complete |
| ✅ Presenter View | Complete |
| ✅ Real-Time WebSocket Engine | Complete |
| ✅ MongoDB Data Layer | Complete |
| ✅ Session Management | Complete |
| ✅ Buzzer Queue System | Complete |
| ✅ Leaderboard System | Complete |

---

## 12. Success Metrics & KPIs

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Buzzer Accuracy** | < 100ms variance | Timestamp comparison |
| **User Experience** | Zero page refreshes during game | Analytics tracking |
| **Concurrent Users** | 1000+ without degradation | Load testing |
| **Admin Satisfaction** | Intuitive controls | User feedback |
| **Event Success Rate** | 100% games completed | Session completion logs |

---

## 13. Deployment & Infrastructure

| Component | Specification |
|-----------|---------------|
| **CDN** | Cloudflare (global edge caching) |
| **Frontend Hosting** | Cloudflare Pages or Vercel |
| **Backend Hosting** | Cloud Run / EC2 / Railway |
| **Database** | MongoDB Atlas (cloud managed) |
| **SSL** | Cloudflare SSL (automatic) |
| **DDoS Protection** | Cloudflare (included) |

---

## 14. Future Scope (Out of Current Scope)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Multiple Session Types** | Support for different game formats (trivia, pictionary) | Medium |
| **Custom Branding** | White-label solution with client logos | Medium |
| **Analytics Dashboard** | Post-event reports and insights | Low |
| **Offline Mode** | Fallback for poor connectivity | Low |
| **Native Mobile Apps** | iOS/Android apps for better performance | Low |

---

## 15. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Network Latency** | Unfair buzzer timing | Use timestamp from client, validate server-side |
| **Server Overload** | Game freezes | Horizontal scaling, connection pooling |
| **Browser Compatibility** | Features not working | Progressive enhancement, fallbacks |
| **Accidental Buzzer Press** | Wrong team selected | Visual confirmation before admin action |
| **Mobile Battery Drain** | Devices dying mid-game | Optimized WebSocket keep-alive intervals |

---

## 16. Project Structure

```
Buzzer-Battel/
├── client/                     # React Frontend
│   ├── src/
│   │   ├── features/
│   │   │   ├── admin/          # Admin pages & components
│   │   │   ├── game/           # Player game screens
│   │   │   ├── question/       # Question display components
│   │   │   └── session/        # Session management
│   │   ├── services/
│   │   │   └── websocket/      # Socket.IO client
│   │   └── app/                # Redux store
│   └── package.json
│
└── server/                     # Node.js Backend
    ├── src/
    │   ├── modules/
    │   │   ├── admin/          # Admin authentication
    │   │   ├── buzzerQueue/    # Buzzer mechanics
    │   │   ├── gameState/      # Game state machine
    │   │   ├── questions/      # Question management
    │   │   ├── session/        # Session CRUD
    │   │   └── teams/          # Team management
    │   └── services/
    │       └── socket/         # Socket.IO server
    └── package.json
```

---

## 17. Appendix

### A. Game State Machine

| State | Description | Transitions |
|-------|-------------|-------------|
| **PAUSED** | Game not active | → BUZZER_ROUND (Next Question) |
| **BUZZER_ROUND** | Teams can press buzzer | → ANSWERING (Admin Selects) |
| **ANSWERING** | Team answering verbally | → IDLE (Answer Marked) |
| **IDLE** | Between questions | → BUZZER_ROUND (Next Question) |

### B. Session URL Structure

| Interface | URL Pattern |
|-----------|-------------|
| **Player Join** | `/game/:sessionId/` |
| **Admin Login** | `/admin/:sessionId/login` |
| **Admin Dashboard** | `/admin/:sessionId/dashboard` |
| **Remote Control** | `/admin/:sessionId/remote-control` |
| **Presenter View** | `/admin/:sessionId/presenter` |

---

*Document Version: 1.0*  
*Last Updated: January 27, 2026*  
*Internal Team Documentation - PepBox*
