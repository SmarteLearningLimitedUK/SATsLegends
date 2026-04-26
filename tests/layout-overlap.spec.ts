import { test, expect } from '@playwright/test';

type Rect = { x: number; y: number; w: number; h: number };

const routesToCheck = [
  '/',
  '/map',
  '/island/1',
  '/game/1/place-value-panic/1',
  '/game/4/graph-grabber/1',
  '/minigame/scale-builder',
  '/minigame/share-splitter',
] as const;

test.describe('Premium Layout: No HUD/Control Overlaps', () => {
  for (const route of routesToCheck) {
    test(`no overlaps on ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(300);

      // Dismiss practice briefing if present (should never block layout checks).
      const practiceOverlay = page.locator('[data-testid="practice-intro-overlay"]');
      try {
        await practiceOverlay.waitFor({ state: 'visible', timeout: 1500 });
      } catch {
        // No practice overlay on this route.
      }
      if (await practiceOverlay.isVisible().catch(() => false)) {
        const action = practiceOverlay.getByRole('button').last();
        await action.click({ timeout: 10_000 });
        await expect(practiceOverlay).toBeHidden({ timeout: 10_000 });
      }

      const bottomHud = page.locator('footer.bottom-hud');
      if (await bottomHud.count()) {
        const hudBox = await bottomHud.boundingBox();
        if (hudBox) {
          // Ensure no tappable controls are underneath the bottom HUD.
          const violations = await page.evaluate(({ hx, hy, hw, hh }) => {
            const hud: Rect = { x: hx, y: hy, w: hw, h: hh };
            const rectsIntersect = (a: Rect, b: Rect) => (
              a.x < b.x + b.w
              && a.x + a.w > b.x
              && a.y < b.y + b.h
              && a.y + a.h > b.y
            );
            const intersectionArea = (a: Rect, b: Rect) => {
              const x1 = Math.max(a.x, b.x);
              const y1 = Math.max(a.y, b.y);
              const x2 = Math.min(a.x + a.w, b.x + b.w);
              const y2 = Math.min(a.y + a.h, b.y + b.h);
              if (x2 <= x1 || y2 <= y1) return 0;
              return (x2 - x1) * (y2 - y1);
            };
            const isVisible = (el: Element) => {
              // Ignore the dock itself; we only care about gameplay/UI sitting under it.
              if (el.closest('footer.bottom-hud')) return false;
              const style = window.getComputedStyle(el);
              if (style.display === 'none' || style.visibility === 'hidden') return false;
              if (Number(style.opacity || '1') < 0.05) return false;
              if (style.pointerEvents === 'none') return false;
              const r = (el as HTMLElement).getBoundingClientRect();
              return r.width > 2 && r.height > 2;
            };

            const candidates = Array.from(document.querySelectorAll('button, [role="button"], a'))
              .filter(isVisible);

            // Keep only "outermost" interactive nodes to avoid nested spans/divs inside buttons.
            const topLevel = candidates.filter((el) => !candidates.some((other) => other !== el && other.contains(el)));

            const toRect = (el: Element): Rect => {
              const r = (el as HTMLElement).getBoundingClientRect();
              return { x: r.left, y: r.top, w: r.width, h: r.height };
            };

            return topLevel
              .map((el) => ({ el, r: toRect(el) }))
              .filter(({ r }) => rectsIntersect(r, hud))
              .map(({ el, r }) => ({
                tag: el.tagName.toLowerCase(),
                text: (el as HTMLElement).innerText?.slice(0, 80) || '',
                overlapArea: intersectionArea(r, hud),
                rect: r,
              }))
              .filter((entry) => entry.overlapArea > 12); // tolerate tiny decorative overlap
          }, { hx: hudBox.x, hy: hudBox.y, hw: hudBox.width, hh: hudBox.height });

          expect(violations, `Found controls under bottom HUD on ${route}`).toEqual([]);
        }
      }

      // Also guard against obvious tap-target overlaps (premium iOS expectation).
      const overlapPairs = await page.evaluate(() => {
        const intersectionArea = (a: Rect, b: Rect) => {
          const x1 = Math.max(a.x, b.x);
          const y1 = Math.max(a.y, b.y);
          const x2 = Math.min(a.x + a.w, b.x + b.w);
          const y2 = Math.min(a.y + a.h, b.y + b.h);
          if (x2 <= x1 || y2 <= y1) return 0;
          return (x2 - x1) * (y2 - y1);
        };
        const isVisible = (el: Element) => {
          if (el.closest('footer.bottom-hud')) return false;
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
          if (Number(style.opacity || '1') < 0.05) return false;
          if (style.pointerEvents === 'none') return false;
          const r = (el as HTMLElement).getBoundingClientRect();
          return r.width > 6 && r.height > 6;
        };

        const candidates = Array.from(document.querySelectorAll('button, [role="button"], a'))
          .filter(isVisible);
        const topLevel = candidates.filter((el) => !candidates.some((other) => other !== el && other.contains(el)));

        const rect = (el: Element): Rect => {
          const r = (el as HTMLElement).getBoundingClientRect();
          return { x: r.left, y: r.top, w: r.width, h: r.height };
        };

        const pairs: Array<{ a: string; b: string; area: number }> = [];
        for (let i = 0; i < topLevel.length; i += 1) {
          for (let j = i + 1; j < topLevel.length; j += 1) {
            const ra = rect(topLevel[i]);
            const rb = rect(topLevel[j]);
            const area = intersectionArea(ra, rb);
            // Only fail on meaningful tap-target overlap (tiny overlaps can happen from sub-pixel rounding).
            if (area > 400) {
              pairs.push({
                a: (topLevel[i] as HTMLElement).innerText?.slice(0, 60) || topLevel[i].tagName,
                b: (topLevel[j] as HTMLElement).innerText?.slice(0, 60) || topLevel[j].tagName,
                area,
              });
            }
          }
        }
        return pairs;
      });

      expect(overlapPairs, `Found overlapping tap targets on ${route}`).toEqual([]);
    });
  }
});
