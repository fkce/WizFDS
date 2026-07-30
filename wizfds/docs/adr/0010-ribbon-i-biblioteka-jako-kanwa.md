# ADR-0010: Interfejs edytora to ribbon w hoście; biblioteka to kanwa i API

- **Data:** 2026-07-30
- **Status:** zaakceptowana
- **Dotyczy:** `projects/web-smokeview-lib/src/lib/views/smokeview`, `projects/wizfds/src/app/views/main/fds/visualize`, `projects/webSmokeview`

## Kontekst

Widok 3D dostaje w Fazie 5 narzędzia: rysowanie, przesuwanie, snapowanie, pomiar. Każde z nich potrzebuje miejsca w interfejsie — a interfejs tego widoku jest dziś prowizoryczny.

- `smokeview.component.html` zawiera rząd surowych `<button>` bez żadnego układu ani hierarchii, obok siebie przełączniki widoczności, tryby wyświetlania i suwaki przekrojów.
- `smokeview.component.scss` to 233 linie zahardkodowanych hexów (`$blue: #29b6f6`, `$green: #9ccc65`, `$orange: #ff9800`) w kroju „Play". W całej bibliotece **nie ma ani jednego** `var(--…)`.
- Aplikacja wokół ma tymczasem przeprojektowany shell — lewa szyna, slim topbar, instrument status bar — oparty na pełnym systemie tokenów (`projects/wizfds/src/styles/_tokens.scss`: ciemne powierzchnie, akcent azure `#3b82f6`, Fira Sans / Fira Code, uzasadnienia w `docs/reference/ui-design-tokens.md`).
- Biblioteka jest używana przez **dwie** aplikacje: `wizfds` oraz standalone `webSmokeview`, który nie ma `Fds` i nigdy nie będzie edytorem.

Użytkownicy WizFDS to użytkownicy AutoCAD-a — geometrię tworzą dziś w AutoCAD/BricsCAD/GStarCAD. To przesądza, jaki język interfejsu jest dla nich czytelny bez nauki.

## Decyzja

### Ribbon jako chrome widoku 3D

Interfejs edytora odwzorowuje anatomię ribbona z AutoCAD-a: Quick Access Toolbar nad zakładkami, zakładki podzielone na nazwane panele, oraz **zakładka kontekstowa** pojawiająca się przy zaznaczeniu — mechanizm, który AutoCAD nazywa *ribbon contextual tab state*.

- **QAT**: undo, redo, stan zapisu.
- **Home**: Draw (OBST / HOLE / VENT plus selektor bieżącego SURF-a), Modify (przesuń, zmień rozmiar, usuń, kopiuj, szyk, odbicie), Snap (przełączniki Grid / Edge / Corner).
- **View**: widoczność per typ, tryby wyświetlania, płaszczyzny przekrojów, kamera i ViewCube.
- **Measure**: pomiar odległości, wymiary zaznaczenia.
- **zakładka kontekstowa** nazwana typem zaznaczonego elementu, z jego akcjami.

Ribbon żyje w **aplikacji**, na trasie `fds/visualize`, i jest zbudowany na istniejących tokenach. Lewa szyna, topbar i formularze pozostają bez zmian — ribbon nie zastępuje nawigacji aplikacji.

### Paleta właściwości

Dokowany panel po prawej, odpowiednik palety PROPERTIES z AutoCAD-a: `id`, sześć pól `XB`, `SURF` i przycisk otwierający pełny formularz. Wpisanie liczby emituje tę samą komendę edycji co gizmo — to zarazem realizacja „snapowania do wprowadzonej wartości".

Paleta jest świadomie **geometrycznym podzbiorem** formularza, nie jego drugą kopią.

### Status bar mówi, co robi kursor

Istniejący instrument status bar aplikacji zyskuje to, co AutoCAD tam trzyma: współrzędne kursora w metrach, informację która siatka `&MESH` jest aktywna dla snapowania i jaki ma krok, oraz licznik ostrzeżeń o naruszeniach reguł FDS.

### Dynamic input zamiast linii komend

Dokładne wymiary wpisuje się w małym panelu przy kursorze w trakcie gestu: `dx/dy/dz` przy przesuwaniu, zmieniana współrzędna przy ciągnięciu ściany. Tab przełącza pole, Enter zatwierdza, Esc anuluje cały gest.

Linia komend AutoCAD-owa **nie wchodzi** — wymagałaby zaprojektowania języka komend FDS od zera (parser, składnia, podpowiedzi, anulowanie), co jest osobnym przedsięwzięciem, nie panelem.

### Brak trybu globalnego

Nie ma przełącznika „podgląd / edycja". Domyślne narzędzie to wskaźnik: zwykły klik zaznacza, przeciągnięcie w pustce obraca kamerę, ctrl lub shift rozszerza zaznaczenie. Pozostałe narzędzia (rysuj, mierz) włącza się z ribbona i wyłączają się same po zakończeniu albo Esc.

Dzisiejsze ctrl+klik istnieje wyłącznie dlatego, że zaznaczanie było doklejone do podglądu.

### Biblioteka to kanwa i API

Z komponentu biblioteki wychodzą do hosta: menu widoczności, suwaki przekrojów, tabela pomocy i panel informacji o zaznaczeniu. Wołają metody API, które w większości już istnieją (`toogleVisibility()`, `clip()`).

W bibliotece zostają: kanwa, ViewCube i overlaye należące do gestu — dynamic input, markery snapowania, etykiety wymiarów. To ta sama granica, którą rysuje ADR-0004: biblioteka rysuje, host decyduje.

SCSS biblioteki przechodzi na **kontrakt tokenowy** — `var(--surface-1)`, `var(--accent)`, `var(--font-ui)` i pozostałe, z wartościami zapasowymi, żeby biblioteka wyglądała poprawnie także wtedy, gdy host nie definiuje niczego. Standalone `webSmokeview` dostaje własny, mały pasek kontrolek na tych samych tokenach.

## Konsekwencje

**Pozytywne**
- Użytkownik AutoCAD-a rozpoznaje układ bez nauki: zakładki, panele, zakładka kontekstowa, paleta właściwości, status bar.
- Każde kolejne sub-issue Fazy 5 dokłada przycisk do gotowej struktury, zamiast wymyślać własny chrome.
- Jedno źródło wyglądu dla całego produktu — koniec z równoległym zestawem kolorów i krojem „Play" w bibliotece.
- Biblioteka staje się węższa i łatwiejsza do testowania: rysuje i wystawia API, nie trzyma interfejsu.

**Negatywne / do obsłużenia**
- Standalone `webSmokeview` traci wbudowane kontrolki i wymaga własnego paska — dodatkowa praca w projekcie, który jest drugorzędny.
- Ribbon zajmuje pion na górze obszaru roboczego, którego dziś kanwa używa w całości. Przy niskich ekranach trzeba przewidzieć zwijanie paneli (AutoCAD minimalizuje ribbon do samych zakładek).
- Kontrakt tokenowy z wartościami zapasowymi to podwójne utrzymanie: zmiana tokenu w aplikacji nie przenosi się automatycznie na fallback w bibliotece.
- Rezygnacja z linii komend zamyka drogę użytkownikowi zaawansowanemu, który w AutoCAD pracuje niemal wyłącznie klawiaturą. Dynamic input pokrywa wpisywanie wartości, ale nie wywoływanie operacji.

## Rozważone alternatywy

- **Ribbon jako globalna nawigacja aplikacji.** Zastąpiłby lewą szynę i topbar, a formularze FDS (HEAD, MESH, SURF, pożary) trafiłyby pod zakładki i panele. Najbliżej AutoCAD-a, ale przepisuje całą nawigację i routing, które dopiero zostały przeprojektowane.
- **Ribbon w bibliotece.** Standalone viewer dostałby identyczny interfejs za darmo, ale ribbon musiałby wywoływać undo, zapis i formularze aplikacji przez wstrzykiwaną konfigurację — czyli poszerzyć granicę, którą ADR-0004 celowo trzyma wąską.
- **Biblioteka zachowuje wbudowane UI, host je ukrywa.** Zero pracy w standalone viewerze, ale dwa zestawy tych samych kontrolek i dwa miejsca, w których można zapomnieć dodać nowy przełącznik.
- **Jawny przełącznik „podgląd / edycja".** Chroniłby przed przypadkową zmianą przy przeglądaniu, ale użytkownicy gubią się, w którym trybie są; narzędzia dają ten sam efekt bez trybu globalnego.
- **Pola `XB` wprost w zakładce kontekstowej, bez palety.** Oszczędza miejsce po prawej, ale sześć pól liczbowych w ribbonie jest ciasne, a ribbon przestaje być paskiem narzędzi i staje się formularzem.

## Uzupełnienie (2026-07-30) — co weszło z #122, a co czeka

Ribbon powstał w całości: QAT, zakładki Home / View / Measure, zakładka kontekstowa, panele z tytułami u dołu i zwijanie do samych zakładek. Wypełniony jest jednak wyłącznie tym, co w tej chwili istnieje — reszta przycisków jest wyszarzona z podpowiedzią mówiącą, na co czeka. To świadomy wybór: pusty panel nie mówi nic, a wyszarzona komenda to dokładnie to, co AutoCAD robi z komendą, która w danym momencie nie ma zastosowania.

Aktywne dziś: widoczność per warstwa, tryby wyświetlania, płaszczyzny przekrojów, „zoom extents", zakładka kontekstowa (otwórz formularz, przybliż do zaznaczenia) i paleta właściwości. Wyszarzone do czasu #123–#127: undo/redo w QAT, cały panel Draw wraz z selektorem SURF-a, Modify, Snap, oba pomiary i „usuń" w zakładce kontekstowej.

Dwie rzeczy z tej decyzji przesunięto jawnie, bo obie zależą od #123:

- **Paleta właściwości jest tylko do odczytu.** Wpisanie współrzędnej ma emitować komendę edycji — a strumień komend, jego walidacja i historia to #123. Zapis wprost do `Fds` w międzyczasie omijałby historię, którą tamto issue wprowadza, i wymagałby pełnego `render()`, co ADR-0004 wyklucza.
- **Licznik ostrzeżeń o regułach FDS nie trafił na status bar.** W aplikacji nie ma dziś żadnej walidacji reguł FDS; powstaje ona w #123. Współrzędne kursora i aktywna siatka `&MESH` z krokiem — są.

Interfejs biblioteki dla hosta to `SceneViewService` (warstwy, przełączniki wyświetlania, przekroje, kamera) obok istniejącego `SmokeviewApiService` (rysowanie sceny). Rozdzielone, bo pierwszy dotyczy prezentacji, drugi treści sceny; oba są publiczne i wołane tak samo przez ribbon i przez pasek standalone viewera.
