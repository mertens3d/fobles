# Fobles Testing Authoring

Sitecore serialization for the "Fobles Testing" system module (test data/templates only —
safe to delete in a real environment).

Test data lives under `/sitecore/system/Modules/Fobles Testing/Strategy Scenarios`, one
content item per field strategy (e.g. `Strategy droplink`), each with `0x`/`1x`/`3x`/`10x`
template fields to exercise different source-list sizes.

See [tests/README.md](../../tests/README.md#strategy-scenario-coverage) for the per-strategy
scenario coverage checklist.

