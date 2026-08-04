# ADR-0011: Mapa modyfikatorów gestów w widoku 3D

- **Data:** 2026-08-04
- **Status:** zaakceptowana
- **Dotyczy:** `projects/web-smokeview-lib/src/lib/services/editing`, `projects/web-smokeview-lib/src/lib/views/smokeview`

## Kontekst

Modyfikatory klawiatury w widoku Visualize obrosły znaczeniami w dwóch różnych
ADR-ach (0009, 0010) i w kodzie. Przy geście pionowym ujawnił się konflikt:
ctrl nie może jednocześnie znaczyć „zawieś snap" i „przesuwaj w pionie" w tym
samym momencie gestu. Ta decyzja zbiera wszystkie znaczenia w jedną mapę
i rozstrzyga konflikt.

## Decyzja

Znaczenie modyfikatora zależy od chwili, w której działa:

| Klawisz | Przy kliku (bez przeciągania) | Przy chwycie uchwytu | W trakcie gestu |
|---|---|---|---|
| **Ctrl** | rozszerza zaznaczenie (ADR-0010) | **na kwadracie planu: otwiera gest pionowy (z)**; na pozostałych uchwytach: gest startuje z zawieszonym snapem | zawiesza snap do końca gestu, z zapadką (ADR-0010) |
| **Shift** | rozszerza zaznaczenie (ADR-0010) | — (kamera nie słucha lewego przycisku, ADR-0012) | — |
| **Ctrl+Z / Ctrl+Y** | historia edycji (ADR-0009) | — | — |
| **Escape** | — | — | porzuca gest |
| **Strzałki / PgUp / PgDn** | nudge: seria = jeden gest, o komórkę siatki (kamera straciła strzałki bezpowrotnie) | — | kontynuują serię nudge |

Reguły rozstrzygające dla ctrl:

- **Ctrl decyduje w chwili chwytu i jest tym wyborem zużyty.** Gest pionowy
  snapuje po siatce jak każdy inny; dopiero ctrl dociśnięty *na świeżo*
  w trakcie gestu zawiesza snap.
- **Świeże dociśnięcie to keydown klawisza Control bez auto-repeat.** Repeaty
  trzymanego ctrl ani inne klawisze wciskane przy trzymanym ctrl (niosące
  `ctrlKey`) się nie liczą.
- **Wpływ trzymanego ctrl na następny gest materializuje się przy chwycie**
  (w `begin()`), nie przez zdarzenia klawiatury — dzięki temu drugi i każdy
  kolejny gest pod trzymanym ctrl zachowuje się jak pierwszy.

## Konsekwencje

- Kwadratem planu nie da się *rozpocząć* gestu planarnego z zawieszonym
  snapem — ctrl trzeba docisnąć po chwycie. Na strzałkach osi i trójkątach
  resize stare znaczenie ctrl-przy-chwycie pozostaje.
- Tryb gestu jest zatrzaśnięty na cały gest: puszczenie ctrl w trakcie gestu
  pionowego nie wraca do planu.
- W idealnym widoku z góry oś z jest równoległa do promienia patrzenia i
  celowanie myszą w pionie traci sens — pozostaje PgUp/PgDn i wpisanie dZ.

## Rozważone alternatywy

- **Shift+kwadrat = pion** — shift jest dokumentowaną asekuracją trzymaną
  nawykowo dokładnie przy celowaniu w małe uchwyty; przypadkowe piony byłyby
  codziennością.
- **Alt+kwadrat = pion** — zero konfliktu w aplikacji, ale Alt zahacza o menu
  przeglądarki (Firefox/Windows); zbyt kruche jak na podstawowy gest.
- **Ctrl przełączający tryb także w trakcie gestu** — wprost sprzeczne
  z zapadką zawieszenia snapu z ADR-0010.
