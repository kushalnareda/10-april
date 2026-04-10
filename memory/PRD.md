# Taara & Cookie's Day Out — PRD & Project Status

## Problem Statement
Build a mobile web app that lets one partner plan a multi-stop surprise date, reveal each stop progressively via a password-gated drumroll, and collaboratively log photos, ratings, and memories in real time — culminating in a shareable PDF storybook of the entire date.

## Architecture

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB (Motor async driver)
- **Auth**: Emergent Google OAuth (exchange session_id → session_token)

### Frontend
- **Framework**: Expo React Native (expo-router, web+native)
- **Theme**: White + Barbie Pink (#FF1493)
- **Navigation**: Stack-based with route groups

## What's Been Implemented (April 2026)

### Backend APIs
- `POST /api/auth/session` — exchange Google OAuth session_id for session_token
- `GET /api/auth/me` — verify session, return user
- `POST /api/auth/logout` — end session
- `POST /api/sessions` — create date session with stops
- `GET /api/sessions` — list user's sessions with progress
- `GET /api/sessions/{id}` — get full session with stops
- `POST /api/stops/{id}/unlock` — verify password, mark unlocked
- `PATCH /api/stops/{id}` — update done/rating/comment/photos
- `POST /api/stops/{id}/detour` — create/update detour
- `POST /api/photos/upload` — upload base64 photo
- `GET /api/photos/{id}` — serve photo as binary
- `DELETE /api/photos/{id}` — delete photo

### Frontend Screens
1. **Welcome** (`/`) — pink gradient hero with "Let's go" CTA
2. **Login** (`/login`) — Google Sign-In screen
3. **Planner Dashboard** (`/planner`) — session list with progress bars
4. **Create Session** (`/planner/create`) — multi-stop form with emoji picker
5. **Stages List** (`/stages/[session_id]`) — progressive stop reveal
6. **Drumroll** (`/drumroll/[stop_id]`) — animated emoji + password gate
7. **Stop Detail** (`/stop/[stop_id]`) — photos, star rating, comment, detour
8. **Finale** (`/finale/[session_id]`) — confetti celebration
9. **Storybook** (`/storybook/[session_id]`) — beautiful scrollable book + PDF

## Test Data
- User: taara@demo.com (session_token: test_session_demo_taara_cookie)
- Session ID: sess_5704d6ebc25c4924
- 4 stops with passwords: tekken, ramen, pokemon, masala

## Prioritized Backlog

### P0 (Core — Done ✅)
- Progressive stop reveal with password gate
- State persistence across sessions
- Photo upload per stop
- In-app storybook view + PDF download
- Auth (Google OAuth)

### P1 (Next)
- Per-stop star rating & comment (implemented, needs testing)
- Detour logging (implemented, needs testing)
- State sync verified on device switch

### P2 (Future)
- Shareable storybook link
- Push notifications for next stop
- Edit stop password after creation
- Multiple sessions shared between planner/partner
- Custom storybook themes

## Next Tasks
1. Run full testing cycle with testing agent
2. Fix any issues found in testing
3. Add more polish to storybook PDF (cover page art)
4. Add shareable link feature (P2)
