# Task Proposals

## Fix a Typo
- **Issue**: The empty-state message in `DailySummaryScreen` displays "No hay compras es te día", with a stray space splitting "este" into two words.
- **Impact**: User-facing typo reduces polish and may confuse readers.
- **Suggested Task**: Update the string to "No hay compras este día." in the `ListEmptyComponent` of the purchases list.
- **Location**: `src/screens/DailySummaryScreen.tsx`, line 111.

## Fix a Bug
- **Issue**: When selecting a person in `RegisterPaymentScreen`, the code uses `currentBalance`—derived from the previously selected person—to auto-select the payment type. This means the suggested payment type is based on stale data and can be wrong for the newly chosen person.
- **Impact**: The UI may default to "Prepago" even when the new selection has outstanding debt (or vice versa), leading to incorrect payment classification.
- **Suggested Task**: Recalculate the balance using the tapped `item` inside the `onPress` handler before calling `setPaymentType`, rather than relying on the outer `currentBalance` value.
- **Location**: `src/screens/RegisterPaymentScreen.tsx`, lines 119-123.

## Fix a Comment/Documentation Discrepancy
- **Issue**: In `PersonDetailScreen`, the comment "pagos posteriores" describes accumulating post-week payments, but the code actually adds those amounts to `pagosDesdeSemana`. This mismatch makes the comment misleading and obscures the intended role of `pagosPosteriores`.
- **Impact**: Future maintainers may misinterpret the logic and overlook that `pagosPosteriores` never changes, complicating debugging of debt calculations.
- **Suggested Task**: Update the comment (and ideally the code) so that post-week payments are associated with `pagosPosteriores`, matching the narrative in the surrounding comments.
- **Location**: `src/screens/PersonDetailScreen.tsx`, lines 81-126, especially line 100.

## Improve a Test
- **Issue**: Utility logic in `getSummaryByPerson` lacks automated coverage, particularly edge cases like purchases referencing unknown people (which should surface as "Desconocido").
- **Impact**: Without tests, regressions in balance summaries can slip through, especially when refactoring data aggregation.
- **Suggested Task**: Introduce unit tests (e.g., with Jest) that cover `getSummaryByPerson`, asserting aggregation totals and the unknown-person fallback.
- **Location**: `src/utils/summaryHelpers.ts`, lines 17-33.
