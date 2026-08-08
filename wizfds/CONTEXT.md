# WizFDS

GUI do FDS: aplikacja webowa do warunków brzegowych i scenariuszy oraz moduł
wizualizacji 3D (web-smokeview-lib), w którym geometrię się ogląda i edytuje.
Słownik obejmuje język edycji w widoku 3D; terminologia FDS (namelisty, XB,
&MESH) należy do FDS i nie jest tu powtarzana.

## Language

### Edycja w widoku 3D

**Gest**:
Jedna nieprzerwana manipulacja elementem — od chwytu do puszczenia,
zatwierdzenia albo Escape. Jeden gest kończy się co najwyżej jedną komendą
w historii.
_Avoid_: operacja, transformacja

**Uchwyt (grip)**:
Mały lazurowy znacznik o stałej wielkości ekranowej, za który zaczyna się
gest. Ruch elementu możliwy jest wyłącznie za uchwyt.
_Avoid_: gizmo (o pojedynczym znaczniku), handle w polskim tekście

**Kwadrat planu**:
Uchwyt przesuwania leżący na środku podstawy zaznaczenia; ciągnie element
po planie XY, a chwycony z ctrl — w pionie.
_Avoid_: środkowy uchwyt, base grip

**Gest planarny**:
Przesunięcie w płaszczyźnie XY za kwadrat planu.

**Gest pionowy**:
Przesunięcie wzdłuż osi z, otwierane chwytem kwadratu planu z wciśniętym
ctrl. Rysuje pionową prowadnicę przez kotwicę.
_Avoid_: ruch w Z myszą (opisowo)

**Kotwica**:
Punkt, w którym stoi kwadrat planu: środek podstawy wspólnego obrysu
zaznaczenia.
_Avoid_: centrum selekcji

**Seria (nudge)**:
Ciąg wciśnięć klawiszy strzałek/PgUp/PgDn bez puszczenia ostatniego z nich;
przesuwa o pełne komórki siatki i jest jednym gestem.
_Avoid_: krokowanie, przesuw klawiszowy

**Zapadka zawieszenia snapu**:
Ctrl dociśnięty w trakcie gestu wyłącza snap do końca tego gestu; puszczenie
ctrl niczego nie przywraca.
_Avoid_: tymczasowe wyłączenie snapu

**Dynamic input**:
Panel liczb jadący z kursorem podczas gestu; cyfry przejmują pole od myszy,
Tab przechodzi między polami, Enter zatwierdza.
_Avoid_: panel współrzędnych, HUD

**Gest rysowania**:
Trzykrokowe klikanie nowego elementu (gest `BOX` z AutoCAD-a): narożnik →
przeciwległy narożnik podstawy → wysokość. Płaski element (VENT) kończy się
na kroku drugim. Jeden gest to jedna komenda `create`; Escape porzuca całość,
narzędzie wyłącza się samo po zakończeniu.
_Avoid_: tryb rysowania (to gest, nie tryb)

**Lądowanie narożnika**:
Pierwszy narożnik gestu rysowania siada na powierzchni pod kursorem —
ścianie istniejącego obsta albo podłodze — a w pustce na podłodze
najbliższego MESH-a. Trafiona powierzchnia wyznacza płaszczyznę roboczą:
dla VENT-a płaszczyznę prostokąta, dla brył tylko wysokość podstawy
(podstawa bryły jest zawsze pozioma).
_Avoid_: projekcja kursora, raycast na podłogę (opisowo)

**Aktywna siatka**:
Siatka &MESH, do której zaokrągli się edycja w danym punkcie: najdrobniejsza
z siatek zawierających punkt, a poza nimi wszystkimi — najbliższa. Rozstrzyga
i snap, i to, co nazywa pasek stanu. Brak odczytu (kursor w pustce) to co
innego niż brak siatki (kursor na modelu, scenariusz bez &MESH).
_Avoid_: siatka pod kursorem (poza siatkami nadal jakaś obowiązuje)

**Seria pomiarowa**:
Narzędzie Distance po uruchomieniu mierzy parami punktów aż do Esc — nie
wyłącza się po odpowiedzi jak gest rysowania. Punkty łapią się snapem wolnym
we wszystkich osiach; wynik (odległość i `Δ dx/dy/dz`) stoi na pasku stanu,
a znika wraz z narzędziem. Klik w pustkę nie stawia punktu. Nic nie jest
zapisywane — FDS nie ma encji wymiaru.
_Avoid_: tryb pomiaru (to seria, nie tryb globalny), wymiarowanie (nic nie
powstaje w modelu)

**Etykiety wymiarów**:
Przełącznik Dimensions: szerokość, głębokość i wysokość każdego zaznaczonego
elementu odczytane z jego `XB`, zakotwiczone na krawędziach, które mierzą,
o stałej wysokości ekranowej. Podążają za gestem gizma i znikają z
zaznaczeniem. Stan prezentacyjny biblioteki, nigdzie nie utrwalany.
_Avoid_: wymiary elementu (odczyt, nie właściwość), adnotacje

**Bieżący SURF**:
Selektor w panelu Draw — odpowiednik warstwy bieżącej AutoCAD-a. Nowy
element dostaje wskazany &SURF w chwili zatwierdzenia; pozycja INERT nie
nazywa żadnej powierzchni (domyślne zachowanie FDS). OBST czerpie z listy
geometrii, VENT z listy wentylacji, HOLE nie ma SURF-a wcale.
_Avoid_: domyślny SURF (bieżący jest wyborem, nie domyślnością)

### Widoczność warstw i wskazywanie

**Warstwa**:
Typ elementów sceny pokazywany i ukrywany w całości z panelu Visibility
(MESH, OPEN, HOLE, VENT, FIRE, DEVC, GEOM, INIT, ZONE).
_Avoid_: grupa, kategoria elementów

**Stany warstwy (edges / filled / hidden)**:
Cykl przycisku widoczności: sam obrys → obrys z wypełnieniem → nic;
w tej kolejności. MESH, OPEN, HOLE, VENT, FIRE, INIT i ZONE są trójstanowe;
DEVC i GEOM mają tylko filled/hidden. Warstwy regionów (HOLE, INIT, ZONE)
startują w filled, pozostałe trójstanowe w edges.
_Avoid_: włączona/wyłączona (gubi stan pośredni)

**Reguła wskazywania**:
Kursor widzi tylko to, co widać. Warstwa hidden nie odpowiada na hover ani
klik — promień leci dalej. W stanie edges element łapie się wyłącznie przy
krawędzi obrysu (tolerancja ekranowa, niezależna od zoomu); w filled — całą
powierzchnią. Współrzędna paska stanu pochodzi z faktycznie trafionego
elementu. Ukrycie warstwy nie rusza istniejącego zaznaczenia ani jego
podświetlenia.
_Avoid_: pickowalność ukrytych elementów

**Reguła ustępowania**:
Typy obejmujące (MESH, INIT, ZONE) oddają pick temu, co solidne stoi za nimi
na linii promienia — klik w ścianę przez domenę trafia ścianę. Obowiązuje
także przy trafieniu w krawędź: krawędź MESH nie bije ściany, która na niej
leży.
_Avoid_: priorytet picku (opisowo)

**Escape (warstwowo)**:
Trwa seria pomiarowa → kończy ją, wraz z odczytem. Trwa gest → przerywa
gest. Gestu nie ma → czyści zaznaczenie w aplikacji, tak jak klik w pustkę.
Przy okazji zdejmuje obrys hovera — do następnego ruchu myszy. Nie działa
podczas pisania w polu formularza — tam Escape należy do pola.
_Avoid_: anulowanie (bez wskazania, czego)

### Wyniki symulacji (post-processing)

**Oś czasu**:
Wspólny zegar odtwarzania wyników w sekundach czasu symulacji. Biegnie od zera
do ostatniej klatki tego, co jest w tej chwili załadowane — należy do
oglądanych wyników, nie do scenariusza. Każdy format animowany pokazuje swoją
ostatnią klatkę o czasie ≤ t (schodkowo, bez interpolacji), a zanim ma
pierwszą klatkę, nie pokazuje nic: reguła nie ma tam odpowiedzi, a klatka
postawiona przed swoim czasem byłaby nieprawdą o symulacji wyglądającą jak
prawda. Tempo odtwarzania to mnożnik czasu rzeczywistego.
_Avoid_: player, globalny numer klatki (klatki należą do formatu, nie do osi)

**Zakres wielkości**:
Wspólne min/max mapowania wartość→kolor jednej wielkości fizycznej, a tę
poznaje się po nazwie i jednostce: TEMPERATURE ma jedną skalę w całej scenie,
niezależnie od położenia i formatu (slice czy boundary). Liczy się ze
wszystkich klatek wszystkich załadowanych plików tej wielkości i wyłącznie
z węzłów, które widać — wartość spod bryły nie ustawia skali temu, co się
ogląda. Jest funkcją tego, co załadowane w tej chwili: dołożenie grupy potrafi
go rozszerzyć, odładowanie zwęzić, i jedno, i drugie przemalowuje resztę.
Każdy koniec bywa nadpisany ręcznie i wtedy stoi, podczas gdy drugi dalej
podąża za danymi; wartości spoza zakresu klamrują się do końców.
_Avoid_: zakres pliku, zakres klatki

**Paleta**:
Uporządkowany ciąg kolorów, w który odwzorowuje się zakres wielkości. Nazwana
i wybierana osobno dla każdej wielkości — dwie wielkości na ekranie naraz
rozpoznaje się wtedy po samym kolorze plamy. Nasze palety to port domyślnych
colorbarów SmokeView.
_Avoid_: colorbar w polskim tekście, gradient, mapa kolorów

**Legenda**:
Pionowa skala przy krawędzi kanwy, po jednej na każdą załadowaną wielkość:
paleta, podpisane podziałki, nazwa wielkości i jednostka. Jest zarazem jedynym
miejscem, w którym nadpisuje się końce zakresu i wybiera paletę, i mówi,
kiedy dane sięgają poza koniec ustawiony ręcznie.
_Avoid_: colorbar (to paleta, nie legenda), pasek skali

**Katalog wyników**:
Miejsce, z którego viewer bierze `.smv` i pliki wynikowe: w wizfds lokalny
folder wskazany przez użytkownika, w webSmokeview katalog serwowany przez
backend. `.smv` jest spisem treści katalogu wyników — ale wpis spisu bywa
niedostępny: `.smv` potrafi wymieniać pliki, których w katalogu nie ma
(przerwana symulacja, częściowa kopia); dostępność i rozmiar sprawdza się
przed ładowaniem.
_Avoid_: upload wyników (nic nie jest wysyłane na serwer)

**Grupa wielkości**:
Pliki jednej wielkości fizycznej (dla slice także jednego położenia) ze
wszystkich siatek; jednostka listowania i ładowania wyników.
_Avoid_: plik wyniku (plik to odłamek per siatka, nie rzecz, którą się
ogląda)

**Blank**:
Węzeł wyniku, za którym nie ma nic prawdziwego do pokazania, więc się go nie
rysuje ani nie liczy do zakresu wielkości. Na slice'ie to węzeł leżący
wewnątrz geometrii (OBST), z przełącznikiem ich pokazania; na płacie — węzeł,
za którym nie ma komórki ściany, bo zasłania ją inna bryła, a tam FDS wpisuje
wartość otoczenia i pokazywać jej nie ma po co, więc nie ma i przełącznika.
Zasłaniają tylko OBST-y — GEOM nie uczestniczy.
_Avoid_: hole w slice'ie (HOLE to namelist FDS), maska

**Płat**:
Prostokątny kawałek powierzchni, na którym FDS zapisuje wielkość brzegową:
ściana obsta albo ściana domeny. Ma stronę, w którą patrzy, i widać go
wyłącznie z niej. Nie jest jednostką oglądania — tą pozostaje grupa
wielkości; pojedynczego płata się nie wybiera ani nie gasi. Wielkość brzegowa
jest oglądana **pojedynczo**: wszystkie malują te same lica, więc druga
przykryłaby pierwszą, a nie stanęła obok niej — w przeciwieństwie do slice'ów,
które wiszą w różnych położeniach i mogą być na ekranie razem.
_Avoid_: kafelek, ścianka, patch w polskim tekście

**Ściana domeny**:
Płat leżący na zewnętrznej ścianie siatki, a nie na bryle — podłoga i ściany
modelu. Patrzy do wnętrza domeny, więc oglądana z zewnątrz ustępuje i pokazuje,
co jest w środku. FDS nie zapisuje takich płatów tam, gdzie stykają się siatki,
ani na otworach, więc to zawsze prawdziwa przegroda — a palnik postawiony na
podłodze jako &VENT leży właśnie tutaj.
_Avoid_: ściana siatki (siatka to &MESH), obrys domeny

### Nawigacja kamerą

**Pan**:
Przesunięcie widoku środkowym przyciskiem, ściśle 1:1 — chwycony punkt
modelu jedzie przyklejony do kursora aż do puszczenia.
_Avoid_: przesuwanie mapy, scroll widoku

**Orbita**:
Obrót kamery wokół jej bieżącego celu, pod shift+środkowym przyciskiem.
_Avoid_: rotacja widoku, obracanie sceny

**Zoom do kursora**:
Skokowe zbliżenie kółkiem, procent odległości na ząbek; punkt pod kursorem
zostaje pod kursorem, a cel orbity podąża za zoomem.
_Avoid_: przybliżanie do środka ekranu

**Zoom extents**:
Kadr na cały model bez zmiany kierunku patrzenia; dwuklik środkowego
przycisku. Kliknięcie w view cube to co innego — ustawia też kierunek.
_Avoid_: dopasowanie widoku, fit
