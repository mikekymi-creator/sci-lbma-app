# LBMA Web — prototype V0.1

This is a first responsive Next.js interface prototype for the family SCI property tracker. The existing Streamlit application remains unchanged.

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

To check a production build:

```bash
npm run build
npm start
```

## Included

- Responsive dashboard for desktop and mobile.
- Demo property cards and basic portfolio indicators.
- Search and status filters.
- Add/edit property modal with URL, DPE, visit date and notes.
- Basic indicative calculations for gross rent yield and illustrative cash-flow.

## Important limitations

- Demo properties are fictional examples and must not be treated as market research.
- Changes are kept only in React state for the current page session; there is no database yet.
- There is no authentication, multi-user access, listing import, notification system, or external data source yet.
- The displayed score and cash-flow are placeholders for UI prototyping, not a replacement for the existing Python calculations.
- Do not enter sensitive or real family financial information in this prototype until authentication and persistent storage are implemented.

## Next steps

1. Audit and extract the existing Python financial calculations into tested, reusable functions.
2. Define the property data model and validate assumptions (notary fees, works, tax and IS).
3. Add Supabase authentication, database and row-level security.
4. Connect the tested calculation service/API.
5. Add real market data sources and a listing-import workflow with clear missing-data indicators.
