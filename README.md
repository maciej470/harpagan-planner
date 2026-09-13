# Harpagan Route Planner

Mobilna PWA do dopasowania fotografii mapy rajdu do OpenStreetMap, dodawania nazwanych punktów oraz planowania trasy pieszej.

## Uruchomienie

```bash
npm install
npm run dev
```

Testy: `npm test` (8 plików, 14 przypadków), build produkcyjny: `npm run build`.

Projekt zapisuje się automatycznie w IndexedDB. Routing korzysta z publicznego Valhalla; przy niedostępności pokazuje bezpieczny fallback geometryczny. Dane map i zdjęcia nie są wysyłane do aplikacji; do usług trasowania trafiają wyłącznie współrzędne.

Zdjęcie można dodać z aparatu albo wybrać istniejący plik z galerii. Obrót jest dostępny wyłącznie przed rozpoczęciem kalibracji. W kalibracji nieruchomy celownik pozostaje na środku ekranu: najpierw przesuń i powiększ zdjęcie pod celownikiem, zablokuj punkt, a następnie ustaw pod nim to samo miejsce na OSM. Powtórz proces dla minimum czterech punktów rozłożonych po mapie. Każdą zapisaną parę można wybrać z listy i ustawić ponownie. Widok „Sprawdź kalibrację” nakłada przekształcone zdjęcie na OSM, pokazuje ponumerowane punkty i pozwala regulować krycie warstw suwakiem. Jednym palcem przesuwa się aktywną warstwę, a dwoma zmienia jej skalę. Podczas kalibracji i dodawania PK kąt zdjęcia jest zablokowany.

Każde miejsce jest zwykłym nazwanym punktem. Może nazywać się numerem PK, „Baza”, „Start”, „Meta” albo dowolną inną nazwą. Pozycję każdego PK można poprawić na zdjęciu albo OSM bez usuwania punktu. Nad listą punktów użytkownik wybiera z menu początek i koniec trasy; oba mogą znajdować się w innych miejscach niż baza. Przycisk „Oblicz trasę” prowadzi bezpośrednio do planowania po dodaniu minimum dwóch punktów. Starsze projekty są migrowane automatycznie: dawna baza staje się punktem nazwanym „Baza”. Po publikacji zmian GitHub Actions automatycznie aktualizuje GitHub Pages.

Po obliczeniu aplikacja pokazuje do trzech różnych wariantów, zachowując ręcznie wybrany początek i koniec. Kandydaci powstają przez różne odwrócenia i przesunięcia kolejności, są osobno trasowani, a następnie sortowani według rzeczywistego dystansu. Każda karta zawiera całkowity dystans i kolejność PK. Dopiero wybranie wariantu włącza eksport GPX i otwarcie całej trasy w Mapy.com. Każdy punkt wybranego wariantu można też osobno otworzyć w Mapy.com. Dla wybranego wariantu wyświetlana jest również duża lista numerów PK przeznaczona do przepisania na papierową mapę lub skopiowania do schowka.

## GitHub Pages

Workflow wdrażający aplikację znajduje się w `.github/workflows/deploy.yml`. W repozytorium GitHub wybierz Settings → Pages → GitHub Actions. Aplikacja używa bazowej ścieżki `/harpagan-planner/`.

Na iPhonie otwórz stronę w Chrome, wybierz Udostępnij → Dodaj do ekranu początkowego. Na mapie zawsze zostaw widoczną atrybucję OpenStreetMap. Ponowne wyznaczanie trasy wymaga internetu.
