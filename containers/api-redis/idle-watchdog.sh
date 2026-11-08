#!/bin/sh
# AHK idle watchdog: stops this RunPod pod when nobody is using it, so the house only bills while a night is on.
#
# Every minute it reads the API's /health (`wsConnections` = phones + TVs connected). It stops the pod when
#   - nobody has been connected for AHK_IDLE_STOP_MINUTES (default 20), or
#   - the container has run for AHK_MAX_SESSION_HOURS (default 6), even if a TV was left open.
# The stop call uses the pod-scoped RUNPOD_API_KEY and RUNPOD_POD_ID that RunPod injects into every pod.
# Outside RunPod (no RUNPOD_POD_ID) it does nothing. Run it in the background before the main entrypoint.

IDLE_MIN="${AHK_IDLE_STOP_MINUTES:-20}"
MAX_HOURS="${AHK_MAX_SESSION_HOURS:-6}"
HEALTH_URL="${AHK_HEALTH_URL:-http://127.0.0.1:8000/health}"
RUNPOD_API="${AHK_RUNPOD_API:-https://api.runpod.io/v2}"

if [ -z "${RUNPOD_POD_ID:-}" ] || [ -z "${RUNPOD_API_KEY:-}" ]; then
    echo "[ahk-watchdog] not on RunPod (no pod id/key); idle auto-off disabled"
    exit 0
fi

echo "[ahk-watchdog] armed: stop after ${IDLE_MIN} min with nobody connected, or after ${MAX_HOURS} h"

idle=0
elapsed=0
while sleep 60; do
    elapsed=$((elapsed + 1))
    connections="$(wget -qO- -T 5 "$HEALTH_URL" 2>/dev/null | sed -n 's/.*"wsConnections":\([0-9][0-9]*\).*/\1/p')"

    if [ -n "$connections" ]; then
        if [ "$connections" -gt 0 ]; then
            idle=0
        else
            idle=$((idle + 1))
        fi
    fi

    reason=""
    if [ "$idle" -ge "$IDLE_MIN" ]; then
        reason="nobody connected for ${idle} min"
    elif [ "$elapsed" -ge $((MAX_HOURS * 60)) ]; then
        reason="session reached ${MAX_HOURS} h"
    fi

    if [ -n "$reason" ]; then
        echo "[ahk-watchdog] stopping pod ${RUNPOD_POD_ID}: ${reason}"
        if wget -qO- -T 15 \
            --header="Authorization: Bearer ${RUNPOD_API_KEY}" \
            --header="Content-Type: application/json" \
            --post-data='{"action":"stop"}' \
            "${RUNPOD_API}/pods/${RUNPOD_POD_ID}/action" >/dev/null 2>&1; then
            echo "[ahk-watchdog] stop requested"
        else
            echo "[ahk-watchdog] stop request failed; retrying next minute"
        fi
    fi
done
