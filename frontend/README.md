# EcoRide / EV Rentals — фронтенд

React-фронтенд EcoRide (лендинг, карта, дашборд, тарифы). API — .NET в каталоге `backend/`.

## Стек

- **React 19** + TypeScript
- **Vite 7**
- **React Router**
- **Tailwind CSS 4**
- Шрифты: Space Grotesk, Noto Sans; иконки: Material Symbols Outlined

## Запуск

```bash
cd frontend
npm install
npm run dev
```

Откройте http://localhost:5173

## Сборка

```bash
npm run build
```

Результат в папке `dist/`.

## Страницы

| Путь        | Описание                    |
|------------|-----------------------------|
| `/`        | Лендинг EcoRide             |
| `/map`     | Карта транспорта EV Rentals |
| `/dashboard` | Дашборд пользователя      |

## Карта

На странице `/map` используется **Яндекс.Карты** (JavaScript API 2.1).

## Подключение бэкенда (.NET)

Базовый URL API в коде задан пустой строкой: в dev Vite проксирует `/api` на `http://localhost:8080` (см. `vite.config.ts`). При необходимости измените константы в `src/api/auth.ts` и `src/api/client.ts`.

1. Используйте хелперы из `src/api/client.ts`:
   - `apiGet<T>(path)`
   - `apiPost<T>(path, body)`
   - `apiPut<T>(path, body)`
   - `apiDelete(path)`

Данные на страницах пока захардкожены (мок). После реализации API замените их на вызовы к вашему .NET backend.
