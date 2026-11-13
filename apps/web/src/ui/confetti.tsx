import { useEffect, useRef, useState } from 'react';

const COLORS = ['#ffcf6b', '#e8546b', '#7fd1c7', '#b69cff', '#ffffff'];

/** How long the burst lasts, and when it starts to fade. */
const DURATION_MS = 4000;
const FADE_FROM_MS = 2800;

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

/**
 * A burst of confetti over the whole screen, once, for about four seconds. Moves by the clock, not
 * by frames, so a phone that skips frames still finishes on time; the canvas is cleared and removed
 * at the end, so nothing is left hanging.
 */
export function Confetti() {
  const canvas = useRef<HTMLCanvasElement>(null);
  // With reduced motion asked for, there is no burst at all.
  const [done, setDone] = useState(
    () => globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (element == null || context == null) {
      return undefined;
    }
    let width = 0;
    let height = 0;
    // Follows the screen: the iPhone's address bar changes the height while she scrolls.
    const fit = () => {
      const ratio = globalThis.devicePixelRatio || 1;
      width = innerWidth;
      height = innerHeight;
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    fit();
    addEventListener('resize', fit);

    // Speeds in pixels per second, gravity in pixels per second squared.
    const pieces: Piece[] = Array.from({ length: 160 }, () => ({
      x: width / 2 + (Math.random() - 0.5) * 80,
      y: height * 0.35,
      vx: (Math.random() - 0.5) * 840,
      vy: -Math.random() * 840 - 240,
      size: Math.random() * 7 + 5,
      spin: (Math.random() - 0.5) * 24,
      angle: Math.random() * Math.PI,
      color: COLORS[Math.floor(Math.random() * COLORS.length)] ?? '#ffffff',
    }));
    const started = performance.now();
    let last = started;
    let frame = 0;
    const finish = () => {
      cancelAnimationFrame(frame);
      context.clearRect(0, 0, width, height);
      setDone(true);
    };
    const draw = (time: number) => {
      const elapsed = time - started;
      if (elapsed >= DURATION_MS) {
        finish();
        return;
      }
      // A long pause (the phone was busy) moves at most a twentieth of a second.
      const dt = Math.min(0.05, (time - last) / 1000);
      last = time;
      context.clearRect(0, 0, width, height);
      context.globalAlpha = Math.max(
        0,
        1 - Math.max(0, elapsed - FADE_FROM_MS) / (DURATION_MS - FADE_FROM_MS),
      );
      for (const piece of pieces) {
        piece.vy += 1150 * dt;
        piece.vx *= Math.pow(0.55, dt);
        piece.x += piece.vx * dt;
        piece.y += piece.vy * dt;
        piece.angle += piece.spin * dt;
        if (piece.y > height + 20) {
          continue;
        }
        context.save();
        context.translate(piece.x, piece.y);
        context.rotate(piece.angle);
        context.fillStyle = piece.color;
        context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
        context.restore();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    // If the phone stops drawing altogether (the app goes to the background), still end on time.
    const deadline = setTimeout(finish, DURATION_MS + 500);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(deadline);
      removeEventListener('resize', fit);
    };
  }, []);

  return done ? null : <canvas ref={canvas} className="confetti" aria-hidden="true" />;
}
