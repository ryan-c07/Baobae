import { useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";

type Props = {
  color: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
};

export function DoodlePad({ color, value, onChange }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(!!value);

  const getCtx = () => ref.current?.getContext("2d");

  useEffect(() => {
    const canvas = ref.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    if (!value) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasInk.current = false;
      return;
    }
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      hasInk.current = true;
    };
    img.src = value;
  }, [value]);

  const start = useCallback(
    (x: number, y: number) => {
      const canvas = ref.current;
      const ctx = getCtx();
      if (!canvas || !ctx) return;
      drawing.current = true;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
    },
    [color]
  );

  const move = useCallback((x: number, y: number) => {
    const ctx = getCtx();
    if (!drawing.current || !ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
    hasInk.current = true;
  }, []);

  const finishStroke = useCallback(() => {
    drawing.current = false;
    const canvas = ref.current;
    if (canvas && hasInk.current) {
      onChange(canvas.toDataURL("image/png"));
    }
  }, [onChange]);

  const clear = useCallback(() => {
    const canvas = ref.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasInk.current = false;
    onChange(null);
  }, [onChange]);

  const onPointerDown = (e: React.PointerEvent) => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    start((x / r.width) * canvas.width, (y / r.height) * canvas.height);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const canvas = ref.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    move((x / r.width) * canvas.width, (y / r.height) * canvas.height);
  };

  const onPointerUp = () => {
    finishStroke();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <motion.canvas
        ref={ref}
        width={340}
        height={180}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        initial={{ opacity: 0.85 }}
        whileHover={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        style={{
          width: "100%",
          maxWidth: 420,
          height: 200,
          borderRadius: 16,
          touchAction: "none",
          background:
            "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
          border: "1px solid var(--glass-border)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
        }}
      />
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button type="button" onClick={clear} style={ghostBtn}>
          Clear canvas
        </button>
        <span
          style={{
            fontSize: "0.85rem",
            color: "var(--muted)",
            alignSelf: "center",
          }}
        >
          Scribble anything — it ships with your response.
        </span>
      </div>
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  padding: "0.45rem 0.9rem",
  borderRadius: 999,
  border: "1px solid var(--glass-border)",
  background: "rgba(255,255,255,0.04)",
  color: "var(--text)",
};
