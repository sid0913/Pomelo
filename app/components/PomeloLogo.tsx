type Props = {
  size?: number;
  className?: string;
};

export function PomeloLogo({ size = 32, className }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      aria-label="Pomelo"
    >
      <ellipse cx="96" cy="110" rx="80" ry="34" fill="none" stroke="#FBBF24" strokeWidth="3.5" opacity="0.85" transform="rotate(-24 96 110)" />
      <circle cx="96" cy="110" r="60" fill="#C2410C" />
      <circle cx="96" cy="110" r="51" fill="#D97706" />
      <ellipse cx="78" cy="90" rx="16" ry="11" fill="#FBBF24" opacity="0.6" />
      <path d="M 102 48 Q 126 20 146 36 Q 122 54 102 48 Z" fill="#5E8C2A" />
      <g transform="rotate(-24 96 110)">
        <circle cx="176" cy="110" r="9" fill="#7C2D12" />
        <circle cx="176" cy="110" r="3.5" fill="#FEF3EC" />
      </g>
    </svg>
  );
}
