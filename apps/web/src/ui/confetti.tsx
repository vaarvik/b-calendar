import { useEffect, useRef } from 'react';

const COLORS = ['#ffcf6b', '#e8546b', '#7fd1c7', '#b69cff', '#ffffff'];

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  spin: number;
  angle: number;
  color: string;
}

/** A burst of confetti over the whole screen, once, for about four seconds. */
export function Confetti() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (element == null || context == null) {
      return undefined;
    }
    if (globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }
    const ratio = globalThis.devicePixelRatio || 1;
    element.width = innerWidth * ratio;
    element.height = innerHeight * ratio;
    context.scale(ratio, ratio);
    const pieces: Piece[] = Array.from({ length: 160 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 80,
      y: innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 14 - 4,
      size: Math.random() * 7 + 5,
      spin: (Math.random() - 0.5) * 0.4,
      angle: Math.random() * Math.PI,
      color: COLORS[Math.floor(Math.random() * COLORS.length)] ?? '#ffffff',
    }));
    const started = performance.now();
    let frame = 0;
    const draw = (time: number) => {
      const elapsed = time - started;
      context.clearRect(0, 0, innerWidth, innerHeight);
      context.globalAlpha = Math.max(0, 1 - Math.max(0, elapsed - 2800) / 1200);
      for (const piece of pieces) {
        piece.vy += 0.32;
        piece.vx *= 0.99;
        piece.x += piece.vx;
        piece.y += piece.vy;
        piece.angle += piece.spin;
        context.save();
        context.translate(piece.x, piece.y);
        context.rotate(piece.angle);
        context.fillStyle = piece.color;
        context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
        context.restore();
      }
      if (elapsed < 4000) {
        frame = requestAnimationFrame(draw);
      }
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={canvas} className="confetti" aria-hidden="true" />;
}
