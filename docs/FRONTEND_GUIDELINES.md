# Frontend Guidelines (FRONTEND_GUIDELINES.md)

## 1. Design System
- **Framework**: Tailwind CSS v4
- **Components**: shadcn/ui
- **Icons**: Lucide React
- **Font**: Inter / Sans-serif defaults.

## 2. Color Palette (Tailwind)
- **Primary**: `emerald-600` (Eco-friendly green)
- **Secondary**: `orange-500` (Urgency/Food)
- **Background**: `neutral-50` (Clean light mode)
- **Surface**: `white` (Cards/Modals)

## 3. Project Structure (`RMFrontend`)
```
src/
├── components/
│   ├── ui/           # generic atoms (button, input)
│   ├── layout/       # navbar, footer, sidebar
│   ├── food/         # food-specific components (card, form)
│   └── sections/     # landing page sections
├── pages/            # route components
├── hooks/            # custom hooks (useAuth, useLocation)
├── lib/              # utils, api client (axios configuration)
└── types/            # typescript interfaces
```

## 4. Coding Standards
- **Components**: Functional components with TypeScript interfaces.
- **Props**: Use discriminated unions for variant props.
- **State**: Keep state local unless shared (use Context).
- **Async**: Use `async/await` with try/catch blocks for API calls.
