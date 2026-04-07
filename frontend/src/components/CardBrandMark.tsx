import type { DetectedCardBrand } from '../lib/cardBin'

function brandSrc(brand: DetectedCardBrand): string {
  switch (brand) {
    case 'Visa':
      return '/img/visa-svgrepo-com.svg'
    case 'Mastercard':
      return '/img/mastercard-3-svgrepo-com.svg'
    case 'МИР':
      return '/img/mir-svgrepo-com.svg'
    default: {
      const _exhaustive: never = brand
      return _exhaustive
    }
  }
}

type Props = {
  brand: DetectedCardBrand | null
  className?: string
}

/** Марка платёжной системы: файлы из `public/img/`. */
export function CardBrandMark({ brand, className }: Props) {
  const box = `inline-flex items-center justify-center overflow-hidden ${className ?? ''}`

  if (!brand) {
    return (
      <span className={box} aria-hidden>
        <svg viewBox="0 0 48 32" className="h-full w-full text-neutral-600" width="100%" height="100%">
          <rect x="1.5" y="4.5" width="45" height="23" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <rect x="6" y="11" width="36" height="5" rx="1" className="fill-neutral-800" stroke="none" />
        </svg>
      </span>
    )
  }

  return (
    <span className={box}>
      <img
        src={brandSrc(brand)}
        alt=""
        className="h-full w-full object-contain object-center"
        decoding="async"
      />
    </span>
  )
}
