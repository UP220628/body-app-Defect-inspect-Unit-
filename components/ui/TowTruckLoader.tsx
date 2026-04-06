import type { CSSProperties } from 'react';

type TowTruckLoaderSize = 'sm' | 'md' | 'lg';

interface TowTruckLoaderProps {
  label?: string;
  size?: TowTruckLoaderSize;
  className?: string;
  labelClassName?: string;
  dark?: boolean;
  compact?: boolean;
  assetSrc?: string;
  assetAlt?: string;
}

const SIZE_TO_WIDTH: Record<TowTruckLoaderSize, string> = {
  sm: '96px',
  md: '124px',
  lg: '150px',
};

const SIZE_TO_DURATION: Record<TowTruckLoaderSize, string> = {
  sm: '1.45s',
  md: '1.75s',
  lg: '2.05s',
};

const SIZE_TO_RUNWAY_WIDTH: Record<TowTruckLoaderSize, string> = {
  sm: '70%',
  md: '66%',
  lg: '62%',
};

export const TowTruckLoader = ({
  label = 'Loading...',
  size = 'md',
  className = '',
  labelClassName = '',
  dark = false,
  compact = false,
  assetSrc = '/images/Truck.png',
  assetAlt = 'Tow truck loader',
}: TowTruckLoaderProps) => {
  const style = {
    '--tow-truck-size': SIZE_TO_WIDTH[size],
    '--tow-loader-duration': SIZE_TO_DURATION[size],
    '--tow-runway-width': SIZE_TO_RUNWAY_WIDTH[size],
  } as CSSProperties;

  return (
    <div
      className={`tow-loader ${compact ? 'tow-loader-compact' : ''} ${className}`.trim()}
      style={style}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="tow-loader-runway" aria-hidden="true">
        {assetSrc ? (
          <svg className="tow-loader-vehicle" viewBox="0 0 320 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={assetAlt}>
            <image href={assetSrc} x="0" y="0" width="320" height="140" preserveAspectRatio="xMidYMid meet" />
          </svg>
        ) : (
          <svg className="tow-loader-vehicle" viewBox="0 0 320 140" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="22" y="88" width="190" height="14" rx="3" fill="#A3A3A3" />
            <rect x="198" y="88" width="14" height="14" fill="#8A8A8A" />

            <path d="M47 62H167C173 62 178 67 178 73V83C178 88 173 92 168 92H44C39 92 35 88 35 83V73C35 67 41 62 47 62Z" fill="#F44336" />
            <path d="M53 45C56 37 64 31 73 31H144L160 62H53V45Z" fill="#EF4444" />
            <polygon points="55,62 63,37 104,37 104,62" fill="#0EA5E9" />
            <polygon points="116,62 116,37 142,37 154,62" fill="#0EA5E9" />
            <rect x="167" y="73" width="13" height="9" rx="4" fill="#111827" />

            <path d="M214 51C214 45 219 40 225 40H260C266 40 271 44 273 50L276 62V92H214V51Z" fill="#F59E0B" />
            <path d="M276 62L293 79C296 82 298 86 298 90V106H214V92H276V62Z" fill="#F59E0B" />
            <path d="M230 39H245V79C245 82 247 84 250 84H272V90H250C239 90 230 81 230 71V39Z" fill="#111827" />
            <rect x="246" y="46" width="24" height="34" rx="6" fill="#0EA5E9" />
            <rect x="236" y="31" width="16" height="7" rx="1.5" fill="#EF4444" />
            <rect x="296" y="86" width="14" height="9" rx="4" fill="#111827" />

            <circle className="tow-loader-wheel" cx="67" cy="106" r="15" fill="#334155" />
            <circle className="tow-loader-wheel" cx="132" cy="106" r="15" fill="#334155" />
            <circle className="tow-loader-wheel" cx="88" cy="120" r="17" fill="#334155" />
            <circle className="tow-loader-wheel" cx="252" cy="120" r="17" fill="#334155" />

            <circle cx="67" cy="106" r="5" fill="#020617" />
            <circle cx="132" cy="106" r="5" fill="#020617" />
            <circle cx="88" cy="120" r="5" fill="#020617" />
            <circle cx="252" cy="120" r="5" fill="#020617" />
          </svg>
        )}
      </div>

      {label ? (
        <p className={`tow-loader-label ${dark ? 'text-white/90' : 'text-gray-600'} ${labelClassName}`.trim()}>
          {label}
        </p>
      ) : null}
    </div>
  );
};