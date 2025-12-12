---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
inputDocuments:
  - docs/analysis/product-brief-fangraphs-api-2025-12-05.md
  - docs/analysis/brainstorming-session-2025-12-05.md
workflowType: 'prd'
lastStep: 11
project_name: 'Fangraphs Projections API'
user_name: 'Dyl'
date: '2025-12-05'
---

# Product Requirements Document - Fangraphs Projections API

**Author:** Dyl
**Date:** 2025-12-05

## Executive Summary

The Fangraphs Projections API is a backend service that eliminates the primary barrier to entry for the Fantasy Baseball Auction Calculator: the manual CSV upload requirement. By automatically scraping Steamer projections from Fangraphs nightly and serving them via API, new users can open the app and immediately start calculating auction values - no downloads, no uploads, no friction.

This service transforms the onboarding experience from a multi-step technical hurdle into a zero-configuration start, while ensuring all users always have fresh projection data without manual intervention.

### What Makes This Special

- **Zero-Configuration Start:** Projections available immediately on first app load - users see value within 60 seconds
- **Always Fresh:** Nightly automated updates ensure users never work with stale projections
- **Graceful Degradation:** CSV upload remains as fallback if scraping fails, preserving reliability
- **Extensible Architecture:** Designed to support additional projection systems (ZiPS, ATC, TheBat) in the future

## Project Classification

**Technical Type:** API Backend
**Domain:** General (Fantasy Sports)
**Complexity:** Low

This is a backend service project focused on web scraping, data storage, and API serving. The technical stack involves scheduled cron jobs, HTML parsing, Postgres database storage, and REST API endpoints. No regulatory compliance requirements apply - standard software development practices are sufficient.

## Success Criteria

### User Success

- **Zero-Friction Onboarding:** New users see projections immediately on first app load - no CSV upload required
- **Immediate Value:** Users can calculate auction values within 60 seconds of opening the app
- **Reliability:** Projections available 99%+ of the time users access the app

### Business Success

- **Reduce Onboarding Abandonment:** Eliminate CSV upload as a friction point that causes users to leave
- **Increase Free-to-Paid Conversion:** Users who complete their first league are more likely to upgrade for multi-league access
- **Revenue Model:** Freemium - one free league, paid subscription for multiple leagues

### Technical Success

| Metric | Target | Measurement |
|--------|--------|-------------|
| Scrape Success Rate | 99%+ | Nightly cron job completes successfully |
| Data Completeness | 500+ hitters, 300+ pitchers | Minimum player count per scrape |
| Scrape Freshness | < 24 hours | Time since last successful scrape |
| Alert Threshold | 2 consecutive failures | Trigger monitoring alert |

### Measurable Outcomes

- **MVP Success:** Scraper runs successfully for 7 consecutive nights
- **Data Quality:** 500+ hitters and 300+ pitchers captured per scrape
- **User Experience:** New users see projections on first app load without any upload
- **Fallback Works:** CSV import functions if scrape data is unavailable

## Product Scope

### MVP - Minimum Viable Product

1. **Fangraphs Scraper Service** - Nightly cron job scrapes Steamer projections (batting + pitching)
2. **Postgres Database** - Schema to store player projections with scrape metadata
3. **API Endpoint** - GET endpoint serves projections to frontend in existing format
4. **Frontend Integration** - App auto-loads projections on startup; CSV upload remains as fallback

### Growth Features (Post-MVP)

- Multiple projection systems (ZiPS, ATC, TheBat)
- Projection system selector dropdown in UI
- Robust player ID matching (instead of name matching)
- Admin dashboard for scrape monitoring

### Vision (Future)

- Historical projection data storage
- User-triggered manual refresh
- Additional data sources beyond Fangraphs

## User Journeys

### Journey 1: Marcus Chen - The Zero-Friction First Draft

Marcus is a fantasy baseball enthusiast who just joined his first auction league. His league-mates have been raving about this "auction calculator" tool, so he decides to check it out the night before his draft. He's already nervous about auction strategy - the last thing he wants is a complicated setup process.

He opens the Fantasy Baseball Auction Calculator and braces himself for the usual "upload your data" wall that kills his momentum with other tools. Instead, he sees player projections already loaded and ready to go. "Wait, that's it?" He configures his league settings - 12 teams, $260 budget, standard 5x5 categories - and within 60 seconds he's looking at calculated auction values for every player.

The breakthrough comes during his draft the next day. While other managers fumble with outdated spreadsheets, Marcus confidently bids on undervalued players the calculator identified. He lands Mike Trout for $8 below projected value and builds a balanced roster. His league-mates ask how he prepared so quickly. "I literally just opened the app and it worked."

### Journey 2: Sarah Martinez - The Returning Power User

Sarah has used the Fantasy Baseball Auction Calculator for three seasons across her five auction leagues. She's the one who recommended it to Marcus. Every February, she dreads the annual ritual: navigate to Fangraphs, download the Steamer projections CSV, find the app, upload the file, repeat for pitchers. It's not hard, but it's annoying - especially when projections update mid-preseason and she has to do it all over again.

This year, she opens the app expecting the familiar upload prompt. Instead, projections are just... there. Fresh Steamer data from last night's update. She checks the date - yep, current. She immediately starts analyzing values for her first draft, scheduled in three days. When projections update a week later (Fangraphs adjusts for spring training performances), she opens the app and sees the new data automatically reflected. No re-downloading, no re-uploading.

The real win comes during draft season when she's juggling five leagues in two weeks. Every time she opens the app, it just works. She spends her prep time on actual strategy instead of data management. "Finally," she thinks, "an app that respects my time."

### Journey 3: Marcus Chen - The Fallback Path (Edge Case)

It's draft night and Marcus opens the app, but something's wrong - projections aren't loading. The app shows a message: "Unable to load latest projections. You can upload a CSV manually or try again later."

Marcus remembers his league-mate mentioning Fangraphs. He navigates there, finds the Steamer projections, downloads the CSV, and uploads it to the app. It takes 5 minutes instead of 60 seconds, but he's still ready for his draft. The fallback worked - not ideal, but functional.

The next morning, projections are loading normally again. Marcus never thinks about it again.

### Journey Requirements Summary

These journeys reveal the following capability requirements:

| Journey | Key Capabilities Required |
|---------|--------------------------|
| First-Time User (Marcus) | Auto-loaded projections, zero-config startup, league settings, value calculation |
| Returning User (Sarah) | Fresh nightly data, no manual refresh needed, multi-league support |
| Fallback Path (Marcus) | Error messaging, CSV upload fallback, graceful degradation |

## API Backend Requirements

### Scraping Targets (Data Sources)

The scraper will fetch projection data from Fangraphs:

| Data Type | Source URL |
|-----------|------------|
| Batting Projections | `https://www.fangraphs.com/projections?type=steamer&stats=bat&pos=&team=0&players=0&lg=all&pageitems=2000` |
| Pitching Projections | `https://www.fangraphs.com/projections?type=steamer&stats=pit&pos=&team=0&players=0&lg=all&pageitems=2000` |

**Note:** Set `pageitems` high enough to capture all players in a single request.

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/projections/batters` | GET | Returns all batter projections |
| `/v1/projections/pitchers` | GET | Returns all pitcher projections |

### Technical Specifications

**Authentication:** Public API (no authentication required for MVP)

**Rate Limiting:** Not required for MVP (frontend-only consumer)

**Versioning:** `/v1/` prefix from day one for future compatibility

**Data Format:** JSON response matching the structure expected by existing frontend CSV parsing logic

### Data Schema

**Batter Projection Fields:**
- Player name, team, position(s)
- Batting stats: PA, AB, H, HR, R, RBI, SB, BB, SO, AVG, OBP, SLG, wOBA, wRC+

**Pitcher Projection Fields:**
- Player name, team
- Pitching stats: IP, W, L, SV, ERA, WHIP, K, BB, HR, FIP

### Scrape Metadata

Each scrape should store:
- Timestamp of scrape
- Player count (batters/pitchers)
- Success/failure status
- Source URL and projection system type

### Implementation Considerations

- **Scrape Timing:** Run nightly during low-traffic hours (e.g., 3-4 AM EST)
- **HTML Parsing:** Fangraphs renders tables server-side; standard HTML parsing should work
- **Error Handling:** Log failures, retry once, alert after 2 consecutive failures
- **Data Freshness:** API response should include `lastUpdated` timestamp so frontend can display data age

## Functional Requirements

### Data Acquisition

- FR1: System can scrape batting projection data from Fangraphs Steamer projections page
- FR2: System can scrape pitching projection data from Fangraphs Steamer projections page
- FR3: System can parse HTML tables to extract player names, teams, positions, and statistical projections
- FR4: System can execute scraping jobs on a nightly schedule
- FR5: System can retry failed scrape attempts once before marking as failed

### Data Storage

- FR6: System can store batter projections in a database
- FR7: System can store pitcher projections in a database
- FR8: System can store scrape metadata (timestamp, player count, status, source)
- FR9: System can replace previous projection data with fresh scrape results

### API Serving

- FR10: Frontend can retrieve all batter projections via API endpoint
- FR11: Frontend can retrieve all pitcher projections via API endpoint
- FR12: API responses can include last-updated timestamp for data freshness display

### Frontend Integration

- FR13: Users can view projections automatically on app startup without manual upload
- FR14: Users can see when projection data was last updated
- FR15: Users can upload CSV projections manually as fallback when API data unavailable
- FR16: Users can see an error message when projections fail to load

### Monitoring & Reliability

- FR17: System can log scrape success/failure events
- FR18: System can alert operator after 2 consecutive scrape failures

## Non-Functional Requirements

### Performance

- NFR1: API endpoints respond within 500ms under normal load
- NFR2: Scraping job completes within 5 minutes per data source
- NFR3: Database queries for projection retrieval complete within 100ms

### Reliability

- NFR4: System achieves 99%+ uptime for API endpoints
- NFR5: Scraping succeeds on 99%+ of nightly runs (excluding Fangraphs outages)
- NFR6: System gracefully degrades when scraping fails (stale data served with warning, fallback enabled)
- NFR7: Failed scrapes are automatically retried once before alerting

### Integration

- NFR8: System handles Fangraphs HTML structure changes with clear error logging
- NFR9: Scraper respects reasonable request patterns (single request, not rapid-fire)
- NFR10: API response format maintains backward compatibility with existing frontend

### Data Quality

- NFR11: Each successful scrape captures minimum 500 batters and 300 pitchers
- NFR12: Projection data is validated for completeness before replacing previous data
- NFR13: Scrape metadata is always recorded regardless of success/failure

