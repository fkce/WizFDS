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
