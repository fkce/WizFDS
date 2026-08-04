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
Trwa gest → przerywa gest. Gestu nie ma → czyści zaznaczenie w aplikacji,
tak jak klik w pustkę. Przy okazji zdejmuje obrys hovera — do następnego
ruchu myszy. Nie działa podczas pisania w polu formularza — tam Escape
należy do pola.
_Avoid_: anulowanie (bez wskazania, czego)

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
