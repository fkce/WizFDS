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

Aktywne dziś: widoczność per warstwa, tryby wyświetlania, płaszczyzny przekrojów, kamera („zoom extents" plus widoki standardowe Top / Front / Right / Iso, te same przeloty co kliknięcie ściany ViewCube'a), zakładka kontekstowa (otwórz formularz, przybliż do zaznaczenia) i paleta właściwości. Wyszarzone do czasu #123–#127: undo/redo w QAT, cały panel Draw wraz z selektorem SURF-a, Modify, Snap, oba pomiary i „usuń" w zakładce kontekstowej.

Dwie rzeczy z tej decyzji przesunięto jawnie, bo obie zależą od #123:

- **Paleta właściwości jest tylko do odczytu.** Wpisanie współrzędnej ma emitować komendę edycji — a strumień komend, jego walidacja i historia to #123. Zapis wprost do `Fds` w międzyczasie omijałby historię, którą tamto issue wprowadza, i wymagałby pełnego `render()`, co ADR-0004 wyklucza.
- **Licznik ostrzeżeń o regułach FDS nie trafił na status bar.** W aplikacji nie ma dziś żadnej walidacji reguł FDS; powstaje ona w #123. Współrzędne kursora i aktywna siatka `&MESH` z krokiem — są.

## Uzupełnienie (2026-07-30) — co odblokowało #123

Obie odłożone rzeczy weszły wraz z kanałem komend:

- **Paleta właściwości jest edytowalna.** Sześć pól `XB` emituje `setXb` — tę samą komendę, którą będzie emitował gizmo (#124) — więc współrzędna wpisana w palecie trafia na stos cofania i wywołuje przyrostowe przerysowanie, a nie pełny `render()`. Pola wracają do stanu modelu, gdy tekst nie czyta się jako liczba, i podążają za każdą zmianą zrobioną gdzie indziej.
- **Ostrzeżenia są w dwóch miejscach.** Treść w palecie, przy elemencie, którego dotyczy; licznik w status barze, obok współrzędnych kursora. Bursztynowe, nie czerwone — nic nie blokują (ADR-0009).

W QAT działa undo/redo, a przyciski nazywają operację („Undo Move"), nie „ostatnią zmianę" — bo zmiana z formularza nie przechodzi przez ten kanał i w historii jej nie ma. Odblokowało się też „usuń": kasowanie jest komendą nad zaznaczeniem i nie potrzebuje żadnego gestu, w odróżnieniu od Move i Resize, które czekają na #124. Reszta panelu Draw, Snap i oba pomiary — nadal wyszarzone, do #125–#127.

Interfejs biblioteki dla hosta to `SceneViewService` (warstwy, przełączniki wyświetlania, przekroje, kamera) obok istniejącego `SmokeviewApiService` (rysowanie sceny). Rozdzielone, bo pierwszy dotyczy prezentacji, drugi treści sceny; oba są publiczne i wołane tak samo przez ribbon i przez pasek standalone viewera.

## Uzupełnienie (2026-07-31) — co odblokowało #124

Panel Modify i panel Snap są żywe, a dynamic input istnieje.

- **Move i Resize to wybór manipulatora, nie tryb.** Trzy strzałki `PositionGizmo` i sześć własnych uchwytów ścian narysowane naraz byłyby nieczytelne, więc dwa przyciski wybierają między nimi. Zwykły klik nadal zaznacza, przeciągnięcie w pustce nadal obraca kamerę — globalnego trybu wciąż nie ma. Resize jest wyszarzony przy zaznaczeniu wielokrotnym, bo „która ściana którego elementu" nie jest pytaniem, na które sześć uchwytów odpowiada.
- **Snap to trzy niezależne przełączniki**, wypisane w kolejności, w jakiej snap ich próbuje: Corner, Edge, Grid. Wszystkie domyślnie włączone, tak jak OSNAP; ctrl zawiesza je na czas jednego gestu.
- **Dynamic input jest w bibliotece**, przy kursorze: `dx/dy/dz` przy przesuwaniu, zmieniana współrzędna przy ciągnięciu ściany. Tab przełącza pole, Enter zatwierdza, Esc anuluje cały gest, a wpisana liczba przejmuje pole od myszy — pozostałe pola dalej podążają za kursorem. Marker snapu rysowany jest w akcencie, a tryb, który złapał, jest nazwany w tym samym panelu.
- **Gizmo jest wyłączony, dopóki host go nie włączy.** `GizmoService.enabled` domyślnie `false`; ustawia je tylko `wizfds`. Standalone viewer nie ma `Fds`, do którego dałoby się zastosować komendę, ani niczego zapisanego na strumieniu komend — gest byłby tam przesunięciem obwódki, która wraca na miejsce po puszczeniu przycisku, a edycja w standalone viewerze jest świadomie poza zakresem (#88). Ten sam przełącznik i ten sam powód co `PickService.applyOwnPicks`.
- **Status bar nazywa siatkę, której edycja usłucha.** `ViewportStatusService` przestał jej szukać sam — dostaje ją gotową stamtąd, gdzie liczy się snap (ADR-0004).

Wyszarzone do czasu #125–#127 zostają: panel Draw wraz z selektorem SURF-a i oba pomiary.

## Uzupełnienie (2026-08-04) — co odblokowało #125

Panel Draw jest żywy, a Home stało się zakładką startową — tak jak w AutoCAD.

- **Rysowanie to gest, nie tryb.** Przycisk OBST/HOLE/VENT uruchamia
  `DrawToolService` w bibliotece; trzy kliknięcia (narożnik → przeciwległy
  narożnik podstawy → wysokość) emitują jedną komendę `create`, po czym
  narzędzie wyłącza się samo — zgodnie z regułą „narzędzia wyłączają się po
  zakończeniu albo Esc". VENT, będąc płaski, kończy się na kroku drugim,
  w płaszczyźnie powierzchni, na której wylądował pierwszy narożnik.
- **Selektor bieżącego SURF-a przełącza listę wraz z narzędziem**: OBST czerpie
  z `geometry.surfs`, VENT z `ventilation.surfs` (to dwie różne listy w modelu
  i id z jednej nie rozwiązuje się na drugiej), a przy HOLE jest wyszarzony —
  otwór nie ma powierzchni. Pierwsza pozycja INERT nie nazywa żadnego SURF-a,
  czyli daje dokładnie ten sam domyślny stan co `add()` w formularzu.
- **Dynamic input obsługuje każdy krok**: współrzędne bezwzględne pierwszego
  narożnika (`X/Y/Z`), delty podstawy w osiach płaszczyzny roboczej, wysokość.
  Panel jest ten sam co przy gizmo — dwie strumienie gestów zlewają się
  w komponencie kanwy, bo wskaźnik jest jeden.
- **Start rysowania porzuca zaznaczenie**, jak start komendy w AutoCAD —
  uchwyty gizmo to drag behaviours Babylona i narożnik celowany obok uchwytu
  zaczynałby przesunięcie zamiast lądować.
- **Świeżo narysowany element jest od razu zaznaczony** — aplikacja bierze
  `uuid` z odpowiedzi `apply()`, więc paleta właściwości i zakładka kontekstowa
  natychmiast go pokazują, tak jak `add()` w formularzu aktywuje nowy wiersz.

Wyszarzone do czasu #127 zostają oba pomiary.

## Uzupełnienie (2026-08-04) — co odblokowało #126

Panel Modify jest w komplecie: obok Move / Resize / Delete stoją Copy, Array
i Mirror — trzy komendy, które ta decyzja przewidziała od początku.

- **Copy** uzbraja następny gest gizma jako kopiujący; skrótem jest ctrl przy
  chwycie strzałki osi (aneks w ADR-0011).
- **Array i Mirror są budowane w zakładkach kontekstowych** (ARRAY / MIRROR):
  liczności i odstępy — albo oś, współrzędna płaszczyzny i „keep original" —
  wpisuje się w panelach, duchy pokazują wynik na żywo, OK zatwierdza jedną
  komendą (jedno wejście w historii, ADR-0009), Cancel i zmiana zaznaczenia
  zamykają budowniczego.
- Wskazanie płaszczyzny odbicia kliknięciem ze snapem odłożono: pole
  współrzędnej z presetami Min / Centre / Max pokrywa typowe przypadki;
  wskazanie punktu w kanwie wymaga narzędzia „wskaż punkt", którego biblioteka
  jeszcze nie ma.

## Uzupełnienie (2026-08-04) — pasek stanu o stałej podziałce

Pasek dostał to, co ma każdy przyrząd: skalę, która stoi. Do tej pory szerokość
każdego segmentu wynikała z treści, a treść zmienia się kilkanaście razy na
sekundę — `-12.35, 4.00, -0.75 m` jest węższe niż `3.20, 118.05, 2.50 m`, więc
cały rząd reflowował przy każdym ruchu myszą nad kanwą.

- **Slot na każdą oś, liczba wyrównana do prawej.** Siedem znaków na współrzędną
  (`-999.99`, czyli model do kilometra w każdą stronę), pięć na krok komórki
  (`0.125`), sześć na ID `&MESH` (`MESH12`, czyli domyślne nazewnictwo). Kropki
  dziesiętne stoją w jednej kolumnie, więc wartość przechodząca przez zero albo
  tracąca cyfrę nie rusza sąsiadów. Sloty są `min-width`, nie `width`: model
  większy od budżetu raz rozszerza slot, zamiast uciąć liczbę — przyrząd, który
  drgnie, bije przyrząd, który kłamie.
- **`.mono` dopiero teraz jest mono.** Klasa była w pasku od początku, ale
  `--font-mono` nie pojawiało się w nim ani razu i odczyty renderowały się
  proporcjonalną Fira Sans. Bez tego jednostka `ch`, w której wymierzone są
  wszystkie sloty, nie mierzy ani minusa, ani kropki, ani przecinka.
- **Slot liczy się w znakach, nie w `ch`.** `ch` to advance zera i nie wie nic
  o `letter-spacing: 0.02em`, którym pasek rozstrzela każdy znak. Zmierzone:
  slot `7ch` to 45,69 px, a `-999.99` zajmuje 47,22 px — segment puchłby dokładnie
  przy wartości, pod którą budżet był pisany. Stąd funkcja `slot($chars)`, która
  dolicza tracking; po niej szerokość segmentu kursora trzyma się w 222,70 →
  222,72 px na całym budżecie.
- **Ścieżka CAD jest jedynym polem, które ustępuje.** `flex: 0 1 auto` — kurczy
  się, nigdy nie rośnie, więc lewa grupa zostaje spakowana do lewej, a odczyty
  mają stałą pozycję od krawędzi. Wewnątrz niej ustępuje najpierw katalog, a
  nazwa pliku dopiero wtedy, gdy katalogu już nie ma (stosunek `flex-shrink`
  1000:1) — dwa rysunki w jednym folderze różnią się właśnie nazwą. „Ostatnia",
  a nie „nigdy": realne nazwy rysunków przekraczają czterdzieści znaków, a
  połowa, która nie oddaje nic, tylko przenosi przepełnienie w inne miejsce
  paska. Pełna ścieżka jest w tooltipie — tak samo jak pełne ID `&MESH`, gdy nie
  zmieści się w slocie.
- **Prawa grupa nie uczestniczy w kurczeniu.** Nie ma w niej nic elastycznego,
  więc ściśnięta poniżej swojej treści nie ucina jej wielokropkiem, tylko
  wypycha numer wersji poza pasek, gdzie zjada go `overflow: hidden` shella —
  wersja znikała po cichu. `flex: 0 0 auto` zostawia cały luz po lewej stronie.
- **Brak odczytu to nie brak siatki.** `ViewportStatusService.grid` jest `null`
  w obu przypadkach, a pasek mówił „no &MESH here" także wtedy, gdy kursor po
  prostu zjechał w pustkę — czyli twierdził coś nieprawdziwego o modelu. Kursor
  w pustce daje teraz kreski w tych samych slotach, a zdanie zostaje na wypadek,
  w którym siatki naprawdę nie ma. Segment trzyma przy tym szerokość pełnego
  odczytu, żeby krótszy komunikat nie pociągnął licznika ostrzeżeń za sobą.
  Termin **aktywna siatka** trafił do `CONTEXT.md`.
- **Etykiety po prawej mierzy przeglądarka.** Wszystkie stany segmentu („Saved" /
  „Unsaved" / „Autosave on" oraz „CAD connected" / „CAD offline") leżą w jednej
  komórce grida, nieaktywne z `visibility: hidden`. Segment jest zawsze szeroki
  na najdłuższą z nich, bez liczby dobranej ręcznie w `rem` — dopisanie czwartego
  stanu poszerzy slot samo, a `visibility: hidden` trzyma ukryte etykiety poza
  drzewem dostępności. Etykiety są przy tym trzymane blisko siebie długością:
  „Unsaved changes" było o połowę dłuższe od pozostałych dwóch i zostawiało
  26 px pustego pola, gdy segment pokazywał krótszy stan — czyli rezerwa
  przeciw drganiu zamieniała się w widoczną dziurę przed kolejną kreską. Stąd
  „Unsaved", tą samą frazą także w QAT ribbona, który pokazuje ten stan
  równocześnie. Zapas, który mimo to zostaje, leży na końcu etykiety, a nie po
  obu jej stronach: wyśrodkowanie próbowano i odrzucono, bo odsuwa tekst od
  kropki, która stoi przed nim i mówi, którego odczytu on dotyczy — para
  przestaje się czytać jako jedno.

Licznik ostrzeżeń świadomie bez slotu: stoi jako ostatni w lewej grupie, więc
jego szerokość niczego nie przesuwa. Pola kursora i siatki nadal znikają poza
widokiem 3D — to zmiana trasy, a nie reflow kilka razy na sekundę.

## Uzupełnienie (2026-08-05) — co odblokowało #127

Zakładka Measure jest w komplecie — ostatnie wyszarzone przyciski tej decyzji
ożyły — a pomiar niczego w scenariuszu nie zmienia: FDS nie ma encji wymiaru,
więc wszystko, co tu powstaje, jest stanem prezentacyjnym biblioteki
(ADR-0004) i nie jest nigdzie zapisywane.

- **Distance to narzędzie na serie, nie pojedynczy gest.** Dwa punkty ze
  snapem wolnym we wszystkich trzech osiach (pomiar narożnik–narożnik musi być
  dokładny), gumka i etykieta odległości przy kursorze między punktami, wynik
  na pasku stanu. W odróżnieniu od rysowania narzędzie **nie** wyłącza się po
  odpowiedzi — mierzy się seriami, a kończy je Esc, wraz z którym znika też
  zmierzona linia i odczyt. Klik w pustkę nie stawia punktu, tak jak nie
  stawia narożnika w geście rysowania. Zapadka ctrl obowiązuje jak wszędzie
  (ADR-0011); Escape ma pomiar na szczycie swojej warstwy.
- **Wynik na pasku stanu w slotach o stałej podziałce**: odległość
  (`999.999`, 7 znaków) i składowe `Δ dx, dy, dz` (`-999.999`, 8 znaków),
  wszystko z dokładnością milimetra, jak dynamic input. Segment stoi jako
  ostatni w lewej grupie — pojawia się z narzędziem i niczego obok nie rusza —
  a zanim padnie pierwsza odpowiedź, pokazuje kreski w tych samych slotach.
- **Dimensions to przełącznik etykiet rozmiarów zaznaczenia**: szerokość,
  głębokość i wysokość odczytane wprost z `XB`, po trzy billboardy na element,
  zakotwiczone na krawędziach, które mierzą, o stałej wysokości ekranowej.
  Rysowane w bibliotece (etykiety wymiarów były jej przypisane od pierwszej
  wersji tej decyzji) i podążające za gizmem: w trakcie gestu ze strumienia
  gestów, po nim z odrysowanego zaznaczenia. Przełącznik, bo etykiety są
  szumem, kiedy nie są potrzebne — i nie jest nigdzie utrwalany.
