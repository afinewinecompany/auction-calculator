---
stepsCompleted: [1, 2]
inputDocuments: []
session_topic: 'Multi-faceted product enhancement (UX + Fangraphs API integration + existing functionality improvements)'
session_goals: 'Generate UX enhancement ideas, design approach for Fangraphs projection data API integration, identify and prioritize improvements to current features'
selected_approach: 'ai-recommended'
techniques_used: ['Question Storming', 'SCAMPER Method', 'Morphological Analysis']
ideas_generated: []
context_file: '.bmad/bmm/data/project-context-template.md'
---

# Brainstorming Session Results

**Facilitator:** Dyl
**Date:** 2025-12-05

## Session Overview

**Topic:** Multi-faceted product enhancement (UX + Fangraphs API integration + existing functionality improvements)

**Goals:**
- Generate UX enhancement ideas
- Design approach for Fangraphs projection data API integration
- Identify and prioritize improvements to current features

### Context Guidance

This session focuses on software development considerations for FantasyBaseballAuction:
- **User Problems and Pain Points** - What challenges do users face in the current experience?
- **Feature Ideas and Capabilities** - How can Fangraphs API integration enhance value?
- **Technical Approaches** - Best practices for API integration and data handling
- **User Experience** - Streamlining workflows and improving usability
- **Success Metrics** - How to measure impact of enhancements

### Session Setup

We're exploring three interconnected enhancement areas:
1. **UX Improvements** - Making the application more intuitive and efficient
2. **Fangraphs API Integration** - Automating projection data imports
3. **Functional Refinements** - Enhancing existing features for better performance

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Multi-faceted product enhancement with focus on UX, API integration, and functional improvements

**Recommended Techniques:**

- **Question Storming (Deep):** Foundation setting to identify the right problems before jumping to solutions - critical for technical work where assumptions can derail implementation
- **SCAMPER Method (Structured):** Systematic exploration through seven lenses to methodically generate enhancement ideas across all three areas
- **Morphological Analysis (Deep):** Technical deep dive to systematically evaluate API integration parameter combinations and find optimal architecture

**AI Rationale:** This sequence balances discovery (questions), systematic ideation (SCAMPER), and technical rigor (morphological analysis) - matching the brownfield context and need for actionable technical + UX outcomes.

---

## Technique Execution: Question Storming

### Phase 1: UX & User Experience Questions

**Critical Insight: Speed of entering drafted players is THE key friction point**

**User Onboarding & First-Time Experience:**
- What happens when a brand new user opens the app for the first time with zero data?
- How quickly can we get a user from "I just opened this app" to "I'm ready to draft"?
- What's the minimum viable setup to make the app useful immediately?
- Should there be a "quick start" flow vs. an "advanced setup" flow?

**Player Finding & Search Speed:**
- Is there a persistent search box at the top that's always focused/ready for typing?
- Can users start typing "tro" and Mike Trout appears in autocomplete?
- Or do they have to scroll through an alphabetical table of 600+ players?
- Should recently-searched/popular players bubble to the top?
- What about position filters - "show me only available OF" to narrow the list?

**Value Input Speed:**
- When they find the player, is there an inline input field RIGHT THERE in the table row?
- Or do they click the player, which opens a dialog/modal to enter the price?
- After entering the value, do they hit Enter or click a "Save" button?
- Does the system assume it's YOUR team, or do they also select which team drafted the player?

**Post-Entry Flow:**
- After recording a player, does focus immediately return to the search box for the next player?
- Or do users have to manually click back to start searching for the next pick?
- Does the drafted player disappear from the available players list instantly?

**Error Correction:**
- If they typo "$350" instead of "$35", how quickly can they fix it?
- Is there an undo button, or do they have to find the player in the drafted log and edit?

**Multi-Device & Responsiveness:**
- How does the layout adapt between laptop (wide screen, mouse) and mobile (narrow, touch)?
- What UI elements need to be prioritized differently on mobile vs. desktop?
- Should the mobile view hide/collapse certain features to keep the draft action front and center?
- What happens if a user switches devices mid-draft - does their session persist?

### Phase 2: Fangraphs API Integration Questions

**API Availability & Data Access:**
- Fangraphs does NOT offer a public API - scraping is required
- Specific URLs identified:
  - Batting: `https://www.fangraphs.com/projections?pos=all&stats=bat&type=steamer`
  - Pitching: `https://www.fangraphs.com/projections?type=steamer&stats=pit&pos=&team=0&players=0&lg=all`
- Can swap `type=steamer` to `type=zips`, `type=atc`, `type=thebat` for other systems
- Can set `pageitems` higher to get more results in single request
- Timestamp parameter (`z=`) not required

**Scraping Technical Questions:**
- Is there a maximum `pageitems` value that works, or can we set it arbitrarily high?
- Do we need to scrape both `stats=bat` and `stats=pit` separately?
- Is the data rendered server-side (easy to scrape) or client-side via JavaScript (need headless browser)?
- Should we use a headless browser (Puppeteer/Playwright) or simpler HTTP requests?
- How do we handle Fangraphs' HTML structure changes when they update their site?

**Data Processing & Player Matching:**
- How do we match Fangraphs player names to our existing player records (typos, nicknames, etc.)?
- What if Fangraphs lists "Ronald Acuña Jr." but our DB has "Ronald Acuna" - fuzzy matching?
- How do we handle rookies or players not in our system yet?
- Does Fangraphs include player IDs in the HTML we can use for matching?

**Caching & Refresh Strategy:**
- Once daily scraping is sufficient
- Should we cache scraped projections in our database?
- What's our storage strategy - keep historical projections or just latest?
- How do we detect if projections actually changed before updating our DB?
- What time of day should scraping happen (when is Fangraphs least loaded)?

**User Projection Selection:**
- Users will understand projection systems available from Fangraphs
- Should default to Steamer projections
- Users should be able to switch projection systems
- When switching systems, only player values in draft room should update
- Should projections refresh daily automatically

**Error Handling:**
- What's the user experience if scraping fails?
- Should we show stale cached data with a warning?
- Do we need monitoring/alerts when scraping breaks?
- Should CSV import remain as backup option?

### Phase 3: Existing Functionality Improvement Questions

**Value Calculation & Transparency:**
- Do users currently see HOW their dollar values are calculated?
- Can users manually override a player's calculated value?
- If they override, does it stick when switching projection systems?
- Is there a way to bulk-adjust values (e.g., "inflate all OF by 10%")?

**Positional Needs Tracking:**
- How do users currently know "I still need 2 OF and 1 MI"?
- Is it a separate panel, or do they have to mentally count their roster?
- Does it update in real-time as players are drafted?

**Performance & Scalability:**
- Are there any performance issues with large player datasets (slow loading, laggy filtering)?
- How does the app handle 600+ players in the available player table?

### Key Breakthrough Insights

1. **Speed is everything** - The #1 pain point is speed of entering drafted players during a live draft
2. **Remove barriers to entry** - Auto-populated projections prevent users from being scared off by CSV import requirement
3. **Scraping is necessary** - Fangraphs has no public API; we have clear URL patterns to work with
4. **Multi-device is critical** - Users need laptop AND mobile access during drafts
5. **Daily refresh is sufficient** - Projections don't need real-time updates

---
