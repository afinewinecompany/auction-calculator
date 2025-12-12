---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments:
  - docs/analysis/brainstorming-session-2025-12-05.md
  - docs/index.md
workflowType: 'product-brief'
lastStep: 5
project_name: 'Fangraphs Projections API'
user_name: 'Dyl'
date: '2025-12-05'
---

# Product Brief: Fangraphs Projections API

**Date:** 2025-12-05
**Author:** Dyl

---

## Executive Summary

The Fangraphs Projections API is a backend service that automatically scrapes player projection data from Fangraphs and stores it in a Postgres database. This eliminates the current friction where users must manually download and upload CSV files before using the Fantasy Baseball Auction Calculator. With this service, projections are simply "there" when users open the app - enabling a zero-configuration first-time experience.

---

## Core Vision

### Problem Statement

New users of the Fantasy Baseball Auction Calculator face a significant barrier to entry: before they can calculate auction values or run a draft, they must navigate to Fangraphs, download projection CSVs, and upload them into the app. This manual process scares off users who want to "just try it" and creates unnecessary friction for returning users who want fresh projection data.

### Problem Impact

- **User Abandonment:** Potential users leave when they encounter the CSV upload requirement
- **Stale Data:** Users who do complete setup often use outdated projections because re-importing is tedious
- **Support Burden:** Questions about "how do I get projections?" dominate user confusion
- **Competitive Disadvantage:** Other tools that offer built-in projections provide a smoother experience

### Why Existing Solutions Fall Short

Currently, users must:
1. Know that Fangraphs exists and offers projections
2. Navigate to the correct Fangraphs page
3. Download separate CSVs for hitters and pitchers
4. Return to the app and upload both files
5. Repeat this process whenever they want fresh data

This multi-step process assumes domain knowledge and technical comfort that casual fantasy baseball players may not have.

### Proposed Solution

A backend service that:
- **Scrapes** Fangraphs projection pages nightly via scheduled cron job
- **Parses** the HTML to extract player projection data (batting and pitching)
- **Stores** projections in a Postgres database
- **Serves** projections to the frontend automatically when users load the app

Users open the app and projections are already there. No downloads, no uploads, no friction.

### Key Differentiators

- **Zero-Configuration Start:** Projections available immediately on first app load
- **Always Fresh:** Nightly updates ensure users always have current projection data
- **Graceful Degradation:** CSV upload remains as fallback if scraping fails
- **Extensible:** Architecture supports adding ZiPS, ATC, TheBat systems in the future

---

## Target Users

### Primary Users

**"The Multi-League Auctioneer"**

**Profile:** Serious fantasy baseball enthusiast who participates in multiple auction leagues per season. Tech-savvy, understands projection systems like Steamer, and values data-driven draft decisions.

**Context:**

- Plays in 3-5+ auction leagues each season
- Uses the app during pre-season prep and live drafts
- Familiar with Fangraphs and projection methodologies
- Values speed and efficiency - time spent on setup is time not spent on analysis

**Current Pain:**

- Must download and re-upload CSVs for each new league or when projections update
- Pre-season: tedious setup repeated across multiple leagues
- Draft day: any friction in setup creates stress when the clock is ticking

**Success Looks Like:**

- Opens app → projections are there → immediately starts analyzing values
- Switches between leagues without re-importing data
- "Finally, an app that just works - I can focus on winning, not on setup"

### Secondary Users

N/A - This is a single-user-type product focused on the serious fantasy auction player.

### User Journey

1. **Discovery:** User finds the Fantasy Baseball Auction Calculator through fantasy baseball communities or search
2. **Onboarding:** Opens app → projections already loaded → configures league settings → immediately sees calculated auction values
3. **Core Usage:** Pre-season analysis and live draft tracking with fresh projection data
4. **Aha Moment:** "I didn't have to upload anything - it just works"
5. **Long-term:** Returns each season knowing projections will be ready; recommends to league-mates

---

## Success Metrics

### User Success

- **Zero-Friction Onboarding:** New users see projections immediately on first app load - no CSV upload required
- **Immediate Value:** Users can calculate auction values within 60 seconds of opening the app
- **Reliability:** Projections available 99%+ of the time users access the app

### Business Objectives

- **Reduce Onboarding Abandonment:** Eliminate CSV upload as a friction point that causes users to leave
- **Increase Free-to-Paid Conversion:** Users who complete their first league are more likely to upgrade for multi-league access
- **Revenue Model:** Freemium - one free league, paid subscription for multiple leagues

### Key Performance Indicators

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Scrape Success Rate** | 99%+ | Nightly cron job completes successfully |
| **Data Completeness** | 500+ hitters, 300+ pitchers | Minimum player count per scrape |
| **Scrape Freshness** | < 24 hours | Time since last successful scrape |
| **Alert Threshold** | 2 consecutive failures | Trigger monitoring alert |
| **Onboarding Completion** | Baseline TBD | % of new users who reach draft room |
| **Free-to-Paid Conversion** | Baseline TBD | % of free users who upgrade |

---

## MVP Scope

### Core Features

1. **Fangraphs Scraper Service**
   - Nightly cron job scrapes Steamer projections from Fangraphs
   - Scrapes both batting and pitching projection pages
   - Parses HTML tables to extract player stats

2. **Postgres Database**
   - Schema to store player projections
   - Store hitter and pitcher projections separately
   - Track scrape metadata (timestamp, player count, status)

3. **API Endpoint**
   - GET endpoint to serve projections to frontend
   - Returns all hitters and pitchers in format compatible with existing app

4. **Frontend Integration**
   - App automatically loads projections from API on startup
   - Remove/bypass CSV upload requirement for new users
   - CSV upload remains as fallback option

### Out of Scope for MVP

- Multiple projection systems (ZiPS, ATC, TheBat)
- Projection system selector dropdown in UI
- Historical projection data storage
- Player ID matching (will use name matching initially)
- Admin dashboard for scrape monitoring
- User-triggered manual refresh

### MVP Success Criteria

- Scraper runs successfully for 7 consecutive nights
- 500+ hitters and 300+ pitchers captured per scrape
- New users see projections on first app load without any upload
- CSV fallback works if scrape data is unavailable

### Future Vision

- **Multi-System Support:** Add ZiPS, ATC, TheBat projection systems
- **System Selector:** UI dropdown to switch between projection systems
- **Robust Player Matching:** Player ID-based matching instead of name matching
- **Monitoring Dashboard:** Admin view showing scrape history and health
- **Additional Data Sources:** Other projection providers beyond Fangraphs
