# Szew ładowania wyników: jedna fasada zamiast czytnika w hoście

Ładowaniem grup wyników steruje jeden serwis biblioteki — `ResultsLoaderService`
— i to jedyna rzecz, o którą host pyta w tej sprawie. Rozdziela grupę do
czytnika jej formatu, rozsyła otwarcie nowej sprawy i zeruje przy tym oś czasu
oraz skalę. Do #152 robił to `SliceService` wprost z obu hostów, co było
w porządku przy jednym formacie i przestaje być przy drugim.

**Rozdział jest logiką dziedziny, nie pikselem.** Który czytnik obsługuje dane
bajty, wynika z formatu, a nie z tego, jak host nazywa zakładkę — więc mieszka
tam, gdzie `groupResults()`, po tej samej stronie granicy z ADR-0010: słowa
i ikony zostają w hoście, grupowanie i rozdział w bibliotece. Odrzucono `switch`
po `group.files[0].kind` w komponencie: po #153–#155 byłoby to pięć gałęzi
w dwóch hostach, utrzymywanych osobno, a webSmokeview ma się zachowywać tak
samo jak aplikacja, nie podobnie.

**Otwarcie sprawy dostało wreszcie swoje miejsce.** `TimelineService.
resetForNewCase()` i `QuantityScaleService.resetForNewCase()` wołał
`SliceService.setCase()`, bo SLCF był jedynym formatem, który wiedział, że
zmienił się przypadek — dług zapisany na końcu ADR-0018 i powtórzony
w ADR-0019. Drugi format z własnym `setCase()` powtórzyłby te wywołania,
a powtórzone w trakcie sesji cofają zegar pod palcem użytkownika. Teraz woła
je fasada, raz, po rozesłaniu sprawy do czytników — i spec sprawdza właśnie to
„raz", bo błąd jest tu cichy: nic się nie wywala, tylko obraz skacze na
początek.

**Czytniki są wstrzykiwane, a nie rejestrują się same** — i to jest odstępstwo
od wzorca, którym żyją `TimelineClient` i `ScaleClient`, więc wymaga
uzasadnienia. Tamta rejestracja w konstruktorze działa tylko dlatego, że coś
w ogóle każe Angularowi zbudować `SliceService`, a tym czymś był host, który go
wstrzykiwał. Z chwilą, gdy hosty przestają nazywać czytniki po imieniu, nikt
ich nie tworzy, więc rejestrowałby się nikt — i klik w grupę BNDF trafiałby
w pustkę, cicho. Jawny konstruktor fasady jest jedynym miejscem, które musi
znać listę formatów, i jednocześnie tym, co gwarantuje, że czytnik istnieje
(a więc zdążył zapisać się na oś i na skalę), zanim panel się narysuje.
Odrzucono token `multi:true`: lista przenosi się wtedy do modułu, dochodzi
warstwa pośrednia, a gwarancja powstania i tak zależy od tego, czy ktoś ten
provider zarejestrował.

Konsekwencje dla reszty Fazy 6 (#89): nowy format to jeden parametr
konstruktora fasady, jedna gałąź w `readerFor()` i jeden predykat obok
`isLoadableSliceGroup`. Hosty nie zmieniają się wcale. Cena jest znana i mała:
fasada zna nazwy czytników, więc zależy od nich w jedną stronę — próba
odwrócenia tego (czytnik zna fasadę) wraca dokładnie do problemu, kto tworzy
czytnik.
