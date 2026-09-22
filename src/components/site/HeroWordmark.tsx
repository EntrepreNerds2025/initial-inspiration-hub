import { useEffect, useRef, useState } from "react";

/** One proportional brand composition: natural glyphs, close leading, one shared scale. */
export default function HeroWordmark() {
  const first = useRef<SVGTextElement>(null);
  const second = useRef<SVGTextElement>(null);
  const [layout, setLayout] = useState({
    width: 2400,
    height: 1430,
    firstX: 0,
    firstY: 836,
    secondX: 0,
    secondY: 1400,
    secondSize: 550,
  });

  useEffect(() => {
    let cancelled = false;
    // Measure only the real brand font, not a temporary fallback. Geometry then
    // stays fixed; the containing SVG scales both lines uniformly at every width.
    void document.fonts.load('900 1000px "Satoshi Variable"').then(() => {
      if (cancelled || !first.current || !second.current) return;
      // Canvas ink metrics exclude the font's invisible line-box leading.
      const context = document.createElement("canvas").getContext("2d");
      if (!context) return;
      context.font = '900 1000px "Satoshi Variable"';
      context.letterSpacing = "-45px";
      const top = context.measureText("dept.");
      const bottom = context.measureText("collective");
      // A fixed type-size relationship preserves natural letterforms; the lower
      // line may run wider instead of being forced to equal the upper line.
      const firstScale = 1.1;
      const ratio = 0.57;
      const width = Math.max(
        (top.actualBoundingBoxLeft + top.actualBoundingBoxRight) * firstScale,
        (bottom.actualBoundingBoxLeft + bottom.actualBoundingBoxRight) * ratio,
      );
      const topHeight = (top.actualBoundingBoxAscent + top.actualBoundingBoxDescent) * firstScale;
      // Tuck the lower line alongside the p descender; glyphs do not overlap.
      // This font-relative spacing scales with the entire lockup on mobile.
      const gap = topHeight * -0.105;
      setLayout({
        width,
        height:
          topHeight +
          gap +
          (bottom.actualBoundingBoxAscent + bottom.actualBoundingBoxDescent) * ratio,
        firstX: top.actualBoundingBoxLeft * firstScale,
        firstY: top.actualBoundingBoxAscent * firstScale,
        secondX: bottom.actualBoundingBoxLeft * ratio,
        secondY: topHeight + gap + bottom.actualBoundingBoxAscent * ratio,
        secondSize: 1000 * ratio,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <svg
      className="dept-wordmark"
      x="4%"
      y="12%"
      width="92%"
      height="69%"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      preserveAspectRatio="xMinYMid meet"
      overflow="visible"
    >
      <text ref={first} x={layout.firstX} y={layout.firstY} fontSize={1100}>
        dept.
      </text>
      <text ref={second} x={layout.secondX} y={layout.secondY} fontSize={layout.secondSize}>
        collective
      </text>
    </svg>
  );
}
