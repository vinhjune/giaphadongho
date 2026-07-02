-- Seed: default settings + sample family data for UI testing
-- Run: npx wrangler d1 execute giapha-db --local --file=packages/api/src/db/seed.sql

-- ─── Settings ────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES
  ('family_name',  'Dòng Họ Nguyễn', CURRENT_TIMESTAMP),
  ('intro_text',   'Chào mừng bạn đến với trang gia phả dòng họ Nguyễn. Dòng họ chúng tôi có lịch sử hơn 170 năm, trải qua nhiều thế hệ với những đóng góp to lớn cho quê hương và đất nước.', CURRENT_TIMESTAMP),
  ('founded_year', '1850', CURRENT_TIMESTAMP);

-- ─── Events ──────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO events (id, title, description, month, is_lunar, is_recurring, created_at, updated_at) VALUES
  ('evt-001', 'Giỗ Tổ Dòng Họ',   'Ngày giỗ tổ hằng năm của dòng họ Nguyễn',       3, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('evt-002', 'Thanh Minh',        'Tảo mộ, thăm viếng phần mộ tổ tiên dòng họ',    3, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('evt-003', 'Tết Nguyên Đán',    'Họp mặt gia đình đầu năm, thăm hỏi người thân', 1, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ─── Persons (3 generations) ─────────────────────────────────────────────────
-- Generation 0: founding couple
INSERT OR IGNORE INTO persons (id, name, gender, birth_year, is_alive, notes, created_at, updated_at) VALUES
  ('p-001', 'Nguyễn Văn Thủy', 'male',   1850, 0, 'Tổ khai hoang lập nghiệp tại vùng đồng bằng sông Cửu Long', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('p-002', 'Trần Thị Lan',    'female', 1855, 0, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Generation 1
INSERT OR IGNORE INTO persons (id, name, gender, birth_year, is_alive, notes, created_at, updated_at) VALUES
  ('p-003', 'Nguyễn Văn Phúc', 'male',   1878, 0, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('p-004', 'Lê Thị Hoa',      'female', 1882, 0, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('p-005', 'Nguyễn Thị Mai',  'female', 1880, 0, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Generation 2
INSERT OR IGNORE INTO persons (id, name, gender, birth_year, is_alive, notes, created_at, updated_at) VALUES
  ('p-006', 'Nguyễn Văn An',   'male',   1905, 0, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('p-007', 'Nguyễn Văn Bình', 'male',   1908, 0, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('p-008', 'Nguyễn Thị Cúc',  'female', 1910, 0, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Generation 3 (currently alive)
INSERT OR IGNORE INTO persons (id, name, gender, birth_year, birth_month, birth_day, is_alive, created_at, updated_at) VALUES
  ('p-009', 'Nguyễn Văn Dũng', 'male',   1945, 3, 15, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('p-010', 'Nguyễn Thị Dung', 'female', 1950, 7, 20, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ─── Families ────────────────────────────────────────────────────────────────
-- Family 1: Nguyễn Văn Thủy + Trần Thị Lan
INSERT OR IGNORE INTO families (id, parent1_id, parent2_id, status, created_at) VALUES
  ('f-001', 'p-001', 'p-002', 'widowed', CURRENT_TIMESTAMP);

-- Family 2: Nguyễn Văn Phúc + Lê Thị Hoa
INSERT OR IGNORE INTO families (id, parent1_id, parent2_id, status, created_at) VALUES
  ('f-002', 'p-003', 'p-004', 'widowed', CURRENT_TIMESTAMP);

-- Family 3: Nguyễn Văn An (generation 2, no spouse recorded)
INSERT OR IGNORE INTO families (id, parent1_id, parent2_id, status, created_at) VALUES
  ('f-003', 'p-006', NULL, 'active', CURRENT_TIMESTAMP);

-- ─── Family Members (children) ───────────────────────────────────────────────
-- Family 1 children: Nguyễn Văn Phúc, Nguyễn Thị Mai
INSERT OR IGNORE INTO family_members (family_id, person_id) VALUES
  ('f-001', 'p-003'),
  ('f-001', 'p-005');

-- Family 2 children: Nguyễn Văn An, Nguyễn Văn Bình, Nguyễn Thị Cúc
INSERT OR IGNORE INTO family_members (family_id, person_id) VALUES
  ('f-002', 'p-006'),
  ('f-002', 'p-007'),
  ('f-002', 'p-008');

-- Family 3 children: Nguyễn Văn Dũng, Nguyễn Thị Dung
INSERT OR IGNORE INTO family_members (family_id, person_id) VALUES
  ('f-003', 'p-009'),
  ('f-003', 'p-010');
