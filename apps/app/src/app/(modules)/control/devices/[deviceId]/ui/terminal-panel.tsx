"use client";

import { useEffect, useRef, useState } from "react";

export default function TerminalPanel({ deviceId }: { deviceId: string }) {
  const [connected, setConnected] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [buffer, setBuffer] = useState<string>("");

  const wsRef = useRef<WebSocket | null>(null);

  function append(text: string) {
    setBuffer((b) => (b + text).slice(-200_000));
  }

  function connect() {
    setErr(null);

    // Recommended future endpoint on your Go control server:
    // wss://rmm.hi5tech.co.uk/ws/terminal?device_id=...
    // (You can change this later once the backend is ready.)
    const url = `wss://rmm.hi5tech.co.uk/ws/terminal?device_id=${encodeURIComponent(deviceId)}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        append("\n[connected]\n");
      };

      ws.onmessage = (ev) => {
        append(String(ev.data));
      };

      ws.onerror = () => {
        setErr("Terminal WS not available yet (wire Go WS endpoint).");
      };

      ws.onclose = () => {
        setConnected(false);
        append("\n[disconnected]\n");
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
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Terminal</div>
          <p className="text-sm opacity-75 mt-1">
            This is the Control UI terminal panel. Next step: wire your Go control server WebSocket PTY stream.
          </p>
        </div>
        <div className="flex gap-2">
          {!connected ? (
            <button className="hi5-btn-primary text-sm" type="button" onClick={connect}>
              Connect
            </button>
          ) : (
            <button className="hi5-btn-ghost text-sm" type="button" onClick={disconnect}>
              Disconnect
            </button>
          )}
        </div>
      </div>

      {err ? <div className="text-sm text-red-300">{err}</div> : null}

      <div className="hi5-panel p-3">
        <pre className="whitespace-pre-wrap font-mono text-[12px] leading-5 max-h-[420px] overflow-auto">
          {buffer || "Terminal output will appear here once the WS endpoint is wired."}
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
