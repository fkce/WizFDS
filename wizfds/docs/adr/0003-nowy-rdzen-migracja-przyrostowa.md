# ADR-0003: Nowy rdzeń renderujący pod edycję geometrii, migrowany przyrostowo

- **Data:** 2026-07-26
- **Status:** zaakceptowana
- **Dotyczy:** `projects/web-smokeview-lib`, `projects/wizfds/src/app/views/main/fds/visualize`

## Kontekst

Cel produktowy WizFDS wykracza poza podgląd: docelowo geometria i obiekty FDS mają być **rysowane w przeglądarce**, tak żeby uniezależnić się od pluginu AutoCAD/BricsCAD/GStarCAD. Do tego dochodzi rozbudowa o pełny post-processing (SLCF animowane, BNDF, ISOF, PART, SMOKE3D, PLOT3D — luki wymienione w `docs/reference/fds-smv-structure.md`), narzędzia interakcji i tryb prezentacyjny.

Dzisiejsza biblioteka jest zbudowana pod **statyczny podgląd** i cztery decyzje rdzeniowe stoją na drodze edycji:

1. **Batchowanie wszystkiego w jeden `VertexData`.** `ObstService` skleja wszystkie OBST w jeden mesh (plus drugi dla przezroczystych i trzeci back-cap), po czym woła `freezeWorldMatrix()`. Przesunięcie jednego obiektu wymaga przebudowy całego bufora i ponownego liczenia normalnych — a kod przeliczania normalnych jest O(n²) (`obst.service.ts:489-510`: dla każdego OBST skanuje całą tablicę `indices`).
2. **Brak tożsamości obiektu na GPU.** Jedyny mechanizm „który obiekt kliknięto" to `obsts[Math.floor(faceId / 12)]` (`obst.service.ts:747`), zakładający dokładnie 12 trójkątów na obiekt w jednym buforze. Już dziś daje zły wynik dla OBST z otworami (CSG, zmienna liczba trójkątów) i dla obiektów przezroczystych (osobny bufor, osobna numeracja).
3. **Normalizacja do sześcianu jednostkowego** — patrz ADR-0002.
4. **Stan sceny rozsypany po singletonach.** Wszystkie serwisy są `providedIn: 'root'`, a `SmokeviewComponent.ngOnDestroy()` niszczy scenę i engine, nie resetując serwisów. `ready$` jest `ReplaySubject(1)`, więc po powrocie do widoku natychmiast emituje starą wartość i `VisualizeComponent` renderuje do sceny, która już nie istnieje.

Dokładanie kolejnych metod `renderXxx()` do tej struktury da działający podgląd, ale każdy taki element trzeba będzie napisać drugi raz, gdy dojdzie edycja.

## Decyzja

Budujemy **nowy rdzeń** biblioteki, zaprojektowany pod edycję od początku, i migrujemy na niego istniejące elementy **pojedynczo**, tak żeby podgląd działał na każdym etapie.

Rdzeń odpowiada za:

- **cykl życia sceny** — jawne tworzenie i niszczenie, powiązane z cyklem życia komponentu, bez stanu przeżywającego zniszczenie sceny;
- **rejestr obiektów** — mapowanie `uuid` obiektu FDS (ADR-0005) na jego reprezentację w scenie, w obie strony;
- **reprezentację GPU** — hybrydę thin instances i osobnych meshy (ADR-0006);
- **pickowanie** — natywne mechanizmy Babylona zamiast ręcznego raycastingu w JS, z obsługą hover, wielokrotnego zaznaczenia i zaznaczenia przez `uuid` z zewnątrz;
- **strumień komend edycji** wychodzący z biblioteki (ADR-0004);
- **oś czasu** dla danych wynikowych, wspólną dla SLCF, BNDF, PART i pozostałych formatów animowanych.

Serwisy rysujące (`ObstService`, `MeshService`, `VentService`, …) przechodzą na rdzeń jeden po drugim. Do czasu migracji danego elementu obie ścieżki współistnieją.

Pakiet `babylonjs` (UMD, bez tree-shakingu) pozostaje na razie bez zmian; migrację na `@babylonjs/core` albo Babylon Lite rozpatrzymy osobno, po ustabilizowaniu rdzenia — ADR-0001 ją odblokowuje, ale nie przesądza.

## Konsekwencje

**Pozytywne**
- Każdy nowy element wizualizacji jest pisany raz, od razu w kształcie nadającym się do edycji.
- Podgląd działa przez cały czas migracji — brak długiego okna, w którym nic nie działa.
- Naprawy blokerów (ADR-0001, ADR-0002) wykonują się przy okazji migracji poszczególnych elementów, nie jako osobna praca do wyrzucenia.

**Negatywne / do obsłużenia**
- Największy nakład z góry, zanim pojawi się widoczna nowa funkcja.
- Okres współistnienia dwóch ścieżek — trzeba pilnować, żeby nie utrwalił się na stałe. Migracja ma jawną listę elementów i widoczny koniec (patrz `docs/plans/smokeview-core-migration.md`).

## Rozważone alternatywy

- **Najpierw naprawić blokery, rdzeń później.** Szybszy widoczny efekt, ale praca nad pickowaniem, normalnymi i clippingiem w starej strukturze trafiłaby potem do kosza.
- **Podgląd zostaje, edytor budowany obok od zera.** Zero ryzyka regresji, ale dwa systemy renderujące do utrzymania i podwójna implementacja każdego elementu geometrii.
