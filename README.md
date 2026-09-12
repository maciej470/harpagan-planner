# Harpagan Route Planner

Mobilna PWA do dopasowania fotografii mapy rajdu do OpenStreetMap, dodawania bazy i PK oraz planowania pętli pieszej.

## Uruchomienie

```bash
npm install
npm run dev
```

Testy: `npm test` (5 plików, 6 przypadków), build produkcyjny: `npm run build`.

Projekt zapisuje się automatycznie w IndexedDB. Routing korzysta z publicznego Valhalla; przy niedostępności pokazuje bezpieczny fallback geometryczny. Dane map i zdjęcia nie są wysyłane do aplikacji; do usług trasowania trafiają wyłącznie współrzędne.

Zdjęcie można dodać z aparatu albo wybrać istniejący plik z galerii. Po dodaniu wybierz „Przesuń / skaluj zdjęcie”, aby przeciągać warstwę jednym palcem lub skalować ją kółkiem myszy. Kalibrację rozpoczyna przycisk „Dodaj punkt kalibracyjny”: wskaż punkt na zdjęciu, a następnie odpowiadające mu miejsce na mapie cyfrowej; wykonaj to co najmniej cztery razy. Po kalibracji tryb „Punkty” pozwala dodawać PK ze zdjęcia.

Przycisk bazy próbuje pobrać bieżącą lokalizację telefonu; przy braku zgody można pozostawić bazę ustawioną środkiem mapy. Po publikacji zmian GitHub Actions automatycznie aktualizuje GitHub Pages.

## GitHub Pages

Workflow wdrażający aplikację znajduje się w `.github/workflows/deploy.yml`. W repozytorium GitHub wybierz Settings → Pages → GitHub Actions. Aplikacja używa bazowej ścieżki `/harpagan-planner/`.

Na iPhonie otwórz stronę w Chrome, wybierz Udostępnij → Dodaj do ekranu początkowego. Na mapie zawsze zostaw widoczną atrybucję OpenStreetMap. Ponowne wyznaczanie trasy wymaga internetu.
