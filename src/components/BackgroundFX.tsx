const GLYPHS = [
  { char: '鬼', className: 'left-[4%] top-[18%] text-[9rem]', delay: '0s' },
  { char: '判', className: 'right-[5%] top-[10%] text-[7rem]', delay: '1.4s' },
  { char: '狱', className: 'right-[16%] bottom-[8%] text-[10rem]', delay: '2.2s' },
  { char: '还', className: 'left-[10%] bottom-[4%] text-[6rem]', delay: '0.8s' },
];

export function BackgroundFX() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden stage-hide"
    >
      <div className="absolute inset-x-0 top-0 h-[60vh] hero-vignette opacity-80" />
      <div className="absolute inset-0 hell-grid-line opacity-40" />
      {GLYPHS.map((glyph) => (
        <span
          key={glyph.char}
          className={`float-slow absolute select-none font-display leading-none text-hell-purple/5 ${glyph.className}`}
          style={{ animationDelay: glyph.delay }}
        >
          {glyph.char}
        </span>
      ))}
      <div className="absolute -left-32 top-1/3 h-72 w-72 rounded-full bg-hell-purple/10 blur-[110px]" />
      <div className="absolute -right-24 top-10 h-64 w-64 rounded-full bg-hell-red/10 blur-[100px]" />
    </div>
  );
}