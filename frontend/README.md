# EcoRide / EV Rentals — фронтенд

React-фронтенд по макетам из 1.txt (лендинг), 2.txt (карта), 3.txt (дашборд). Бэкенд планируется на .NET C#.

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

1. В корне проекта создайте файл `.env` (или добавьте в существующий):
   ```
   VITE_API_URL=https://localhost:7001/api
   ```
2. В коде используйте хелперы из `src/api/client.ts`:
   - `apiGet<T>(path)`
   - `apiPost<T>(path, body)`
   - `apiPut<T>(path, body)`
   - `apiDelete(path)`

Данные на страницах пока захардкожены (мок). После реализации API замените их на вызовы к вашему .NET backend.
