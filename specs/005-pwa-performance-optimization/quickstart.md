# Quickstart: Performance Benchmarking

## 1. Lighthouse PWA Audit
1. Open Chrome DevTools.
2. Navigate to **Lighthouse** tab.
3. Select **Mobile** mode and check **Progressive Web App**.
4. Run report. Target: **100/100**.

## 2. Scroll Performance Check (FPS)
1. Open Chrome DevTools.
2. `Ctrl+Shift+P` (or `Cmd+Shift+P`) and type "Show Rendering".
3. Check **Frame Rendering Stats**.
4. Scroll the Social Feed. Target: **Stable 60 FPS**.

## 3. Edge Latency Verification
Check asset headers via `curl`:
```bash
curl -I https://your-supabase-cdn.com/storage/v1/object/public/user-media/test.jpg
```
Verify `cf-cache-status: HIT` and `cache-control` headers.

## 4. Load Testing (Concurrent Posters)
Run the Locust benchmark:
```bash
cd backend
locust -f tests/load_test.py --host http://localhost:8000
```
Simulate 500 users. Target: **Median Response < 200ms**.
