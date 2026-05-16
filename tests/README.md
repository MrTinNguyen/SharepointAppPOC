# tests/

Test files are generated here by the AI Tester Agent.

```
tests/
├── unit/          # Jest + React Testing Library tests
│   ├── *.test.tsx     # Component tests
│   ├── *.test.ts      # Hook and service tests
└── e2e/           # Playwright end-to-end tests (optional)
    └── *.spec.ts
```

Run unit tests:
```bash
npm test
```

Run e2e tests:
```bash
npx playwright test
```
