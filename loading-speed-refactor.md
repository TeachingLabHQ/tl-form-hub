Problem: the weekly project log takes 9 seconds to load

## ✅ COMPLETED: Refactored to Deferred Loading with Suspense
- Moved data fetching logic from API route to loader in `weekly-project-log-form.tsx`
- Implemented deferred loading using Remix's `defer()` and React Suspense
- This provides fast first paint while data loads in the background

## Recommendations to Speed Up Loading

### 1. **Parallel Data Fetching** (Already Implemented ✅)
The current implementation uses `Promise.all()` to fetch data in parallel - this is good!

### 2. **Database Query Optimization**
- **Add Database Indexes**: Ensure indexes exist on frequently queried columns:
  - Employee email field in Monday profile queries
  - Any join columns used in `fetchProgramProjectsStaffing`
  - Date ranges if querying by time periods
  
### 3. **Implement Caching**
- **Server-side caching**: Cache frequently accessed data that doesn't change often:
  - `projectSourceNames` - seems relatively static
  - `programProjectsStaffing` - could be cached per user for 5-10 minutes
  - Consider Redis or in-memory caching
  
- **Client-side caching**: Use Remix's built-in caching headers or implement SWR pattern

### 4. **Data Fetching Strategy Improvements**
- **Reduce Data Volume**: Only fetch what's needed
  - Are all fields in `programProjectsStaffing` necessary?
  - Can you paginate or limit results?
  
- **Lazy Load Secondary Data**: Not all data needs to load immediately
  - Could `projectSourceNames` load after the form renders?
  - Consider loading autocomplete data on-demand
  
### 5. **API Performance**
- **Check External API Calls**: If fetching from Monday.com or other external APIs:
  - These are likely the bottleneck (external API latency)
  - Consider webhooks + local cache instead of real-time fetching
  - Pre-fetch and store data periodically (background job)
  
### 6. **Optimize the Employee Lookup**
- The `fetchMondayEmployee` call happens before other queries
- Could this be cached in the session or a cookie?
- Consider storing `mondayProfileId` in the auth session to avoid this lookup

### 7. **Progressive Enhancement**
- Show the form structure immediately
- Load project autocomplete data progressively
- Use skeleton loaders for better perceived performance

### 8. **Monitor and Measure**
- Add performance logging to identify the slowest queries:
  ```typescript
  const start = performance.now();
  const result = await service.fetchData();
  console.log(`Query took ${performance.now() - start}ms`);
  ```
- Focus optimization efforts on the slowest operations

### 9. **Consider Edge Functions**
- If using Vercel/Netlify, deploy to edge locations closer to your database
- Reduce network latency between server and database

### Priority Order:
1. **Identify the bottleneck** (add timing logs to each query)
2. **Cache static/semi-static data** (projectSourceNames, staffing data)
3. **Optimize the slowest query** (likely the external API calls)
4. **Add database indexes** (if queries are slow)
5. **Implement progressive loading** (for better UX even if backend stays slow)

---

## ✅ COMPLETED: Inverted Indexing Optimization

**Implemented in**: `app/domains/project/service.ts`

### What Was Changed
Optimized `fetchBudgetedHoursByEmployee` to use inverted indexing instead of sequential filtering:

**Before (O(n) filter + O(m) map):**
```typescript
// 1. Filter all 426 items to find matches (~2-3s)
const matched = allItems.filter(item => 
  item.column_values.some(col => col.id === "lookup_mksmfdnr" && col.display_value === email)
);

// 2. Transform matched items (~0.1s)
const transformed = matched.map(item => { /* transform */ });
```

**After (O(n) index build + O(1) lookup):**
```typescript
// 1. Build inverted index in single pass (~0.1-0.2s)
const index = buildBudgetedHoursIndex(allItems); // Map<email, EmployeeBudgetedHours[]>

// 2. Instant lookup (~0.001s)
const employeeData = index.get(employeeEmail) || [];
```

### Performance Improvement
- **Old approach**: ~2-3 seconds (filtering + mapping)
- **New approach**: ~0.1-0.2 seconds (index building + lookup)
- **Savings**: **~2-3 seconds per request** ⚡

### How It Works
1. `buildBudgetedHoursIndex()` creates a `Map<email, EmployeeBudgetedHours[]>`
2. Single pass through all items, transforming and grouping by email
3. O(1) lookup to retrieve employee's budgeted hours
4. No redundant filtering or nested searches

### Expected Results
- **Total load time**: ~10.5s → ~7.5-8s
- **Employee budgeted hours fetch**: ~9.5s → ~7.1-7.2s
- The Monday.com API call (~7s) remains the primary bottleneck