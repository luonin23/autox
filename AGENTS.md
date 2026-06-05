<claude-mem-context>
# Memory Context

# [fold7-agent] recent context, 2026-06-05 3:57pm GMT+8

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 5 obs (1,695t read) | 58,154t work | 97% savings

### Jun 5, 2026
274 8:44a ⚖️ AutoX.js app architecture shifting from script-centric to AI-dialogue-centric framework
275 9:03a 🟣 AutoX.js APP Framework with AI Chat Integration
276 2:55p ✅ User greeted the system
277 2:59p 🔵 fold7-native is an Android accessibility service project
278 3:00p 🔵 fold7-native core architecture classes identified

Access 58k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>

# Fold7 Agent working rules

1. Every code change must finish with the 4-step closeout: review, impact-scope test, emulator cleanup/push, and GitHub commit/push.
2. UI and runtime changes must be verified on the emulator and available USB device with real logs, screenshots, and the actual app flow.
3. The current product is a standalone native APK under `fold7-native`; do not rebuild AutoX scripts or the old launcher shell.
4. Runtime logs are part of the deliverable. If a model or script fails, inspect logs first and fix the root cause before claiming completion.
5. Model configuration, confirmation-first chat, action-plan generation, coordinate calibration, execution, retry, and logs belong inside the native app shell.
6. Generated automation output should be native action JSON, not AutoX JavaScript.
