# Harpagan Route Planner

Mobilna PWA do dopasowania fotografii mapy rajdu do OpenStreetMap, dodawania bazy i PK oraz planowania pętli pieszej.

## Uruchomienie

```bash
npm install
npm run dev
```

Testy: `npm test` (6 plików, 10 przypadków), build produkcyjny: `npm run build`.

Projekt zapisuje się automatycznie w IndexedDB. Routing korzysta z publicznego Valhalla; przy niedostępności pokazuje bezpieczny fallback geometryczny. Dane map i zdjęcia nie są wysyłane do aplikacji; do usług trasowania trafiają wyłącznie współrzędne.

Zdjęcie można dodać z aparatu albo wybrać istniejący plik z galerii. Obrót jest dostępny wyłącznie przed rozpoczęciem kalibracji. W kalibracji nieruchomy celownik pozostaje na środku ekranu: najpierw przesuń i powiększ zdjęcie pod celownikiem, zablokuj punkt, a następnie ustaw pod nim to samo miejsce na OSM. Powtórz proces dla minimum czterech punktów rozłożonych po mapie i wybierz „Zakończ kalibrację”. Jednym palcem przesuwa się aktywną warstwę, a dwoma zmienia jej skalę. Podczas kalibracji i dodawania PK kąt zdjęcia jest zablokowany.

Bazę można pobrać z GPS albo ustawić pod celownikiem na OSM. W ustawieniach punktów można niezależnie dodać bazę na początku i na końcu trasy, użyć jej tylko jako mety albo całkowicie usunąć ją z trasy. Trasa może więc być pętlą, trasą otwartą kończącą się w bazie lub trasą bez bazy. Po publikacji zmian GitHub Actions automatycznie aktualizuje GitHub Pages.

## GitHub Pages

Workflow wdrażający aplikację znajduje się w `.github/workflows/deploy.yml`. W repozytorium GitHub wybierz Settings → Pages → GitHub Actions. Aplikacja używa bazowej ścieżki `/harpagan-planner/`.

Na iPhonie otwórz stronę w Chrome, wybierz Udostępnij → Dodaj do ekranu początkowego. Na mapie zawsze zostaw widoczną atrybucję OpenStreetMap. Ponowne wyznaczanie trasy wymaga internetu.
