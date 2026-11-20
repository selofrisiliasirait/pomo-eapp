CREATE DATABASE IF NOT EXISTS pomo_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE pomo_db;

CREATE TABLE IF NOT EXISTS courses (
  id         VARCHAR(100) PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  goal       TEXT,
  color      ENUM('green','orange','blue','purple','pink')
             NOT NULL DEFAULT 'green',
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS topics (
  id           VARCHAR(100) PRIMARY KEY,
  course_id    VARCHAR(100) NOT NULL,
  title        VARCHAR(160) NOT NULL,
  estimate     INT NOT NULL,
  deadline     DATE NULL,
  priority     ENUM('low','normal','high')
               NOT NULL DEFAULT 'normal',
  notes        TEXT,
  outcome      TEXT,
  status       ENUM('active','completed')
               NOT NULL DEFAULT 'active',
  created_at   BIGINT NOT NULL,
  completed_at BIGINT NULL,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reviews (
  id           VARCHAR(100) PRIMARY KEY,
  topic_id     VARCHAR(100) NOT NULL,
  due          DATE NOT NULL,
  stage        TINYINT NOT NULL DEFAULT 0,
  status       ENUM('pending','done') NOT NULL DEFAULT 'pending',
  note         TEXT,
  created_at   BIGINT NOT NULL,
  completed_at BIGINT NULL,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  id           VARCHAR(100) PRIMARY KEY,
  session_date DATE NOT NULL,
  started_at   BIGINT NOT NULL,
  ended_at     BIGINT NOT NULL,
  duration     INT NOT NULL,
  title        VARCHAR(160) NOT NULL,
  course_name  VARCHAR(100) NOT NULL DEFAULT '',
  topic_id     VARCHAR(100) NULL,
  plan_id      VARCHAR(100) NULL,
  review_id    VARCHAR(100) NULL,
  is_sample    BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (topic_id) REFERENCES topics(id)
    ON DELETE SET NULL,
  FOREIGN KEY (review_id) REFERENCES reviews(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS plans (
  id         VARCHAR(100) PRIMARY KEY,
  topic_id   VARCHAR(100) NOT NULL,
  review_id  VARCHAR(100) NULL,
  plan_date  DATE NOT NULL,
  minutes    INT NOT NULL,
  status     ENUM('todo','done','skipped') NOT NULL DEFAULT 'todo',
  reason     VARCHAR(300) NOT NULL DEFAULT '',
  title      VARCHAR(160) NOT NULL,
  created_at BIGINT NOT NULL,
  session_id VARCHAR(100) NULL,
  FOREIGN KEY (topic_id)   REFERENCES topics(id)   ON DELETE CASCADE,
  FOREIGN KEY (review_id)  REFERENCES reviews(id)  ON DELETE SET NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS checkpoints (
  id              VARCHAR(100) PRIMARY KEY,
  session_id      VARCHAR(100) NOT NULL UNIQUE,
  topic_id        VARCHAR(100) NULL,
  title           VARCHAR(160) NOT NULL,
  summary         TEXT,
  rating          ENUM('understood','unsure','repeat') NULL,
  submitted       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      BIGINT NOT NULL,
  updated_at      BIGINT NULL,
  completed_topic BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id)   REFERENCES topics(id)   ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS distractions (
  id         VARCHAR(100) PRIMARY KEY,
  topic_id   VARCHAR(100) NULL,
  timer_id   VARCHAR(100) NULL,
  barrier_date DATE NOT NULL,
  category   ENUM('phone','social','environment','difficult','tired','other') NOT NULL,
  note       TEXT,
  created_at BIGINT NOT NULL,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS interruptions (
  id              VARCHAR(100) PRIMARY KEY,
  topic_id        VARCHAR(100) NULL,
  title           VARCHAR(160) NOT NULL,
  stop_date       DATE NOT NULL,
  reason          VARCHAR(100) NOT NULL,
  elapsed_seconds INT NOT NULL,
  created_at      BIGINT NOT NULL,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS preferences (
  id     TINYINT PRIMARY KEY DEFAULT 1,
  focus  INT NOT NULL DEFAULT 25,
  short_break INT NOT NULL DEFAULT 5,
  long_break  INT NOT NULL DEFAULT 15,
  goal   INT NOT NULL DEFAULT 150,
  scene  ENUM('forest','sunset','night') NOT NULL DEFAULT 'forest',
  CHECK (id = 1)
);

INSERT IGNORE INTO preferences (id) VALUES (1);
