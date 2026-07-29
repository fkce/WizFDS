# ADR-0008: Urządzenia rysowane rozpoznawalnymi prymitywami, nie obiektami SmokeView

- **Data:** 2026-07-29
- **Status:** zaakceptowana
- **Dotyczy:** `projects/web-smokeview-lib`, `projects/wizfds` (`SceneInputService`)
- **Kontekst nadrzędny:** [#81](https://github.com/fkce/WizFDS/issues/81) faza 4, [ADR-0006](0006-hybrydowa-reprezentacja-gpu.md)

## Kontekst

`&DEVC` to najczęściej proszony brakujący element podglądu — czujki, tryskacze, termopary. Trzeba było rozstrzygnąć dwie rzeczy: **jak** je rysować i **skąd wiedzieć, czym są**.

### Jak rysuje je SmokeView

SmokeView nie ma wbudowanych kształtów urządzeń. Ma **własny język definicji obiektów** (`smv_objects.tex` w podręczniku, `readobject.c` i `IOobjects.c` w źródłach): pliki `.svo` opisują urządzenie ciągiem poleceń rysujących ze stosem argumentów — `1.0 0.0 0.0 setcolor 0.1 0.05 drawdisk`. Obiekty są parametryzowane wartościami z `&PROP`, a użytkownik może dodać własne.

Odwzorowanie tego oznacza napisanie interpretera tego języka. To realna praca i własna klasa błędów, a jedynym jego czytelnikiem byłby nasz podgląd.

### Skąd wiedzieć, czym jest urządzenie

Naturalnym źródłem jest `&PROP` i jego `SMOKEVIEW_ID` — tak robi SmokeView. **W WizFDS to pole nie działa end-to-end:**

- formularz urządzenia (`device.component.html`) w ogóle nie pozwala wskazać `&PROP`,
- `JsonFdsService.devcAmper()` nie zapisuje `PROP_ID` do pliku `.fds`,
- resolver w `Devc` ma błąd — `find(props, elem => elem.id == prop)` porównuje z `prop`, czyli ze zmienną, która jest w tym momencie jeszcze niezdefiniowana — więc `prop_id` po wczytaniu scenariusza jest zawsze `undefined`.

Czyli marker odczytany z `&PROP` byłby markerem odczytanym z niczego.

## Decyzja

**Kształt: jeden rozpoznawalny prymityw na rodzaj urządzenia**, nie interpreter obiektów SMV.

| Rodzaj | Kształt |
|---|---|
| `sensor` | kula |
| `smoke detector` | płaski dysk (tak wygląda na suficie) |
| `nozzle` | stożek, szeroki u góry — pokazuje, w którą stronę tryska |
| `sprinkler` | korpus pod talerzykiem deflektora |

Deflektor jest tym, co odróżnia tryskacz od dyszy na pierwszy rzut oka — i tym, po czym rozpoznaje się tryskacz na rysunku.

**Źródło rodzaju: `QUANTITY`, które urządzenie mierzy**, nie `&PROP`. Mapowanie żyje w `SceneInputService` (to aplikacja jest źródłem prawdy, ADR-0004): `SPRINKLER LINK TEMPERATURE` i `ACTUATED SPRINKLERS` → tryskacz, `CHAMBER OBSCURATION` i `PATH OBSCURATION` → czujka dymu, reszta → sensor.

**Rozmiar: fizyczny, z podłogą proporcjonalną do modelu** — `max(0,3 m; 0,004 × rozciągłość)`. Sam rozmiar fizyczny ginie w czterystumetrowym tunelu; sam proporcjonalny dałby tam marker sześciometrowy. Ta sama logika co strzałki jetfanów.

**Reprezentacja GPU: pula thin instances na rodzaj** (ADR-0006). Marker to ta sama bryła przy każdym urządzeniu danego rodzaju, z dokładnością do położenia — modelowy przypadek instancjonowania. `BoxInstancePool` przyjmuje więc kształt bazowy jako parametr: pozycjonowanie nadal idzie przez pudełko, zmienia się tylko geometria w środku.

Cztery sposoby, na jakie `&DEVC` zajmuje przestrzeń, to **cztery różne rysunki**, nie jeden rysunek w czterech rozmiarach:

| `geometrical_type` | Rysunek |
|---|---|
| `point` | marker wg rodzaju, pula instancji |
| `linear` | belka wzdłuż odcinka, pula pudełek |
| `plane` | prostokąt, `PlaneBatch` |
| `volume` | pudełko z obrysem, pula pudełek |

Urządzenie liniowe ma dwa boki bez rozciągłości; są rozwierane do ułamka markera, żeby belka była widoczna i klikalna. Jej własna długość zostaje nietknięta.

## Konsekwencje

**Pozytywne**
- Podgląd urządzeń bez interpretera obcego języka i bez naprawiania trzech zepsutych ogniw `&PROP` naraz.
- Rodzaj urządzenia czytany z danych, które realnie trafiają do pliku `.fds`.
- Kształty markerów to czyste funkcje bez zależności — dodanie kolejnego to jeden wpis w `DEVC_MARKER_SHAPES`.

**Negatywne / do obsłużenia**
- Podgląd **nie wygląda** jak SmokeView dla urządzeń. Świadomie: ma być czytelny, nie identyczny.
- `nozzle` prawie nie wystąpi, bo żadne `QUANTITY` na niego nie wskazuje — kształt czeka na moment, w którym `&PROP` zacznie działać.
- Gdy `&PROP` zostanie naprawione (formularz, zapis `PROP_ID`, resolver), `SMOKEVIEW_ID` powinno **wyprzedzać** `QUANTITY` jako źródło rodzaju. Mapa w `SceneInputService` zostaje wtedy jako fallback.

## Rozważone alternatywy

- **Jeden marker dla wszystkich, kolor różnicuje rodzaj.** Najprostsze, ale użytkownik nie odróżni tryskacza od czujki bez klikania — a odróżnienie ich to właśnie powód, dla którego prosił o ten podgląd.
- **Interpreter obiektów SMV.** Najwierniejsze i jedyne, które obsłużyłoby obiekty własne użytkownika. Do rozważenia, gdyby ktoś tego zażądał; dziś nikt.
