// apps/app/src/app/(modules)/control/devices/[id]/ui/terminal-panel.tsx
"use client";

import { useEffect, useRef, useState } from "react";

export default function TerminalPanel({ deviceId }: { deviceId: string }) {
  const [connected, setConnected] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [buffer, setBuffer] = useState<string>("");

  const wsRef = useRef<WebSocket | null>(null);

  function append(text: string) {
    setBuffer((b) => (b + text).slice(-200_000)); // cap
  }

  async function connect() {
    setErr(null);

    // This is a SAME-ORIGIN websocket URL you’ll implement on the server later.
    // For now it will fail gracefully unless you wire the backend.
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${proto}://${window.location.host}/api/control/terminal?device_id=${encodeURIComponent(deviceId)}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        append(`\n[connected]\n`);
      };

      ws.onmessage = (ev) => {
        append(String(ev.data));
      };

      ws.onerror = () => {
        setErr("WebSocket error (terminal backend not wired yet).");
      };

      ws.onclose = () => {
        setConnected(false);
        append(`\n[disconnected]\n`);
      };
    } catch (e: any) {
      setErr(e?.message ?? "Failed to connect");
    }
  }

  function disconnect() {
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }

  function send() {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (!input.trim()) return;

    // simple line send; later you’ll send raw keystrokes for interactive PTY
    ws.send(input + "\n");
    setInput("");
  }

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  return (
    <div className="hi5-panel p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">Terminal</div>
          <div className="text-xs opacity-70 mt-1">
            UI is ready. Next step is wiring the control server WS endpoint for PTY streaming.
          </div>
        </div>

        <div className="flex gap-2">
          {!connected ? (
            <button className="hi5-btn-primary text-sm" onClick={connect} type="button">
              Connect
            </button>
          ) : (
            <button className="hi5-btn-ghost text-sm" onClick={disconnect} type="button">
              Disconnect
            </button>
          )}
        </div>
      </div>

      {err ? <div className="text-sm text-red-300">{err}</div> : null}

      <div className="hi5-panel p-3">
        <pre className="whitespace-pre-wrap font-mono text-[12px] leading-5 max-h-[420px] overflow-auto">
          {buffer || "Terminal output will appear here."}
        </pre>
      </div>

      <div className="flex gap-2">
        <input
          className="hi5-input font-mono text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={connected ? "Type a command..." : "Connect to enable input"}
          disabled={!connected}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <button className="hi5-btn-primary text-sm" type="button" onClick={send} disabled={!connected || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
