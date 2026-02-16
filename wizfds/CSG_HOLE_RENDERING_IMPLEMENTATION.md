# CSG-Based Hole Rendering System for OBST Objects

## Overview
Zaimplementowano system renderowania dziur w obiektach OBST przy użyciu technologii CSG (Constructive Solid Geometry) z automatycznym generowaniem wewnętrznych ścian.

## Główne komponenty

### 1. HoleService (`hole.service.ts`)
**Lokalizacja:** `projects/web-smokeview-lib/src/lib/services/drawing/hole/hole.service.ts`

**Główne metody:**
- `processObstWithHoles(obst: IObst, scene: BABYLON.Scene)` - Główna metoda przetwarzająca obst z dziurami
- `createObstGeometry(obst: IObst, scene: BABYLON.Scene)` - Tworzenie bazowej geometrii obst
- `createHoleGeometry(hole: IHole, scene: BABYLON.Scene)` - Tworzenie geometrii dziury  
- `createHoleInnerWalls(hole: IHole, parentObst: IObst, scene: BABYLON.Scene)` - **Kluczowa funkcja** - tworzenie wewnętrznych ścian
- `canHaveHoles(obst: IObst)` - Sprawdzanie czy obst może mieć dziury (permit_hole === true)

**Algorytm tworzenia ścian wewnętrznych:**
1. Sprawdzenie które ściany dziury są na granicy rodzicielskiego obst
2. Tworzenie cienkich ścian tylko dla ścian w środku obst (nie na granicach)
3. Domyślna grubość ściany: 0.02 (konfigurowalna)

### 2. Aktualizacja ObstService (`obst.service.ts`)
**Dodane funkcjonalności:**
- Import i dependency injection `HoleService`
- Integracja przetwarzania dziur w `updateObstsVertexData()`
- Normalizacja współrzędnych dziur w `normalizeObsts()`
- Fallback do standardowego renderowania jeśli CSG nie powiedzie się

**Logika przetwarzania:**
```typescript
// Check if obst has holes and can have holes
if (obst.holes && obst.holes.length > 0 && this.holeService.canHaveHoles(obst)) {
  // Process with CSG
  const meshWithHoles = this.holeService.processObstWithHoles(obst, scene);
  // Extract vertices and integrate with standard pipeline
}
```

### 3. Rozszerzenie interfejsów (`interfaces.ts`)
**Nowe interfejsy:**
```typescript
export interface IHole {
    id: string,
    uuid: string,
    idAC: number,
    xb: IXb,
    devc_id?: string,
    ctrl_id?: string,
    vis: IVis
}
```

**Aktualizacja IObst:**
```typescript
export interface IObst {
    // ... existing properties
    holes?: IHole[],  // Array of holes to cut from this obst
}
```

### 4. Test API (`smokeview-api.service.ts`)
**Dodana metoda testowa:**
- `createTestObstsWithHoles()` - Tworzy przykładowe dane do testowania systemu dziur

## Architektura CSG

### Proces renderowania z dziurami:
1. **Tworzenie bazowej geometrii obst** - standardowy box mesh
2. **Dla każdej dziury:**
   - Tworzenie geometrii dziury
   - Operacja CSG subtract (obst - dziura)
   - Tworzenie wewnętrznych ścian dla realistycznego efektu grubości materiału
   - Łączenie ścian z głównym mesh
3. **Ekstrakcja werteksów** z wynikowego CSG mesh
4. **Integracja** z istniejącym pipeline renderowania

### Zalety tego podejścia:
- **Realistyczne wygląd** - dziury wyglądają jak prawdziwe wycięcia z grubość materiału
- **Automatyczne ściany wewnętrzne** - system automatycznie tworzy ściany tylko tam gdzie potrzeba
- **Kompatybilność** - pełna integracja z istniejącym systemem clip sliders, materiałów, transparentności
- **Fallback** - jeśli CSG nie powiedzie się, używa standardowego renderowania

## Testowanie

### Przycisk testowy:
W komponencie smokeview dodano przycisk "Test Holes (CSG)" który:
1. Czyści istniejące obsts
2. Tworzy przykładowe obsts z dziurami:
   - Czerwony box z dziurą przechodzącą na wylot (Z-axis)
   - Zielony box z dziurą wewnętrzną (nie dotyka granic)

### Dane testowe:
- **Obst 1:** 2x2x2 box z dziurą 1x1 przechodzącą przez całą wysokość
- **Obst 2:** 2x2x2 box z dziurą 1.6x1.6x1 w środku (nie dotyka granic)

## Konfiguracja

### Parametry konfigurowalne:
- `wallThickness` w `HoleService.createHoleInnerWalls()` - grubość ścian wewnętrznych (domyślnie 0.02)
- `permit_hole` w obst - czy obst może mieć dziury

## Kompatybilność z istniejącym systemem

### Clip sliders:
✅ **ROZWIĄZANE** - Clip sliders teraz używają globalnych granic mesh zamiast lokalnych granic obst

### Materiały i kolory:
✅ CSG meshes dziedziczą materiały i kolory z rodzicielskiego obst

### Transparentność:
✅ Obsts z dziurami są prawidłowo klasyfikowane jako przezroczyste/nieprzezroczyste

### Fallback:
✅ Jeśli CSG nie powiedzie się, system automatycznie używa standardowego renderowania

## Wydajność

### Optymalizacje:
- CSG jest wywoływane tylko dla obsts z dziurami i permit_hole=true
- Temporary meshes są automatycznie dispose'owane
- Fallback zapobiega crashom

### Potencjalne ulepszenia przyszłości:
- Cache'owanie CSG wyników
- Level-of-detail dla skomplikowanych geometrii
- Batch processing wielu dziur jednocześnie

## Podsumowanie

System został w pełni zaimplementowany i zintegrowany z istniejącą architekturą. Zapewnia realistyczne renderowanie dziur w objektach OBST z automatycznym generowaniem ścian wewnętrznych, zachowując pełną kompatybilność z istniejącymi funkcjami jak clip sliders, materiały i transparentność.
