# Component Inventory

## Feature Components

### Configuration Components

| Component | File | Purpose |
|-----------|------|---------|
| LeagueConfigForm | `league-config-form.tsx` | Team count, budget, roster position configuration |
| ScoringFormatSelector | `scoring-format-selector.tsx` | Roto/H2H/Points selection with category configuration |
| ValueCalculationPanel | `value-calculation-panel.tsx` | Z-Score/SGP method, replacement level, budget split settings |
| ProjectionUploader | `projection-uploader.tsx` | Dual-panel CSV upload with column mapping and auto-detection |
| WelcomeDialog | `welcome-dialog.tsx` | First-time user onboarding modal |

### Draft Room Components

| Component | File | Purpose |
|-----------|------|---------|
| DraftPlayerTable | `draft-player-table.tsx` | Sortable/filterable player grid with quick draft |
| DraftLog | `draft-log.tsx` | Pick history with undo, team filtering, value comparison |
| DraftMetrics | `draft-metrics.tsx` | Budget remaining, inflation rate, avg $/player dashboard |
| DraftEntryDialog | `draft-entry-dialog.tsx` | Quick draft modal for entering price and team |
| PositionalNeedsTracker | `positional-needs-tracker.tsx` | Visual roster slot tracking by position |
| PlayerValuesTable | `player-values-table.tsx` | Read-only value display table |
| PdfExportDialog | `pdf-export-dialog.tsx` | Cheat sheet PDF generation options |

## UI Component Library (Shadcn/ui)

48 Radix-based components in `client/src/components/ui/`:

### Layout Components
| Component | File |
|-----------|------|
| Card | `card.tsx` |
| Separator | `separator.tsx` |
| Resizable | `resizable.tsx` |
| ScrollArea | `scroll-area.tsx` |
| AspectRatio | `aspect-ratio.tsx` |
| Sidebar | `sidebar.tsx` |

### Form Components
| Component | File |
|-----------|------|
| Button | `button.tsx` |
| Input | `input.tsx` |
| Textarea | `textarea.tsx` |
| Checkbox | `checkbox.tsx` |
| RadioGroup | `radio-group.tsx` |
| Select | `select.tsx` |
| Slider | `slider.tsx` |
| Switch | `switch.tsx` |
| Label | `label.tsx` |
| Form | `form.tsx` |
| InputOtp | `input-otp.tsx` |

### Overlay Components
| Component | File |
|-----------|------|
| Dialog | `dialog.tsx` |
| AlertDialog | `alert-dialog.tsx` |
| Sheet | `sheet.tsx` |
| Drawer | `drawer.tsx` |
| Popover | `popover.tsx` |
| Tooltip | `tooltip.tsx` |
| HoverCard | `hover-card.tsx` |

### Navigation Components
| Component | File |
|-----------|------|
| NavigationMenu | `navigation-menu.tsx` |
| Menubar | `menubar.tsx` |
| DropdownMenu | `dropdown-menu.tsx` |
| ContextMenu | `context-menu.tsx` |
| Tabs | `tabs.tsx` |
| Breadcrumb | `breadcrumb.tsx` |
| Pagination | `pagination.tsx` |

### Data Display Components
| Component | File |
|-----------|------|
| Table | `table.tsx` |
| Badge | `badge.tsx` |
| Avatar | `avatar.tsx` |
| Progress | `progress.tsx` |
| Skeleton | `skeleton.tsx` |
| Chart | `chart.tsx` |
| Calendar | `calendar.tsx` |
| Carousel | `carousel.tsx` |

### Feedback Components
| Component | File |
|-----------|------|
| Toast | `toast.tsx` |
| Toaster | `toaster.tsx` |
| Alert | `alert.tsx` |

### Utility Components
| Component | File |
|-----------|------|
| Accordion | `accordion.tsx` |
| Collapsible | `collapsible.tsx` |
| Command | `command.tsx` |
| Toggle | `toggle.tsx` |
| ToggleGroup | `toggle-group.tsx` |

## Custom Hooks

| Hook | File | Purpose |
|------|------|---------|
| useAppContext | `app-context.tsx` | Access global application state |
| useMobile | `use-mobile.tsx` | Detect mobile viewport |
| useToast | `use-toast.ts` | Toast notification management |

## Component Patterns

### State Management
- All feature components use `useAppContext()` for global state
- Local state for UI-only concerns (modals, filters, sorting)
- Automatic localStorage persistence on context changes

### Form Handling
- React Hook Form with Zod validation
- Shadcn Form component for consistent styling
- Real-time validation feedback

### Data Tables
- Sortable columns with visual indicators
- Client-side filtering and search
- Sticky headers for large datasets
- Row selection and hover states

### Theming
- Baseball-themed color palette via CSS variables
- Dark mode support (class-based)
- Consistent spacing using Tailwind scale
