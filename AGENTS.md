<claude-mem-context>
# Memory Context

# [fold7-agent] recent context, 2026-06-05 9:03am GMT+8

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 1 obs (614t read) | 11,481t work | 95% savings

### Jun 5, 2026
274 8:44a ⚖️ AutoX.js app architecture shifting from script-centric to AI-dialogue-centric framework

Access 11k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>

# Fold7 Agent working rules

1. Every code change must finish with the 4-step closeout: review, impact-scope test, emulator cleanup/push, and GitHub commit/push.
2. UI and runtime changes must be verified on the emulator with real logs, screenshots, and the actual app flow.
3. Model configuration, chat, execution, retry, and logs belong to the app shell; generated scripts only do phone actions.
4. Runtime logs are part of the deliverable. If a model or script fails, inspect logs first and fix the root cause before claiming completion.
