@echo off
REM PERMANENT deploy wrapper — created 2026-07-22 morning shift.
REM Pins --branch=main per ERRORS 2026-07-21 evening MEDIUM: an unpinned deploy
REM inherited repo HEAD `master` (production tracks `main`), landed invisible to
REM abuz8ai.com, and the postdeploy gate false-PASSed. NEVER deploy unpinned.
REM
REM Contract (full deploy verification loop):
REM   1. deploy_delta.txt is AUTO-GENERATED below by scratchpad\gen_deploy_delta.py
REM      (files modified since last verified deploy stamp; SKIP_DELTA_GEN=1 to
REM      keep a hand-written manifest). Wired 2026-07-22 afternoon shift.
REM   2. python scratchpad\predeploy_check.py   -> must PASS
REM   3. scripts\deploy.bat
REM   4. python scratchpad\postdeploy_check.py  -> must PASS (includes delta-probe)
REM   5. python scratchpad\gen_deploy_delta.py --mark-deployed   (ONLY after PASS)
cd /d E:\ABU\abuz8ai-site
if not defined SKIP_DELTA_GEN (
  python scratchpad\gen_deploy_delta.py
  if errorlevel 1 (
    echo DEPLOY ABORTED: gen_deploy_delta.py failed — refusing to deploy with a
    echo stale/missing delta manifest. Fix the generator or set SKIP_DELTA_GEN=1
    echo with a hand-written scratchpad\deploy_delta.txt.
    exit /b 1
  )
)
npx wrangler pages deploy . --project-name=abuz8ai --branch=main --commit-dirty=true %*
