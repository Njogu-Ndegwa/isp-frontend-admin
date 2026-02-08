# AGENTS.md - AI Assistant Guidelines for ISP Billing Admin

## Project Overview
This is a Next.js 16+ application for ISP billing management with mobile-first responsive design.

## Critical Testing Protocol

### Pre-Push Mandatory Checklist

Before pushing ANY changes, verify:

#### 1. Mobile Navigation (HIGHEST PRIORITY)
- [ ] Bottom nav is fully visible (covers 100% width, not 3/4)
- [ ] All 5 nav items are clickable after scrolling in BOTH directions
- [ ] Menu items in "More" sheet are clickable
- [ ] No layout shifts when scrolling
- [ ] Safe area (notch) is handled correctly on iPhone X+

**Common Issue:** Nav container shrinks when scrolling up. Solution: Use `min-height` on outer container, fixed `h-16` on inner flex container.

#### 2. Data Display
- [ ] Mobile cards display actual data (not empty)
- [ ] No "undefined" or "null" text appears
- [ ] Date formatting handles null/undefined gracefully
- [ ] Empty states show properly (not broken layout)

**Common Issue:** Date formatting crashes with null values. Solution: Always use safe date formatting with try-catch.

#### 3. Error Handling
- [ ] Error boundary catches rendering errors
- [ ] User sees friendly error message, not white screen
- [ ] Console has no red errors

#### 4. Build Verification
```bash
npm run build
# Must complete without errors
```

### Component Patterns

#### Mobile Cards - USE MobileDataCard
**Always use the unified `MobileDataCard` component:**
```tsx
import MobileDataCard from '../components/MobileDataCard';

// CORRECT:
<MobileDataCard
  id={item.id}
  title={item.name}
  avatar={{ text: 'A', color: 'primary' }}
  status={{ label: 'active', variant: 'success' }}
  fields={[
    { icon: <PhoneIcon />, value: item.phone },
    { value: item.plan }
  ]}
/>

// INCORRECT - Don't create custom card layouts:
<div className="card p-4">...</div>
```

#### Date Formatting - ALWAYS Use Safe Function
```tsx
// Create safe formatter at top of file:
const formatSafeDate = (dateStr: string | undefined): string => {
  try {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return formatDateGMT3(dateStr, { ... });
  } catch (e) {
    console.error('Date error:', e);
    return '-';
  }
};

// Use it:
<span>{formatSafeDate(tx.transaction_date)}</span>
```

#### Bottom Navigation - CSS Structure
```tsx
// Outer container: min-height allows expansion
<div style={{ 
  minHeight: 'calc(4rem + env(safe-area-inset-bottom, 0px))',
  paddingBottom: 'env(safe-area-inset-bottom, 0px)'
}}>
  {/* Inner container: fixed height for consistency */}
  <div className="h-16 flex items-center justify-around">
    {/* Nav items */}
  </div>
</div>
```

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Nav covers 3/4 of icons | Fixed height + padding conflict | Use min-height on outer, h-16 on inner |
| Date formatting crashes | Null/undefined date values | Safe date function with validation |
| Cards show empty | Opacity:0 inline style | Remove conflicting styles |
| Click doesn't work | z-index or pointer-events | z-[9999], pointer-events-auto |
| Pull-to-refresh triggers unintentionally | No horizontal scroll detection | Add scroll direction detection |

### CSS Safety Rules

1. **Mobile Navigation:**
   - z-index: 9999 minimum
   - `pointer-events: auto` on nav
   - `touch-action: manipulation` on buttons
   - `transform: translateZ(0)` for stacking context

2. **Safe Areas:**
   - Always use `env(safe-area-inset-bottom, 0px)` with fallback
   - Apply to padding, not margin
   - Use min-height, not height

3. **Touch Interactions:**
   - Add `active:opacity-70` for touch feedback
   - Use `touch-none` on drag handles only
   - Prevent event propagation on interactive elements

### File Structure Reminders

- Components: `app/components/ComponentName.tsx`
- Pages: `app/[page-name]/page.tsx`
- Types: `app/lib/types.ts`
- Utilities: `app/lib/*.ts`
- Styles: `app/globals.css`

### Testing Scenarios

#### Mobile (iOS Safari & Android Chrome)
1. Open app on phone
2. Scroll down (content moves up) - check nav
3. Scroll up (content moves down) - check nav
4. Tap each nav item - must navigate
5. Open "More" menu - items must be clickable
6. Pull to refresh - only triggers at top
7. View transactions - dates display correctly

#### Desktop
1. Sidebar expands/collapses
2. Tables are readable
3. No mobile elements visible

### When In Doubt

1. Check `npm run build` output
2. Verify no console errors
3. Test on actual mobile device
4. Ask about specific behavior before implementing

---

**Last Updated:** After fixing nav height and transaction date crashes
**Known Issues Fixed:**
- Bottom nav shrinking on scroll
- Transaction date formatting crashes
- Mobile card opacity issues
- Pull-to-refresh interfering with tables
