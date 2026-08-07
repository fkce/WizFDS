# Surowe wartości zamiast kwantyzacji SmokeView

Dane wynikowe (slice, docelowo boundary i particles) trafiają na GPU jako
surowe wartości `f32`, a mapowanie wartość→kolor wykonuje shader z uniformów
zakresu (`range_min`/`range_max`). Zakres wielkości (globalny per wielkość
fizyczna, z ręcznym nadpisaniem — zob. „Zakres wielkości" w `CONTEXT.md`)
jest więc parametrem renderowania, nie właściwością danych.

SmokeView robi odwrotnie: przy ładowaniu kwantyzuje wartości do `u8` (0–255)
względem bieżącego zakresu (`readslice.c`/`IOslice.c`, w starym GLSL-u
`texture_coordinate / 255.0`). To wiąże dane z zakresem — każda zmiana
zakresu wymusza rekwantyzację całych danych i ponowny upload na GPU. U nas
zmiana zakresu to aktualizacja dwóch uniformów; dane leżą nietknięte.

Koszt: 4 bajty na punkt na klatkę zamiast 1 — dla typowych slice'ów
pomijalny, przy patologicznie dużych symulacjach ~4× więcej pamięci.
Kwantyzacja może wrócić jako świadoma optymalizacja pamięci, gdy realny
przypadek zaboli; wtedy będzie opcją formatu danych, nie fundamentem
kontraktu shaderów.

Konsekwencja: wszystkie shadery wyników fazy 6 (#89) przyjmują atrybut
z surową wartością i uniformy zakresu — to kontrakt między parserami
formatów a warstwą rysowania.
