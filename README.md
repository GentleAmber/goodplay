Goodplay is a Goodreads-style platform for gamers, built as a portfolio project to explore AI-assisted development.

## Development Process

This is a workflow I have figured out and used during the building process. It enables me and any programmer who has not touched a tool or framework (like prisma or Next.js in this example) to be able to finish a project with them in a relatively short time.

### Phase 1 — Prototype & Evaluate

I started with pure prompt-driven generation (vibe coding) to see what AI would produce. The goal was to study the generated framework, understand its patterns, and make informed decisions about the actual product design before writing anything serious.

### Phase 2 — Foundation Build

I started fresh with a new repository, wrote enough code myself to get confident with the core framework and tools, then redesigned the architecture and database before handing off to AI. Core features — game browsing and search, authentication, reviews, and broadcasts — were implemented in this phase. The initial game data was also fetched with API call in this phase.

### Phase 3 — Iterative Feature Development

I tested the app and added features on the fly as real needs emerged. User banning, broadcast likes and comments, etc. were implemented in this phase. One notable moment was spotting that the same auth-related function had been duplicated across multiple files — I extracted it into the shared /lib folder manually.

### Phase 4 — Polish & Wrap-up

Added database size limits appropriate for a demo, polished the UI, and prepared the project for portfolio presentation.

## Reflection

Completing this project led me to an interim conclusion: AI serves as a good "Get Started" guide, and dramatically speeds up repetitive coding tasks, but it needs humans. Because when AI makes mistakes, it can be very bold about it. In the initial vibe coding phase, I asked it to fix a bug, but I was not even able to check if the bug was fixed, because the login system crashed after its operation. It is worth noting that the bug is in another system.

That is why even though AI can be highly efficient, the person commanding it should have solid knowledge of coding, architecture, and some tactics for interacting with AI effectively. Only then can the two work together in the right direction.

## Test Accounts

Several test accounts are available so you can explore how different users interact with the app — including admin and regular user perspectives. You can also register a new account using an invitation code, though the system is capped at 10 users total as this is a demo environment.

Test accounts are listed below:

```
username: admin00, password: jD902K%89#kldP! (admin account)
username: Jack, password: Akpt23%fd (common user account)
username: Test_user, password: jskld22#DF5s (banned common user account)
```
