# Płat rysowany z jednej strony

Płat BNDF (zob. „Płat", „Ściana domeny" w `CONTEXT.md`) niesie w nagłówku `ior`,
czyli oś, do której jest prostopadły, i stronę, w którą patrzy: u ściany obsta
na zewnątrz bryły, u ściany domeny do wnętrza domeny. Rysujemy go **wyłącznie
z tej strony** — trójkąty nawijamy zgodnie z `ior`, a materiał odrzuca tylne
ściany. SmokeView rysuje boundary dwustronnie, więc to jest nasza świadoma
różnica i bez zapisu wyglądałaby na błąd.

**Powód jest taki, że inaczej pierwsze kliknięcie w BNDF zasłania model.**
Płaty ścian domeny pokrywają szczelnie podłogę, sufit i wszystkie cztery
ściany — FDS wystawia je domyślnie (`BNDF_DEFAULT`) i to nie są śmieci: pomija
przy tym styki siatek, otwory i kafle zakryte bryłami, więc zostaje prawdziwa
przegroda, a palnik postawiony na podłodze jako `&VENT` leży właśnie tam.
Dwustronny płat maluje z tego zamknięte pudło i użytkownik, który chciał
zobaczyć temperaturę ścian pomieszczenia, dostaje kolorowy sześcian. Przy
jednostronnym te same płaty, oglądane z zewnątrz, patrzą od widza i wypadają
same — zostaje widok do środka: podłoga, dalsze ściany i ściany obstów. Kamera
we wnętrzu domeny widzi wszystko, bo tam płaty patrzą na nią.

Odrzucono dwa warianty. **Dwustronnie i niech użytkownik przycina** jest tym,
co robi SmokeView; działa, ale każe wykonać trzy ruchy suwakami, zanim wynik
w ogóle da się obejrzeć, i to za każdym razem. **Dwustronnie plus przełącznik
ścian domeny** kupuje ten sam efekt jednym kliknięciem, ale kosztuje nowy stan
warstwy, nowe hasło w słowniku i pytanie, w którym stanie ma się zaczynać —
a odpowiedź brzmiałaby „ukryte", czyli dokładnie to, co jednostronność robi
sama i lokalnie. Kierunek jest w danych; przełącznik byłby wymyślaniem tej
informacji drugi raz.

**Cena: kierunek zależy od konwencji silnika, a tej nie da się sprawdzić
testem.** Geometria pinuje tyle, ile jest niezależne od Babylona — trójkąty
nawijamy tak, żeby reguła prawej dłoni wskazywała stronę `ior`, i to stwierdza
spec `buildBoundary`, licząc iloczyn wektorowy krawędzi. Który obrót silnik
uzna za przedni, jest już własnością materiału i ustawień sceny, a biblioteka
jest WebGPU-only (ADR-0001), więc Karma nie ma czym tego wykonać. Gdyby
konwencja okazała się odwrotna, objaw jest jaskrawy i natychmiastowy — model
wygląda na wywrócony na lewą stronę — a poprawka to jedno pole materiału
w `BndfService`. Ryzyko przyjęte świadomie: alternatywą było zgadywanie
konwencji w kodzie i nazywanie tego pewnością.

Konsekwencja dla reszty Fazy 6 (#89): to rozstrzygnięcie dotyczy wyłącznie
formatów przyklejonych do geometrii. Slice zostaje dwustronny — jego
płaszczyzna jest cięciem przez gaz, nie powierzchnią czegokolwiek, i ma
dwie równie prawdziwe strony.
