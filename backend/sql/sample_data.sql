BEGIN;

INSERT INTO users (id, name, email, password, created_at) VALUES
(101, 'Ava Patel', 'ava.patel@stylnk.com', '$2b$12$samplehashforava0000000000000000000000000000000000', '2026-04-10 09:15:00+08'),
(102, 'Marcus Chen', 'marcus.chen@stylnk.com', '$2b$12$samplehashformarcus000000000000000000000000000000', '2026-04-10 09:22:00+08'),
(103, 'Sofia Reyes', 'sofia.reyes@stylnk.com', '$2b$12$samplehashforsofia0000000000000000000000000000000', '2026-04-10 09:30:00+08'),
(104, 'Daniel Kim', 'daniel.kim@stylnk.com', '$2b$12$samplehashfordaniel000000000000000000000000000000', '2026-04-10 10:05:00+08'),
(105, 'Nina Lopez', 'nina.lopez@stylnk.com', '$2b$12$samplehashfornina00000000000000000000000000000000', '2026-04-10 10:18:00+08'),
(106, 'Omar Hassan', 'omar.hassan@stylnk.com', '$2b$12$samplehashforomar00000000000000000000000000000000', '2026-04-10 10:25:00+08'),
(107, 'Chloe Martin', 'chloe.martin@stylnk.com', '$2b$12$samplehashforchloe0000000000000000000000000000000', '2026-04-10 10:41:00+08'),
(108, 'Ethan Brooks', 'ethan.brooks@stylnk.com', '$2b$12$samplehashforethan0000000000000000000000000000000', '2026-04-10 10:55:00+08')
ON CONFLICT (id) DO NOTHING;

INSERT INTO conversations (id, title, is_group, created_by, created_at, updated_at) VALUES
(1001, NULL, FALSE, 101, '2026-04-18 08:10:00+08', '2026-04-18 08:20:00+08'),
(1002, NULL, FALSE, 103, '2026-04-18 11:05:00+08', '2026-04-18 11:17:00+08'),
(1003, 'Client Sync', TRUE, 101, '2026-04-19 09:00:00+08', '2026-04-19 09:08:00+08'),
(1004, NULL, FALSE, 107, '2026-04-19 18:20:00+08', '2026-04-19 18:28:00+08'),
(1005, 'Launch Copy', TRUE, 102, '2026-04-20 10:15:00+08', '2026-04-20 10:28:00+08'),
(1006, NULL, FALSE, 101, '2026-04-20 14:00:00+08', '2026-04-20 14:08:00+08'),
(1007, 'Ops Standup', TRUE, 104, '2026-04-21 08:30:00+08', '2026-04-21 08:38:00+08'),
(1008, NULL, FALSE, 102, '2026-04-21 16:10:00+08', '2026-04-21 16:19:00+08')
ON CONFLICT (id) DO NOTHING;

INSERT INTO conversation_participants (conversation_id, user_id, joined_at, last_read_at) VALUES
(1, 101, NOW(), NOW()),
(1, 102, NOW(), NOW()),
(1, 103, NOW(), NOW()),
(1, 104, NOW(), NOW()),
(1, 105, NOW(), NOW()),
(1, 106, NOW(), NOW()),
(1, 107, NOW(), NOW()),
(1, 108, NOW(), NOW()),
(1001, 101, NOW(), NOW()),
(1001, 102, NOW(), NOW()),
(1002, 103, NOW(), NOW()),
(1002, 104, NOW(), NOW()),
(1003, 101, NOW(), NOW()),
(1003, 105, NOW(), NOW()),
(1003, 106, NOW(), NOW()),
(1004, 107, NOW(), NOW()),
(1004, 108, NOW(), NOW()),
(1005, 102, NOW(), NOW()),
(1005, 103, NOW(), NOW()),
(1005, 105, NOW(), NOW()),
(1006, 101, NOW(), NOW()),
(1006, 107, NOW(), NOW()),
(1007, 104, NOW(), NOW()),
(1007, 106, NOW(), NOW()),
(1007, 108, NOW(), NOW()),
(1008, 102, NOW(), NOW()),
(1008, 106, NOW(), NOW())
ON CONFLICT (conversation_id, user_id) DO NOTHING;

INSERT INTO messages (id, conversation_id, sender_id, content, created_at) VALUES
(2001, 1001, 101, 'Morning! Are we still on for the product demo at 10?', '2026-04-18 08:12:00+08'),
(2002, 1001, 102, 'Yep, I''m wrapping the slides now.', '2026-04-18 08:13:00+08'),
(2003, 1001, 101, 'Great. Can you add the latency chart from yesterday?', '2026-04-18 08:14:00+08'),
(2004, 1001, 102, 'Already in there. I also trimmed the intro to keep us under 20 minutes.', '2026-04-18 08:16:00+08'),
(2005, 1001, 101, 'Perfect. I''ll handle the Q&A section then.', '2026-04-18 08:17:00+08'),
(2006, 1001, 102, 'Nice. Meet in the conference room at 9:45?', '2026-04-18 08:19:00+08'),
(2007, 1001, 101, 'Works for me. I''ll bring coffee.', '2026-04-18 08:20:00+08'),
(2008, 1002, 103, 'Hey Daniel, did the design file export correctly?', '2026-04-18 11:07:00+08'),
(2009, 1002, 104, 'It did, but the icon set is missing two states.', '2026-04-18 11:09:00+08'),
(2010, 1002, 103, 'Ah, I forgot to publish the latest component updates.', '2026-04-18 11:10:00+08'),
(2011, 1002, 104, 'No problem. Send it over when you can and I''ll patch the build.', '2026-04-18 11:12:00+08'),
(2012, 1002, 103, 'Uploading now. Give me five minutes.', '2026-04-18 11:13:00+08'),
(2013, 1002, 104, 'Got it. I''ll rerun the screenshots after lunch.', '2026-04-18 11:16:00+08'),
(2014, 1002, 103, 'Thank you. You''re saving me today.', '2026-04-18 11:17:00+08'),
(2015, 1003, 101, 'Morning team. Quick check-in before the client call.', '2026-04-19 09:01:00+08'),
(2016, 1003, 105, 'I''m here. Notes doc is open.', '2026-04-19 09:02:00+08'),
(2017, 1003, 106, 'Joining now, sorry, the elevator was painfully slow.', '2026-04-19 09:03:00+08'),
(2018, 1003, 101, 'No worries. Nina, can you cover the onboarding metrics?', '2026-04-19 09:04:00+08'),
(2019, 1003, 105, 'Yep. I pulled the week-over-week numbers last night.', '2026-04-19 09:06:00+08'),
(2020, 1003, 106, 'I''ll take the API stability questions if they come up.', '2026-04-19 09:07:00+08'),
(2021, 1003, 101, 'Perfect. Let''s make this one calm and boring in the best way.', '2026-04-19 09:08:00+08'),
(2022, 1004, 107, 'You heading to the gym after work?', '2026-04-19 18:22:00+08'),
(2023, 1004, 108, 'Thinking about it. My motivation is at 3 percent.', '2026-04-19 18:23:00+08'),
(2024, 1004, 107, 'That''s still enough for a light session.', '2026-04-19 18:24:00+08'),
(2025, 1004, 108, 'True. If you go, I''ll go.', '2026-04-19 18:25:00+08'),
(2026, 1004, 107, 'Deal. Meet downstairs in 20?', '2026-04-19 18:26:00+08'),
(2027, 1004, 108, 'Done. I''ll grab my shoes from the car.', '2026-04-19 18:27:00+08'),
(2028, 1004, 107, 'Nice. No skipping now.', '2026-04-19 18:28:00+08'),
(2029, 1005, 102, 'Morning. Anyone free to review the launch copy?', '2026-04-20 10:16:00+08'),
(2030, 1005, 103, 'I can look in ten minutes.', '2026-04-20 10:17:00+08'),
(2031, 1005, 105, 'Same here. Drop the doc link.', '2026-04-20 10:18:00+08'),
(2032, 1005, 102, 'Sent. I''m mostly unsure about the headline.', '2026-04-20 10:20:00+08'),
(2033, 1005, 103, 'First pass: the body is solid, but the headline feels too formal.', '2026-04-20 10:25:00+08'),
(2034, 1005, 105, 'Agree. We can make it simpler and more human.', '2026-04-20 10:26:00+08'),
(2035, 1005, 102, 'Perfect, that''s exactly the direction I needed.', '2026-04-20 10:28:00+08'),
(2036, 1006, 101, 'Hey Chloe, did you ever find that cafe near the studio?', '2026-04-20 14:02:00+08'),
(2037, 1006, 107, 'Yes, and it''s dangerously good.', '2026-04-20 14:03:00+08'),
(2038, 1006, 101, 'That''s the exact review I was hoping for.', '2026-04-20 14:04:00+08'),
(2039, 1006, 107, 'Want me to send the pin?', '2026-04-20 14:05:00+08'),
(2040, 1006, 101, 'Please do. I''m meeting someone there tomorrow.', '2026-04-20 14:06:00+08'),
(2041, 1006, 107, 'Sending now. Try the iced latte.', '2026-04-20 14:07:00+08'),
(2042, 1006, 101, 'Noted. You have my full trust on this.', '2026-04-20 14:08:00+08'),
(2043, 1007, 104, 'Heads up, staging restarted overnight.', '2026-04-21 08:31:00+08'),
(2044, 1007, 106, 'I saw the alert. Database came back clean.', '2026-04-21 08:32:00+08'),
(2045, 1007, 108, 'Any user-facing issues this morning?', '2026-04-21 08:33:00+08'),
(2046, 1007, 104, 'Just a brief delay on image uploads.', '2026-04-21 08:35:00+08'),
(2047, 1007, 106, 'I already bumped the worker count.', '2026-04-21 08:36:00+08'),
(2048, 1007, 108, 'Great. I''ll keep support posted in case anyone asks.', '2026-04-21 08:37:00+08'),
(2049, 1007, 104, 'Thanks. Crisis level stays at zero.', '2026-04-21 08:38:00+08'),
(2050, 1008, 102, 'Hey Omar, do you have a minute for a billing bug?', '2026-04-21 16:11:00+08'),
(2051, 1008, 106, 'Sure. What''s happening?', '2026-04-21 16:12:00+08'),
(2052, 1008, 102, 'One customer got charged twice after retrying checkout.', '2026-04-21 16:13:00+08'),
(2053, 1008, 106, 'Oof. Send me the order ID and I''ll trace the webhook events.', '2026-04-21 16:14:00+08'),
(2054, 1008, 102, 'Just sent it in the ticket.', '2026-04-21 16:15:00+08'),
(2055, 1008, 106, 'Found it. The retry hit before the idempotency key was stored.', '2026-04-21 16:18:00+08'),
(2056, 1008, 102, 'That explains it. Thanks for jumping on it so fast.', '2026-04-21 16:19:00+08')
ON CONFLICT (id) DO NOTHING;

INSERT INTO message_status (message_id, user_id, status, updated_at)
SELECT
    m.id,
    cp.user_id,
    CASE WHEN cp.user_id = m.sender_id THEN 'seen' ELSE 'seen' END,
    m.created_at + INTERVAL '1 minute'
FROM messages m
JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
WHERE m.id BETWEEN 2001 AND 2056
ON CONFLICT (message_id, user_id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1), true);
SELECT setval(pg_get_serial_sequence('conversations', 'id'), COALESCE((SELECT MAX(id) FROM conversations), 1), true);
SELECT setval(pg_get_serial_sequence('messages', 'id'), COALESCE((SELECT MAX(id) FROM messages), 1), true);
SELECT setval(pg_get_serial_sequence('message_status', 'id'), COALESCE((SELECT MAX(id) FROM message_status), 1), true);

COMMIT;
