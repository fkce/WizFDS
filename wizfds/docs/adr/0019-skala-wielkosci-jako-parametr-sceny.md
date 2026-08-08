# Skala wielkości: parametr sceny, nie własność pliku

Mapowanie wartość→kolor należy do wielkości fizycznej, a nie do pliku ani do
grupy, która go wystawiła. Jeden serwis biblioteki trzyma dla każdej wielkości
zakres i paletę (zob. „Zakres wielkości", „Paleta", „Legenda" w `CONTEXT.md`),
a formaty wyników są jego klientami — tak samo, jak są klientami osi czasu.
Ciąg dalszy ADR-0017, który zdjął zakres z danych i zrobił z niego uniform;
tutaj rozstrzyga się, skąd ten uniform bierze liczby. Pięć rzeczy w tej
budowie jest na tyle nieoczywistych, że bez zapisu wyglądałyby na przypadek.

**Wielkość poznaje się po nazwie i jednostce** — po parze `longLabel|unit`
z `.smv`. Etykieta grupy do tego nie służy, bo niesie także położenie
(`TEMPERATURE, K=12`) i sufiks `(cell)`: to jednostka *ładowania*, nie
tożsamość zjawiska. Sama nazwa też nie wystarcza — dwa pliki nazwane tak samo,
a zapisane w różnych jednostkach, dostałyby jedną skalę, a wtedy kolor mówi
nieprawdę o liczbie, którą przedstawia. Jednostka w parze kosztuje jedno
ryzyko odwrotne: niespójny zapis jednostki rozszczepi jedną wielkość na dwie
skale. FDS pisze jednostki ze swoich tablic, więc to ryzyko jest mniejsze niż
scalenie °C z K.

**Zakres jest dokładną agregacją tego, co załadowane — kurczy się tak samo,
jak rośnie.** Liczy się ze wszystkich klatek wszystkich załadowanych plików
wielkości; nic, czego nie widać, nie jest w tym celu czytane, bo pojedyncza
grupa slice to dziesiątki megabajtów na siatkę, a wielkość potrafi mieć
kilkanaście płaszczyzn. Konsekwencja jest zamierzona i widoczna: dołożenie
gorętszej płaszczyzny przemalowuje tę, która już stoi na ekranie — bez tego
„wspólna skala" nie jest wspólna. Odrzucono wariant ze znacznikiem wysokiej
wody, w którym zakres tylko rośnie. Jest stabilniejszy — zdjęcie czegoś
z ekranu nigdy nie zmienia koloru reszty — ale kupuje tę stabilność stanem,
którego nie widać: scena zostaje blada, a przyczyna leży w tym, co było
załadowane kwadrans temu, i czyści ją wyłącznie reset albo nowa sprawa.
Zakres jako czysta funkcja zbioru załadowanych grup nie ma historii, więc nie
ma też czego zapominać ani czego zerować.

**Węzły blank nie liczą się do zakresu.** Wartości w węzłach leżących wewnątrz
OBST-ów są zapisane, ale wewnątrz bryły nikt tam fazy gazowej nie rozwiązuje;
domyślnie ich nie widać. Gdyby ustawiały skalę, to, czego nie widać,
decydowałoby o kolorze tego, co widać — pojedyncza wartość spod bryły potrafi
rozciągnąć zakres tak, że cały gaz mieści się w dolnej jednej trzeciej palety.
Przełącznik pokazania blank świadomie **nie** przelicza skali: ma pozostać
zerknięciem pod bryłę, a nie przestawieniem całej sceny i legendy. Wnętrza
wychodzą wtedy poklamrowane do końców i to jest uczciwa odpowiedź — te
wartości są poza skalą zjawiska, bo nie należą do zjawiska.

**Paleta należy do wielkości, choć #151 pisał „przełączalne per scena".**
Tekst issue mówił dwie rzeczy naraz: „wielkość → {zakres, colorbar}" stawia
paletę przy wielkości, „przełączalne per scena" przy scenie. Różnica ujawnia
się dopiero przy dwóch wielkościach na ekranie, a slice TEMPERATURE razem ze
slice'em VELOCITY to układ zwyczajny: przy jednej palecie czerwona plama może
znaczyć 340 °C albo 12 m/s i nic w kolorze tego nie rozstrzyga. Paleta przy
wielkości kosztuje jedno pole obok zakresu w mapie, która i tak jest
kluczowana wielkością, a jej przełącznik siedzi przy legendzie, której
dotyczy — więc zasięg wyboru widać. Przy jednej załadowanej wielkości, czyli
w przypadku typowym, oba warianty zachowują się identycznie.

**Kontrakt jest bliźniakiem `TimelineClient`** — `quantityExtents()` mówi, co
format trzyma, `applyScale()` każe mu tym pomalować — i z tych samych powodów,
które zapisał ADR-0018. Klientami są serwisy formatów, singletony rejestrujące
się w konstruktorze, a nie obiekty tworzone przy każdym załadowaniu grupy, więc
nie ma czego wyrejestrowywać i wyciek nie jest stanem domyślnym. Serwis niczego
nie cache'uje: składa wkłady, gdy ktoś pyta, tak jak `TimelineService.end`
odpytuje klientów przy każdym odczycie. Różnica wobec osi jest jedna i ona
wymusiła jawne `refresh()`: oś ma darmowy moment na dogonienie stanu, bo
`advance()` leci co klatkę, a skala takiego momentu nie ma i wymyślanie sobie
pulsu sześćdziesiąt razy na sekundę dla zdarzenia zachodzącego kilka razy na
sesję byłoby pracą bez powodu. Cena jest znana: `refresh()` zapomniany po
załadowaniu albo odładowaniu zostawia skórę w złym kolorze. To błąd widoczny
i odwracalny, w przeciwieństwie do wycieku, którego tamten wybór by kosztował.

Konsekwencje dla reszty Fazy 6 (#89): nowy format wyników dokłada rejestrację
w konstruktorze i dwie metody, nie dotykając ani skali, ani legendy —
legenda pokazuje wielkości, nie formaty, więc BNDF wpada do niej sam.
Nadpisanie i wybór palety to stan sceny, nieutrwalany, tej samej kategorii co
`t` osi i etykiety wymiarów (ADR-0004); porównywanie dwóch scenariuszy na
jednej skali wymagałoby kanału do magazynu hosta, którego biblioteka nie ma,
a którego brak w webSmokeview rozjechałby zachowanie obu hostów. Sygnał
„to inna sprawa" nadaje nadal `SliceService.setCase()`, więc skala dziedziczy
dług opisany na końcu ADR-0018 — dwie linie do przeniesienia zamiast jednej,
gdy #152 dostanie własny szew otwarcia sprawy.
