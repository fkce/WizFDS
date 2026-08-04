# ADR-0012: Mapa przycisków kamery w widoku 3D

- **Data:** 2026-08-04
- **Status:** zaakceptowana
- **Dotyczy:** `projects/web-smokeview-lib/src/lib/services/babylon`, `projects/web-smokeview-lib/src/lib/views/smokeview`

## Kontekst

Lewy przycisk myszy robił w widoku 3D dwie rzeczy: drag na uchwycie ciągnął
element, drag poza uchwytem obracał kamerę. Rozstrzyganie, którą z nich znaczy
dany nacisk, wymagało osobnej maszynerii (odpinanie kamery przy shifcie
i przy chwycie uchwytu), a i tak chybienie uchwytu obracało widok. Do tego
kamera Babylona domyślnie ma inercję i zoom do środka widoku — odczucia
z gry, nie z narzędzia CAD, w którym użytkownicy WizFDS pracują na co dzień.

## Decyzja

Jedna zasada: **lewy przycisk = edycja, środkowy = kamera, prawy =
zarezerwowany.** Fizyka kamery jak w AutoCAD:

| Wejście | Działanie |
|---|---|
| **Środkowy (przytrzymany)** | pan 1:1 — chwycony punkt jedzie przyklejony do kursora |
| **Shift+środkowy** | orbita wokół bieżącego celu kamery |
| **Dwuklik środkowego** | zoom extents: kadr na cały model, kierunek patrzenia bez zmian |
| **Kółko** | zoom skokowy 15% na ząbek, do kursora; cel orbity podąża za zoomem |
| **Lewy** | wyłącznie zaznaczanie i uchwyty — kamera go nie słucha |
| **Prawy** | nic; zarezerwowany na przyszłe menu kontekstowe |

Inercja wynosi zero dla wszystkich ruchów: mysz stop = kamera stop. Limit
przybliżenia to 2% rozmiaru modelu — tuż nad płaszczyzną bliskiego
przycinania z ADR-0002, której ta decyzja nie rusza.

Zoom procentowy i pan 1:1 liczą się z bieżącego kadru, więc przestaje być
potrzebne skalowanie czułości kółka i pana rozmiarem modelu (ADR-0002 nadal
skaluje near/far i limity promienia).

## Konsekwencje

- Maszyneria kontestu lewego przycisku znika: kamera nigdy nie konkuruje
  o wskaźnik, `setCameraControl()` i shift-jako-asekuracja są zbędne.
  Wiersz shift w ADR-0011 traci znaczenie „zabiera kamerze wskaźnik".
- Ctrl+lewy przestaje panoramować — ctrl należy w całości do zaznaczania
  i modyfikatorów gestu (ADR-0011); znika dwuznaczność ctrl+klik
  (rozszerz zaznaczenie) kontra ctrl+drag (pan).
- Lewy drag na pustym tle jest wolny — miejsce na przyszłe zaznaczanie oknem.
- Kto przywykł do obracania lewym przyciskiem (PyroSim, przeglądarki 3D),
  musi przesiąść się na shift+środkowy.

## Rozważone alternatywy

- **Hybryda: lewy dalej orbituje, shift+środkowy dodatkowo** — zostawia całą
  maszynerię kontestu i wyjątek „lewy orbituje, chyba że trafisz w uchwyt";
  odrzucona na rzecz jednej zasady łatwej do zapamiętania.
- **Pan także pod ctrl+lewym (jak dotąd) i pod prawym** — trzy sposoby na to
  samo mylą, ctrl koliduje z zaznaczaniem, a prawy jest wart zachowania na
  menu kontekstowe.
- **Pivot orbity pod kursorem (Fusion 360, Blender)** — wymaga picku na
  starcie każdej orbity i fallbacku przy trafieniu w pustkę; zoom do kursora
  i tak prowadzi cel za użytkownikiem. Da się dołożyć później bez łamania
  czegokolwiek.
