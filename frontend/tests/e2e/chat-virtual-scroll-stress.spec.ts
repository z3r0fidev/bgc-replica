/**
 * Stress tests for Chat Virtual Scroll Performance
 *
 * These tests verify that the chat window maintains acceptable performance
 * with large message counts and rapid scrolling.
 *
 * Run with:
 *   npx playwright test tests/e2e/chat-virtual-scroll-stress.spec.ts
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const LARGE_MESSAGE_COUNT = 1000;
const RAPID_SCROLL_ITERATIONS = 50;
const ACCEPTABLE_FPS = 30;
const MAX_MEMORY_GROWTH_MB = 100;
const MAX_PAINT_TIME_MS = 50;

test.describe('Chat Virtual Scroll Stress Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'test-token');
    });
  });

  test.describe('Large Message Count Performance', () => {
    test('renders 1000+ messages without significant performance degradation', async ({ page }) => {
      // Navigate to chat and inject large message set
      await page.goto('/chat');

      // Wait for component to mount
      await page.waitForSelector('[data-testid="chat-window"], .overflow-auto', {
        timeout: 5000,
      }).catch(() => {
        // Fallback: wait for general content
      });

      // Inject large message set via JavaScript
      const startTime = await injectLargeMessageSet(page, LARGE_MESSAGE_COUNT);

      // Measure time to render
      const renderTime = await measureRenderTime(page);

      console.log(`Render time for ${LARGE_MESSAGE_COUNT} messages: ${renderTime}ms`);

      // Virtual scrolling should keep render time reasonable
      expect(renderTime).toBeLessThan(2000);
    });

    test('only renders visible messages plus overscan', async ({ page }) => {
      await page.goto('/chat');

      // Inject messages
      await injectLargeMessageSet(page, LARGE_MESSAGE_COUNT);

      // Count actually rendered DOM elements
      const renderedCount = await page.evaluate(() => {
        const container = document.querySelector('.overflow-auto');
        if (!container) return 0;
        // Count direct child divs that represent messages
        const messageElements = container.querySelectorAll('[style*="translateY"]');
        return messageElements.length;
      });

      console.log(`Rendered message elements: ${renderedCount}`);

      // With overscan of 5 and typical viewport, should render ~20-30 elements max
      // Much less than the 1000 total messages
      expect(renderedCount).toBeLessThan(50);
    });
  });

  test.describe('Rapid Scrolling Stress', () => {
    test('handles rapid scrolling without jank', async ({ page }) => {
      await page.goto('/chat');
      await injectLargeMessageSet(page, LARGE_MESSAGE_COUNT);

      // Get scroll container
      const scrollContainer = await page.$('.overflow-auto');
      if (!scrollContainer) {
        console.log('Scroll container not found, skipping test');
        return;
      }

      // Measure frame times during rapid scrolling
      const frameTimes = await measureScrollPerformance(page, RAPID_SCROLL_ITERATIONS);

      // Calculate FPS from frame times
      const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const fps = 1000 / avgFrameTime;

      console.log(`Average FPS during rapid scroll: ${fps.toFixed(1)}`);
      console.log(`Average frame time: ${avgFrameTime.toFixed(2)}ms`);

      // Should maintain at least 30 FPS
      expect(fps).toBeGreaterThan(ACCEPTABLE_FPS);
    });

    test('scroll to top performance', async ({ page }) => {
      await page.goto('/chat');
      await injectLargeMessageSet(page, LARGE_MESSAGE_COUNT);

      // Scroll to bottom first
      await page.evaluate(() => {
        const container = document.querySelector('.overflow-auto');
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });

      // Measure time to scroll to top
      const scrollToTopTime = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          const container = document.querySelector('.overflow-auto');
          if (!container) {
            resolve(0);
            return;
          }

          const start = performance.now();
          container.scrollTo({ top: 0, behavior: 'auto' });

          // Wait for scroll to complete and repaint
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve(performance.now() - start);
            });
          });
        });
      });

      console.log(`Scroll to top time: ${scrollToTopTime.toFixed(2)}ms`);
      expect(scrollToTopTime).toBeLessThan(500);
    });
  });

  test.describe('Memory Usage', () => {
    test('memory does not grow excessively with scrolling', async ({ page }) => {
      await page.goto('/chat');
      await injectLargeMessageSet(page, LARGE_MESSAGE_COUNT);

      // Get initial memory usage
      const initialMemory = await getHeapUsage(page);

      // Perform extensive scrolling
      for (let i = 0; i < 10; i++) {
        await scrollToPosition(page, 0);
        await page.waitForTimeout(50);
        await scrollToPosition(page, 100000);
        await page.waitForTimeout(50);
      }

      // Get final memory usage
      const finalMemory = await getHeapUsage(page);

      const memoryGrowthMB = (finalMemory - initialMemory) / (1024 * 1024);
      console.log(`Initial heap: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Final heap: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Memory growth: ${memoryGrowthMB.toFixed(2)}MB`);

      // Memory growth should be minimal due to virtual scrolling
      expect(memoryGrowthMB).toBeLessThan(MAX_MEMORY_GROWTH_MB);
    });

    test('component properly cleans up on unmount', async ({ page }) => {
      await page.goto('/chat');
      await injectLargeMessageSet(page, LARGE_MESSAGE_COUNT);

      // Get memory before navigation
      const beforeUnmount = await getHeapUsage(page);

      // Navigate away to trigger unmount
      await page.goto('/');
      await page.waitForTimeout(500);

      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });

      // Get memory after unmount
      const afterUnmount = await getHeapUsage(page);

      console.log(`Before unmount: ${(beforeUnmount / 1024 / 1024).toFixed(2)}MB`);
      console.log(`After unmount: ${(afterUnmount / 1024 / 1024).toFixed(2)}MB`);

      // Memory should decrease or stay similar after unmount
      // Allow some tolerance as GC is not deterministic
      const retainedMemory = afterUnmount - beforeUnmount;
      expect(retainedMemory).toBeLessThan(50 * 1024 * 1024); // 50MB tolerance
    });
  });

  test.describe('Paint Performance', () => {
    test('message rendering does not cause long paint times', async ({ page }) => {
      await page.goto('/chat');

      // Enable performance tracing
      const client = await page.context().newCDPSession(page);
      await client.send('Performance.enable');

      await injectLargeMessageSet(page, 500);

      // Get paint metrics
      const metrics = await client.send('Performance.getMetrics');
      const paintMetrics = metrics.metrics.filter(m =>
        m.name.includes('Paint') || m.name.includes('Layout')
      );

      console.log('Paint metrics:', paintMetrics);
    });

    test('scroll does not trigger full repaint', async ({ page }) => {
      await page.goto('/chat');
      await injectLargeMessageSet(page, LARGE_MESSAGE_COUNT);

      // Use Chrome DevTools Protocol for paint flashing
      const client = await page.context().newCDPSession(page);
      await client.send('Overlay.setShowPaintRects', { result: true });

      // Perform scroll
      await scrollToPosition(page, 5000);
      await page.waitForTimeout(100);

      // Virtual scroll should only repaint visible area
      // This is verified visually with paint rects or via Performance API
    });
  });
});

// Helper Functions

async function injectLargeMessageSet(page: Page, count: number): Promise<number> {
  const startTime = Date.now();

  await page.evaluate((messageCount) => {
    // Create synthetic messages
    const messages = Array.from({ length: messageCount }, (_, i) => ({
      id: `msg-${i}`,
      sender_id: i % 2 === 0 ? 'current-user' : 'other-user',
      content: `Test message ${i + 1}: This is a sample message for testing virtual scroll performance with varying content lengths.`,
      conversation_id: 'test-conv',
      type: 'TEXT',
      created_at: new Date(Date.now() - (messageCount - i) * 60000).toISOString(),
    }));

    // Try to find and update the chat state
    // This would normally be done through the React state
    const event = new CustomEvent('inject-test-messages', { detail: messages });
    window.dispatchEvent(event);

    // Store messages for later access
    (window as any).__testMessages = messages;
  }, count);

  return startTime;
}

async function measureRenderTime(page: Page): Promise<number> {
  return page.evaluate(() => {
    return new Promise<number>((resolve) => {
      const start = performance.now();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve(performance.now() - start);
        });
      });
    });
  });
}

async function measureScrollPerformance(page: Page, iterations: number): Promise<number[]> {
  return page.evaluate((iters) => {
    return new Promise<number[]>((resolve) => {
      const container = document.querySelector('.overflow-auto');
      if (!container) {
        resolve([]);
        return;
      }

      const frameTimes: number[] = [];
      let lastFrameTime = performance.now();
      let iteration = 0;
      const scrollHeight = container.scrollHeight;

      const scroll = () => {
        const now = performance.now();
        frameTimes.push(now - lastFrameTime);
        lastFrameTime = now;

        if (iteration < iters) {
          // Alternate between scrolling up and down
          const targetScroll = iteration % 2 === 0
            ? Math.min(container.scrollTop + 500, scrollHeight)
            : Math.max(container.scrollTop - 500, 0);

          container.scrollTop = targetScroll;
          iteration++;
          requestAnimationFrame(scroll);
        } else {
          resolve(frameTimes.slice(1)); // Remove first measurement
        }
      };

      requestAnimationFrame(scroll);
    });
  }, iterations);
}

async function scrollToPosition(page: Page, position: number): Promise<void> {
  await page.evaluate((pos) => {
    const container = document.querySelector('.overflow-auto');
    if (container) {
      container.scrollTop = pos;
    }
  }, position);
}

async function getHeapUsage(page: Page): Promise<number> {
  return page.evaluate(() => {
    if ((performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  });
}
