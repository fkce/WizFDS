# ADR-0007: Wąskie strumienie dla stanu, na który trzeba reagować; `getMain()` zostaje mechanizmem wstrzykiwania referencji

- **Data:** 2026-07-27
- **Status:** zaakceptowana
- **Dotyczy:** `projects/wizfds/src/app/services/main`, konsumenci `MainService.getMain()`

## Kontekst

`CLAUDE.md` opisuje `MainService` jako centralny magazyn stanu: *„All services subscribe to it via `mainSubject` BehaviorSubject"*. Kontrakt nie działa — `mainSubject.next()` nie jest wywołane nigdzie w aplikacji. `BehaviorSubject` odtwarza bieżącą wartość każdemu nowemu subskrybentowi, więc każda z 38 subskrypcji `getMain()` dostaje instancję `Main` dokładnie raz, w momencie subskrypcji, i nigdy więcej.

Stan mimo to dociera do konsumentów, bo `Main` jest mutowany w miejscu, a wszyscy trzymają referencję do tego samego obiektu. Punkty mutacji, w których subskrybenci powinni zostać powiadomieni i nie są: `fds-scenario.service.ts:38,95`, `main.service.ts:35-44` (`getSettings()`), `projects.component.ts:167,174,229,279`.

Rozstrzygające dla decyzji jest to, **jak** ci konsumenci używają subskrypcji. 37 z 38 to dosłownie ten sam jednolinijkowiec:

```ts
this.mainSub = this.mainService.getMain().subscribe(main => this.main = main);
```

Nikt nie reaguje na zmianę. Wszyscy chwytają referencję i czytają z niej pola leniwie — w szablonie albo w metodzie wywołanej z interakcji użytkownika. To nie jest 38 zepsutych subskrypcji, tylko 38 razy powtórzony sposób wstrzyknięcia referencji, przebrany za strumień.

Pierwszym konsumentem, który musi faktycznie **zareagować**, jest podgląd 3D: scena bywa gotowa zanim scenariusz się doczyta, a sięgnięcie po `fdsObject` rzuca i zostawia puste płótno. Wobec braku emisji dostał obejście — odpytywanie pola co 250 ms (`visualize.component.ts`, wprowadzone razem z migracją na CSG2).

## Decyzja

**Dodajemy wąskie strumienie dla stanu, na który trzeba reagować. Nie emitujemy całego `Main` i nie ruszamy 37 istniejących subskrypcji.**

1. `MainService` dostaje metody mutujące dla stanu obserwowalnego — zaczynamy od `setCurrentFdsScenario()`. Metoda przypisuje pole i emituje.
2. Obok niej stoi strumień `currentFdsScenario$`, wystawiony przez `asObservable()`.
3. Wszystkie punkty mutacji tego pola przechodzą przez metodę zamiast przypisywać bezpośrednio — sześć miejsc, nie trzydzieści osiem.
4. Konsumenci, którzy muszą reagować, subskrybują wąski strumień. Podgląd 3D traci odpytywanie i jego timeout.
5. `getMain()` zostaje bez zmian, ale jego opis w `CLAUDE.md` jest korygowany: to mechanizm wstrzykiwania referencji do współdzielonego `Main`, nie strumień zmian.

Kolejne pola (`currentProject`, `settings`) dostają ten sam zabieg dopiero wtedy, gdy pojawi się konsument, który musi na nie reagować. Nie robimy tego z góry.

## Konsekwencje

**Pozytywne**
- Zmiana jest mała i zamknięta: sześć punktów mutacji, jeden przepięty konsument, zero ruchu w 37 pozostałych.
- Konsument reaktywny dostaje strumień, który coś znaczy — emisja zachodzi wtedy i tylko wtedy, gdy scenariusz się zmienił.
- Znika odpytywanie z warstwy widoku, a wraz z nim pytanie „jak długo czekać, zanim uznamy, że scenariusz nie przyjdzie".
- `MainService` przestaje kłamać w dokumentacji, bez przepisywania aplikacji.

**Negatywne / do obsłużenia**
- Przez jakiś czas współistnieją dwa mechanizmy: `getMain()` dla czytających leniwie i wąskie strumienie dla reagujących. Granica musi być opisana, inaczej nowy kod będzie wybierał losowo.
- Przypisanie `main.currentFdsScenario` z pominięciem settera nadal jest możliwe i nadal cicho pominie emisję. Docelowo pole powinno stać się niedostępne do zapisu z zewnątrz; na razie pilnuje tego tylko konwencja i przegląd kodu.
- Decyzja nie rozwiązuje `getSettings()`, które przepisuje osiem pól z osobna — jeśli kiedyś ktoś będzie musiał zareagować na zmianę ustawień, wróci ten sam problem.

## Rozważone alternatywy

- **Emitowanie całego `Main` z każdego punktu mutacji.** Dosłownie honoruje obecny opis w `CLAUDE.md`, ale dla 37 konsumentów jest operacją pustą — `next(this.main)` wręcza tę samą referencję, którą już mają. Ponieważ obiekt jest mutowany w miejscu, `distinctUntilChanged` nie ma czego porównać, a każdy konsument chcący wykryć zmianę musiałby porównywać pola ręcznie. Utrwala mylące API zamiast je naprawić.
- **Uznanie współdzielonej referencji za wzorzec docelowy i poprawienie samej dokumentacji.** Najtańsze i uczciwe wobec 37 konsumentów, którym to wystarcza. Odrzucone, bo każdy kolejny konsument reaktywny dostawałby własne obejście, a jedno już mamy.
- **Odroczenie do Phase 1 (#85).** Kuszące, bo cykl życia sceny w bibliotece i kontrakt „scenariusz się zmienił" w aplikacji to dwie strony tej samej granicy (ADR-0004). Odrzucone, bo zakres okazał się na tyle mały, że nie ma czego łączyć — a #85 zacznie się od czystszej podstawy.
