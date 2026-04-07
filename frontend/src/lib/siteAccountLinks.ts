export const SITE_ACCOUNT_LINKS = [
  { to: '/dashboard', label: 'Профиль и кошелёк', icon: 'person' as const },
  { to: '/dashboard#history', label: 'История поездок', icon: 'history' as const },
  { to: '/dashboard#wallet', label: 'Пополнение', icon: 'account_balance_wallet' as const },
  { to: '/dashboard#settings', label: 'Настройки', icon: 'settings' as const },
  { to: '/subscriptions', label: 'Подписки', icon: 'subscriptions' as const },
  { to: '/rewards', label: 'Награды CARSIKI', icon: 'loyalty' as const },
] as const
