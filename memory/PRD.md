# Taara & Cookie's Day Out — PRD & Project Status

## Problem Statement
Build a mobile web app that lets one partner plan a multi-stop surprise date, reveal each stop progressively via a password-gated drumroll, and collaboratively log photos, ratings, and memories in real time — culminating in a shareable PDF storybook of the entire date.

## Architecture

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB (Motor async driver)
- **Auth**: Emergent Google OAuth (exchange session_id → session_token)
- **Photo Storage**: Base64 in MongoDB (separate photos collection)

### Frontend
- **Framework**: Expo React Native (expo-router, mobile web)
- **Theme**: White + Barbie Pink (#FF1493), gradient backgrounds
- **Navigation**: Stack-based with route groups
- **PDF**: expo-print (HTML template → browser print dialog)

## What's Been Implemented (April 2026)

### Backend APIs (server.py)
- `POST /api/auth/session` — exchange Google OAuth session_id for session_token
- `GET /api/auth/me` — verify session, return user
- `POST /api/auth/logout` — end session
- `POST /api/sessions` — create date session with stops
- `GET /api/sessions` — list user's sessions with progress
- `GET /api/sessions/{id}` — get full session with stops
- `POST /api/stops/{id}/unlock` — verify password (bcrypt), mark unlocked
- `PATCH /api/stops/{id}` — update done/rating/comment/photos
- `POST /api/stops/{id}/detour` — create/update detour
- `POST /api/photos/upload` — upload base64 photo
- `GET /api/photos/{id}` — serve photo as binary
- `DELETE /api/photos/{id}` — delete photo

### Frontend Screens
1. **Welcome** (`/`) — pink gradient hero, "Let's go" CTA, handles OAuth callback
2. **Login** (`/login`) — Google Sign-In via Emergent Auth
3. **Protected Layout** (`/(app)/_layout.tsx`) — auth guard
4. **Planner Dashboard** (`/planner`) — session list with progress bars
5. **Create Session** (`/planner/create`) — multi-stop form with emoji picker
6. **Stages List** (`/stages/[session_id]`) — progressive stop reveal with status
7. **Drumroll** (`/drumroll/[stop_id]`) — bouncing emoji animation + password gate
8. **Stop Detail** (`/stop/[stop_id]`) — photos upload, 5-star rating, comment, detour
9. **Finale** (`/finale/[session_id]`) — confetti celebration
10. **Storybook** (`/storybook/[session_id]`) — scrollable book + PDF download

## Test Data
- User: taara@demo.com (session_token: test_session_demo_taara_cookie)
- Session: sess_5704d6ebc25c4924 "Taara & Cookie's Day Out"
- 4 stops with passwords: tekken, ramen, pokemon, masala

## Prioritized Backlog

### P0 (Done ✅)
- Progressive stop reveal with password gate
- State persistence across sessions  
- Photo upload per stop
- In-app storybook view + PDF download
- Auth (Google OAuth)
- Planner setup flow

### P1 (Next)
- Edit stop passwords after creation
- Detour photos in PDF
- Edit stop rating/comment after marking done

### P2 (Future)
- Shareable storybook link
- Push notifications for next stop
- Multiple partner accounts on same session
- Custom storybook cover art
- Export to social/WhatsApp

## Next Tasks
1. Polish PDF storybook template further
2. Add shareable link feature (P2)
3. Test with real Google accounts
