"""Seed a rich journal corpus for RAG development/demo.

Adds ~30 realistic journal entries for the ``shellpreview`` demo user spanning
2026-06-01 → 2026-07-19 (i.e. *before* the 11 real entries that already run
07-20 → 08-03), so the two sets form one continuous ~2-month journal without
date/title collisions. The entries deliberately braid a handful of recurring
threads — sleep, work-sprint stress, running + gym progression, cooking vs
ordering in, a side project, social life, and a mid-June low patch — so a
thematic RAG query ("how's my sleep been?", "when was I stressed about work?")
retrieves *multiple* entries across different dates and has to rank them.

Idempotent: entries are keyed by (user_id, entry_date, title) and skipped if
already present, so re-running is safe. Also deletes two obvious junk test
entries (an "interstellar" Wikipedia paste and a "notesadasd…" placeholder) that
would otherwise pollute retrieval.

Run from backend/:  uv run python -m scripts.seed_journal
"""

import asyncio
from datetime import date

from sqlalchemy import delete, or_, select

from app.db.session import async_session_factory
from app.models.note import Note
from app.models.user import User

SEED_USERNAME = "shellpreview"

# Each entry: (entry_date, title, mood, tags, body_md). Moods are the allowed
# MoodKey set: great | good | okay | low | rough.
ENTRIES: list[tuple[str, str, str, list[str], str]] = [
    (
        "2026-06-01", "Starting again, couch to something", "okay", ["running", "health"],
        "Laced up for the first time in months. Managed maybe fifteen minutes of "
        "run-walk around the park before my lungs filed a complaint. Not proud of "
        "the distance, but I went, and going is the whole battle right now. Told "
        "myself the only rule for June is *show up three times a week* — no pace, "
        "no distance targets, just get out the door. Writing it here so it's real.",
    ),
    (
        "2026-06-03", "3am again", "low", ["sleep"],
        "Awake at 3 and could not get back down. Lay there doing the mental-arithmetic "
        "thing about how many hours were left if I fell asleep *right now*, which of "
        "course guarantees you won't. Ended up reading on my phone until 4:30, which I "
        "know is exactly the wrong move. This is the third bad night this week. Coffee "
        "carried the morning but I was foggy through the standup and short with people "
        "I didn't mean to be short with. Something has to change with the evenings.",
    ),
    (
        "2026-06-05", "The migration lands Friday", "okay", ["work", "stress"],
        "Big database migration is scheduled to ship Friday and I can feel the low hum "
        "of dread about it already. Spent the afternoon writing the rollback plan, which "
        "weirdly made me feel better — having an escape hatch always does. The risky "
        "part is the backfill; if it locks the table in prod we're in trouble. Blocked "
        "tomorrow morning for a dry run against a copy.",
    ),
    (
        "2026-06-06", "Dinner with M", "good", ["social"],
        "M cooked and we didn't talk about work once, which felt like a small act of "
        "resistance. Long slow evening, a bottle of wine, the good kind of tired after. "
        "I've been so in my own head about the migration and sleep that it was a relief "
        "to just be a person having dinner with someone I like.",
    ),
    (
        "2026-06-08", "Flat all day", "low", ["mood"],
        "Nothing wrong exactly, just grey. Went through the motions, closed a couple of "
        "tickets, didn't run even though I'd planned to. That skipped run annoys me more "
        "than the work stuff. Noting it because I want to see whether these flat days "
        "cluster or whether it's random.",
    ),
    (
        "2026-06-09", "Shipped the migration", "great", ["work"],
        "It went clean. The backfill ran in batches like we designed and never locked "
        "anything for more than a second or two. Watched the dashboards like a hawk for "
        "an hour after and then finally exhaled. The rollback plan I sweated over went "
        "unused, which is the best outcome for a rollback plan. Genuinely proud of this "
        "one — it's the kind of quiet, careful work nobody notices when it goes right.",
    ),
    (
        "2026-06-11", "First 5k without stopping", "great", ["running"],
        "Ran the full loop without walking for the first time. Slow — properly slow, a "
        "shuffle really — but continuous, start to finish. Something clicked around the "
        "halfway mark where the breathing settled and it stopped being a negotiation. "
        "Ten days ago I couldn't do fifteen minutes. Momentum is a real thing and I'm "
        "trying to respect it.",
    ),
    (
        "2026-06-13", "Started building the thing", "good", ["side-project"],
        "Finally started the side project I've been circling for weeks — a little tool "
        "to track reading notes. Got a bare Next.js app talking to a Postgres and it "
        "felt *so* good to build something that's purely mine, no stakeholders, no "
        "review. Two hours flew by. This is the kind of evening I want more of, "
        "assuming I can protect the time.",
    ),
    (
        "2026-06-15", "The dal-rice reset", "good", ["eating", "health"],
        "Cooked the dal-rice reset meal instead of ordering in for the fourth night "
        "running. It's become my anchor meal — cheap, fast, and it makes me feel like "
        "I've got a hand on the wheel again after a stretch of takeaway containers "
        "stacking up by the bin. Something about chopping onions decompresses me. "
        "Small win but it stuck.",
    ),
    (
        "2026-06-16", "The low patch", "rough", ["mood"],
        "Worst day in a while. The greyness from last week deepened into something with "
        "actual weight to it. Cancelled on friends, which I then felt guilty about, "
        "which didn't help. I know from before that these patches lift, but in the "
        "middle of one that knowledge is abstract and useless. Went to bed early "
        "because the day wasn't going to get any better and sleep at least stops the "
        "clock. Writing this down so future-me can see the shape of it and know it "
        "passed.",
    ),
    (
        "2026-06-17", "Phone in the hallway", "okay", ["sleep"],
        "New experiment: phone charges in the hallway overnight, not on the nightstand. "
        "Bought an actual alarm clock like it's 2005. First night was strange — reached "
        "for a phone that wasn't there twice — but I read a paperback until my eyes got "
        "heavy and dropped off without the usual scrolling. Woke once but got back down. "
        "One data point, but a hopeful one.",
    ),
    (
        "2026-06-19", "Friends in town, stretched thin", "okay", ["social"],
        "Old friends passed through and we did the whole day — lunch, walking, dinner, "
        "drinks. Lovely to see them and also I could feel my social battery draining in "
        "real time by about hour six. I love these people and I still needed the quiet "
        "of the walk home like a drink of water. Learning that both things are true at "
        "once and neither makes me a bad friend.",
    ),
    (
        "2026-06-21", "Momentum on the side project", "great", ["side-project"],
        "Third evening on the reading-notes tool and it's actually taking shape — you "
        "can add a book, jot notes against it, and search them. Hit that flow state "
        "where you look up and two hours have vanished. This is the most alive I've felt "
        "all month, which is worth noticing given how grey the middle of June got. "
        "Building things is the thing that reliably pulls me out.",
    ),
    (
        "2026-06-23", "Stakeholder review went sideways", "rough", ["work", "stress"],
        "The review I'd prepped for all week went off the rails in the first ten "
        "minutes. A stakeholder who hadn't read the doc asked a question that "
        "relitigated a decision we'd closed a month ago, and the room followed them "
        "down the hole. Left feeling like a week of prep evaporated. I know intellectually "
        "that one bad meeting isn't a referendum on the work, but it doesn't feel that "
        "way tonight. Need to protect the momentum and not let this bleed into the "
        "weekend.",
    ),
    (
        "2026-06-25", "Knee twinge, backing off", "okay", ["running", "health"],
        "Felt a twinge on the outside of the right knee two k into the run, so I stopped "
        "and walked it home rather than push. Frustrating, right when the running was "
        "getting good, but I've learned the hard way that running through a niggle turns "
        "a week off into a month off. Icing it tonight, taking a couple of days, and "
        "keeping the ego out of it.",
    ),
    (
        "2026-06-27", "Coming out of it", "good", ["mood"],
        "The low patch has lifted — I can tell because I made plans instead of cancelling "
        "them, and the idea of the week ahead doesn't feel like a weight. Looking back "
        "at the entries from the 16th, the thing that pulled me out was some combination "
        "of the side project catching fire, sleeping better with the phone out of the "
        "room, and just… time. Trying to bank that lesson for the next one.",
    ),
    (
        "2026-06-29", "Cut the late snacking", "good", ["eating", "health"],
        "Noticed I'd been grazing after 10pm most nights — crackers, whatever's in the "
        "cupboard, not hunger so much as a habit that fills the gap between work and "
        "bed. Decided to close the kitchen at 9. Three nights in and I sleep better on "
        "the nights I hold the line, which tracks. The evenings feel longer without the "
        "grazing ritual, in a good way.",
    ),
    (
        "2026-07-01", "Quiet weekend with M", "great", ["social"],
        "No plans on purpose. M and I did nothing of note — market in the morning, a "
        "long lazy cook, a film, an early night — and it was exactly what I needed after "
        "the stakeholder mess and the knee sulk. These low-key weekends are the ones I "
        "actually remember. Woke Sunday feeling genuinely rested for the first time in "
        "ages.",
    ),
    (
        "2026-07-02", "First full night in weeks", "great", ["sleep"],
        "Slept from 11 to 6:30 unbroken. Actually unbroken. The phone-in-the-hallway "
        "plus closing the kitchen at 9 seems to be the combination — I've stacked two "
        "small changes and they're compounding. I forgot what it feels like to wake up "
        "before the alarm and not immediately want to die. Whole day had a different "
        "texture for it.",
    ),
    (
        "2026-07-04", "Knee's fine, 7k", "great", ["running"],
        "Tested the knee properly after a week off and it held — ran seven k, further "
        "than I've gone since I started, and it felt strong the whole way. The rest was "
        "the right call. Funny how the discipline of *not* doing the thing is harder "
        "than doing it. Banking that. Eyeing a 10k by the end of the month if the "
        "build-up stays sensible.",
    ),
    (
        "2026-07-05", "Shipped v0 to two friends", "good", ["side-project"],
        "Put the reading-notes tool in front of two friends tonight — a rough, held-"
        "together-with-tape v0, but real, deployed, something they can actually click. "
        "Both had that polite-but-confused face at the same spot in the flow, which told "
        "me more than an hour of me staring at it would. Shipping something small and "
        "embarrassing beats polishing something perfect that no one sees. Noted.",
    ),
    (
        "2026-07-07", "Deep work blocks actually worked", "good", ["work"],
        "Tried blocking two three-hour deep-work windows this week and defending them "
        "like they were meetings — no Slack, no email, phone face down. Got more real "
        "work done in those six hours than in the surrounding scattered twenty. The hard "
        "part isn't the focus, it's saying no to the small interruptions that feel "
        "urgent and aren't. Going to make this the default, not the experiment.",
    ),
    (
        "2026-07-09", "Cooking is actually calming", "good", ["eating"],
        "Realised the cooking I started as a health thing has quietly become the part of "
        "the day I look forward to. It's twenty minutes where the only problem is dinner "
        "and the only tool is a knife. The dal-rice reset is still the anchor but I've "
        "started branching out — a proper stir-fry tonight. Ordering in has dropped to "
        "maybe once a week without me really deciding it would.",
    ),
    (
        "2026-07-10", "Steadier now", "good", ["mood"],
        "Taking stock at the halfway point of the year. The mood's been steady for a "
        "couple of weeks — no big highs but none of the June greyness either, which "
        "I'll take. The pattern I can see now, reading back, is that sleep sits "
        "underneath everything: the bad stretches all started with bad nights, and the "
        "recovery started when the sleep did. If I only protect one thing, it's that.",
    ),
    (
        "2026-07-11", "Said no and it was fine", "good", ["social"],
        "Got invited to a thing on a night I'd earmarked for the side project and I said "
        "no — a clean, guilt-free no, no elaborate excuse. The world did not end. I've "
        "spent years over-committing and then resenting the commitments, and here's the "
        "obvious lesson arriving late: protecting the evening in advance is easier than "
        "clawing it back after. Spent the reclaimed time building and felt great about "
        "it.",
    ),
    (
        "2026-07-12", "Squat back to 80", "great", ["gym", "health"],
        "Back under a proper bar at the gym for the first time in ages and got the squat "
        "back to 80kg for a clean triple. Nowhere near my old numbers but the bar speed "
        "was there and nothing hurt. Pairing the gym with the running is a balance I "
        "have to watch — legs can't do everything every day — but today both the running "
        "and the lifting feel like they're pointing the same direction. Protein shake, "
        "shower, bed.",
    ),
    (
        "2026-07-14", "The wind-down is sticking", "good", ["sleep"],
        "A month in and the evening routine has quietly become just… what I do. Kitchen "
        "closed by 9, phone in the hallway, twenty minutes of a paperback, lights out "
        "around 11. It stopped feeling like a regime and started feeling like the shape "
        "of my evenings. The 3am-panic entries from early June read like someone else "
        "now. Compounding small changes really is the whole game.",
    ),
    (
        "2026-07-16", "Sprint retro, honest for once", "okay", ["work", "stress"],
        "Retro today and for once we were actually honest — named the stakeholder-review "
        "mess from June, named the fact that we keep reopening closed decisions, and "
        "agreed on a rule that a decision doc, once signed off, needs a real reason to "
        "reopen. Whether it survives contact with reality is another question, but "
        "naming the thing out loud felt like progress. Left the office lighter than I "
        "have after a retro in a while.",
    ),
    (
        "2026-07-17", "Guilt when I skip a night", "okay", ["side-project"],
        "Skipped the side project two evenings running — legitimately tired, legitimately "
        "busy — and noticed a low guilt humming underneath, like I'm letting something "
        "down. Which is silly; it's *my* project, there's no deadline, no one's waiting. "
        "But it tells me how much the thing has come to matter. Trying to hold it "
        "lightly: it's meant to be the joy, not another obligation to fail at.",
    ),
    (
        "2026-07-19", "Two months of small changes", "good", ["mood", "health"],
        "Reading back over June and July before a new week. The throughline is almost "
        "embarrassingly simple: sleep got better when the phone left the room, mood got "
        "better when sleep did, the running and cooking gave the days some structure, "
        "and the side project gave the evenings some joy. None of it was a grand plan — "
        "just a stack of small, boring changes that quietly compounded. The low patch in "
        "mid-June feels a long way off tonight. Good place to start the week from.",
    ),
]


async def main() -> None:
    async with async_session_factory() as db:
        user = await db.scalar(select(User).where(User.username == SEED_USERNAME))
        if user is None:
            raise SystemExit(f"User {SEED_USERNAME!r} not found — nothing to seed.")

        # 1) Delete the two obvious junk journal entries (any user) so they don't
        #    pollute RAG retrieval as off-topic false positives.
        junk = await db.execute(
            delete(Note).where(
                Note.kind == "journal",
                or_(
                    Note.title == "interstellar",
                    Note.body_md.like("notesadasd%"),
                ),
            )
        )
        print(f"Deleted {junk.rowcount} junk entr{'y' if junk.rowcount == 1 else 'ies'}.")

        # 2) Insert the seed set, skipping any (date, title) already present.
        existing = set(
            (d, t)
            for d, t in (
                await db.execute(
                    select(Note.entry_date, Note.title).where(
                        Note.user_id == user.id, Note.kind == "journal"
                    )
                )
            ).all()
        )

        added = 0
        for iso, title, mood, tags, body in ENTRIES:
            entry_date = date.fromisoformat(iso)
            if (entry_date, title) in existing:
                continue
            db.add(
                Note(
                    user_id=user.id,
                    kind="journal",
                    title=title,
                    body_md=body,
                    entry_date=entry_date,
                    tags=tags,
                    mood=mood,
                )
            )
            added += 1

        await db.commit()
        print(f"Added {added} journal entr{'y' if added == 1 else 'ies'} for {SEED_USERNAME}.")

        count = len(
            (
                await db.execute(
                    select(Note.id).where(
                        Note.user_id == user.id, Note.kind == "journal"
                    )
                )
            ).all()
        )
        print(f"{SEED_USERNAME} now has {count} journal entries total.")


if __name__ == "__main__":
    asyncio.run(main())
