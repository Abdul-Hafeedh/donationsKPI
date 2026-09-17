import json, random

# Benchmark 2025 weeks from benchmarkData.ts
weeks_meta = [
  (2, 310, 4), (3, 30, 1), (4, 925, 9), (5, 1295, 12), (6, 185, 2),
  (7, 60, 1), (8, 30, 1), (10, 275, 3), (11, 240, 3), (12, 325, 4),
  (13, 215, 2), (14, 405, 4), (15, 35, 1), (16, 415, 4), (17, 325, 3),
  (18, 185, 2), (19, 385, 4), (20, 440, 5), (21, 185, 2), (22, 85, 1),
  (23, 75, 1), (24, 410, 4), (25, 460, 4), (26, 50, 1), (27, 590, 6),
  (31, 15, 1), (32, 780, 8), (33, 325, 3), (34, 355, 3), (35, 625, 6),
  (36, 380, 4), (37, 480, 5), (38, 385, 4), (39, 610, 6), (40, 500, 5),
  (41, 385, 4), (42, 925, 8), (43, 500, 5), (44, 205, 2), (45, 285, 3),
  (46, 100, 1), (47, 250, 3), (48, 235, 2), (49, 200, 2), (50, 225, 2),
  (51, 200, 2), (53, 80, 1)
]

total_tx = sum(cnt for _, _, cnt in weeks_meta)
total_amt = sum(tot for _, tot, _ in weeks_meta)
print(f"Total weeks: {len(weeks_meta)}, Total donations: {total_tx}, Total sum: {total_amt}")

# We need exact distribution:
# 50 kr: 44 times (2200 kr)
# 100 kr: 42 times (4200 kr)
# 25 kr: 31 times (775 kr)
# 5 biggest amounts: 500, 450, 350, 325, 300 (sum: 1925 kr)
# Total count so far: 44 + 42 + 31 + 5 = 122 donations.
# Total tx needed: 138.
# Remaining donations count: 138 - 122 = 16 donations.
# Sum so far: 2200 + 4200 + 775 + 1925 = 9100 kr.
# Remaining sum needed: 11515 - 9100 = 2415 kr across 16 donations.
# Average of remainder: 2415 / 16 = 150.9 kr.
# And ALL remaining donations must be strictly smaller than 300 kr so the top 5 remains strictly 500, 450, 350, 325, 300!
# And frequency of any remaining denomination must be strictly < 31 so top 3 frequencies remain strictly 50 (44), 100 (42), 25 (31)!
