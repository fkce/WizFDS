# Oś czasu: zegar renderu i formaty jako klienci

Wspólna oś czasu wyników (zob. „Oś czasu" w `CONTEXT.md`) to jeden serwis
biblioteki trzymający `t`, stan odtwarzania i tempo. Trzy rzeczy w jej budowie
są na tyle nieoczywiste, że bez zapisu wyglądałyby na przypadek.

**Zegar tyka z pętli renderowania**, nie z interwału: `t` rośnie o
`engine.getDeltaTime()` razy tempo, w `scene.onBeforeRenderObservable`, przy
czym **krok jednej klatki jest ograniczony z góry**. Ograniczenie nie jest
detalem — bez niego decyzja daje odwrotność tego, po co ją podjęto.
`getDeltaTime()` to czas ścienny od poprzedniej klatki i nie ma sufitu, więc
klatka, która zacięła się na pół sekundy, wpycha zegarowi pół sekundy naraz i
przeskakuje wszystkie klatki symulacji pomiędzy — czyli dokładnie to, za co
odrzucono `setInterval`. Pierwsza klatka po powrocie z tła niesie zaś całą
nieobecność. Z ograniczeniem zacięcie kosztuje zegar jego czas: odtwarzanie
zostaje w tyle za zegarkiem, zamiast wyprzedzić obraz.

Konsekwencja jest widoczna gołym okiem i będzie zgłaszana jako błąd —
odtwarzanie zwalnia, gdy render nie nadąża, i stoi, gdy karta jest w tle
(`requestAnimationFrame` jest tam wstrzymany). To wybór, nie skutek uboczny:
zegar odtwarzania jest zegarem tego, co widać. Wariant z `setInterval`
dotrzymywałby zegarka kosztem przeskoku obrazu po każdym zacięciu — i to on
stał za usuniętym `PlayerService`, którego interwał potrafił przeżyć własną
scenę i pisać do zniszczonych meshów. Obserwator umiera razem ze sceną;
`resetSceneState()` zeruje już tylko pole.

**Format rejestruje się jako klient osi** — `timeSpan()` mówi, co ma,
`showAt(t)` każe pokazać ten czas — a mapowania `t` na klatkę dokonuje klient,
per plik, czystą funkcją `frameAt(times, t)`. Kształt odwrotny (oś trzyma
tablice czasów i rozsyła numery klatek), opisany w #150, odrzucono z dwóch
powodów. Rejestr wskazywałby wtedy na obiekty tworzone i niszczone przy każdym
załadowaniu grupy, więc wyciek byłby stanem domyślnym, a poprawność zależałaby
od tego, że nikt nigdy nie zapomni się wyrejestrować. Do tego „klatka jako
indeks" nie jest pojęciem wspólnym wszystkim formatom — PART (#153) i SMOKE3D
(#154) odpowiadają na czas inaczej niż slice, a `showAt(t)` potrafi spełnić
każdy z nich. Oś nie wie, czym są jej klienci; to ten sam kształt co
`SceneLifecycleService`. Po #152–#155 będzie w tym kontrakcie pięć formatów,
więc jego zmiana przestanie być tania.

Mapowanie per plik załatwia przy okazji przerwaną symulację: krótszy plik na
jednej siatce trzyma swoją ostatnią klatkę dlatego, że to jest prawidłowa
odpowiedź na „ostatnia klatka ≤ t", a nie przez klamrowanie wspólnego indeksu.

**Domyślne tempo liczy się z danych** — szczebel drabinki najbliższy
`T_END / 30 s` — raz, w chwili powstania osi. Glosariusz definiuje tempo jako
mnożnik czasu rzeczywistego, więc naturalnym domyślnym byłoby 1×; jest
bezużyteczne, bo przy 1× obejrzenie pożaru trwa dokładnie tyle, ile trwał
pożar. Jedna stała też nie wystarcza: scenariusze w tej dziedzinie rozciągają
się od kilkudziesięciu sekund do godzin, więc mnożnik dobry dla korytarza jest
zły dla tunelu. Reguła „raz, przy powstaniu osi" jest częścią decyzji — `T_END`
rośnie przy dokładaniu grupy, a tempo przeliczane przy każdej zmianie
przestawiałoby się użytkownikowi pod palcem. SmokeView, dla porównania, też
nie odtwarza domyślnie w czasie rzeczywistym.

Konsekwencja dla reszty Fazy 6 (#89): nowy format wyników dokłada jedną
rejestrację w konstruktorze i własne `showAt(t)`, nie dotykając osi. Pasek
sterujący jest overlayem biblioteki — zob. uzupełnienie z 2026-08-07
w ADR-0010.

Jeden wyjątek od tego zdania jest dziś prawdziwy i wymaga uwagi przy #152.
Sygnał „to jest inna sprawa" — po którym `t` wraca do zera, a tempo do
ponownego wyliczenia — nadaje `SliceService.setCase()`, bo SLCF jest jedynym
formatem, który ma skąd go znać. Drugi format, który dostanie własne
`setCase()`, powtórzy to wywołanie, a wywołane w trakcie sesji wyzeruje `t`
pod palcem użytkownika. Otwarcie sprawy zasługuje na własny szew w bibliotece
i powinno go dostać wraz z drugim formatem, zamiast rozpełzać się po
klientach.
