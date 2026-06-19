-- Run this in the Supabase SQL Editor (supabase.com > your project > SQL Editor)

create table installations (
  id           bigint primary key,  -- GitHub App installation ID
  repo_full_name text not null unique,
  installed_at timestamptz not null default now()
);

create table repos (
  id         bigserial primary key,
  owner      text not null,
  name       text not null,
  full_name  text not null unique,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table pull_requests (
  id           bigserial primary key,
  repo_id      bigint not null references repos(id),
  number       int not null,
  title        text not null,
  author_login text not null,
  state        text not null check (state in ('open', 'closed', 'merged')),
  opened_at    timestamptz not null,
  created_at   timestamptz not null default now(),
  unique (repo_id, number)
);

create table reviews (
  id              bigserial primary key,
  pull_request_id bigint not null references pull_requests(id),
  commit_sha      text not null,
  latency_seconds int not null,
  status          text not null check (status in ('completed', 'pending', 'failed')),
  github_review_id bigint,  -- GitHub's review ID from the API response
  created_at      timestamptz not null default now()
);

create table findings (
  id                bigserial primary key,
  review_id         bigint not null references reviews(id),
  file_path         text not null,
  line_number       int not null,
  severity          text not null check (severity in ('critical', 'major', 'minor', 'nit')),
  category          text not null check (category in ('bug', 'security', 'style', 'performance', 'risky_change')),
  comment_text      text not null,
  suggested_fix     text,
  outcome           text not null default 'pending' check (outcome in ('pending', 'addressed', 'dismissed', 'reacted_positive', 'reacted_negative', 'no_action')),
  github_comment_id bigint,  -- for updating/deleting the comment later
  posted_at         timestamptz,
  created_at        timestamptz not null default now()
);

-- Indexes for common queries
create index idx_pull_requests_repo on pull_requests(repo_id);
create index idx_reviews_pr on reviews(pull_request_id);
create index idx_findings_review on findings(review_id);
create index idx_findings_severity on findings(severity);
