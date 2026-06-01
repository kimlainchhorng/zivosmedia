# TypeScript Preflight Resource Notes

The production build succeeds, but full TypeScript checking can be killed on local machines when the program is too large for available memory.

Current scale:

- `src` contains hundreds of thousands of TypeScript/TSX lines.
- `tsconfig.preflight.json` excludes test files, but the app program is still large.
- A terminated check usually appears in `docs/production-preflight-report.md` as `signal=SIGTERM` with no `error TS...` diagnostics.

## Recommended Local Flow

Use this when local memory is limited:

```bash
npm run deploy:preflight:local
npm run test -- src/test/workflows
npm run build
```

That still verifies secrets, deploy env, migration reports, database readiness, API readiness, media readiness, workflow coverage, and production bundling.

## Full Type Check

Use a larger CI runner or a high-memory local machine for:

```bash
npm run type-check
```

For app-only preflight checking:

```bash
npm run type-check:preflight
```

If either command exits with `error TS...` output, treat it as a code issue. If it exits with `SIGTERM` and no diagnostics, treat it as a resource issue and run it on a larger machine.
