import React from 'react';

export default function FellaLogo({ size = 40, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block', flexShrink: 0 }}
    >
      <circle cx="18" cy="18" r="18" fill="#0866FF" />
      <g transform="translate(18, 19) scale(0.76) translate(-18, -18)">
        <path
          d="M20.14 34.5V20.14H24.9l.74-5.8h-5.64v-3.7c0-1.68.47-2.83 2.88-2.83h3.08V2.62c-.53-.07-2.36-.23-4.49-.23-4.44 0-7.48 2.71-7.48 7.69v4.26h-5v5.8h5V34.5h6.65z"
          fill="white"
        />
      </g>
    </svg>
  );
}
