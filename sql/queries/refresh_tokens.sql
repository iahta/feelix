-- #nosec G101 -- false positive: SQL uses parameterized inputs, no hardcoded credentials
-- name: CreateRefreshToken :one
INSERT INTO refresh_tokens(token, created_at, updated_at, user_id, expires_at, revoked_at)
VALUES(
    $1,
    NOW(),
    NOW(),
    $2,
    $3,
    NULL
)
RETURNING *;

-- #nosec G101 -- false positive: SQL uses parameterized inputs, no hardcoded credentials
-- name: GetRefreshToken :one
SELECT *
FROM refresh_tokens
WHERE token = $1;

-- #nosec G101 -- false positive: SQL uses parameterized inputs, no hardcoded credentials
-- name: UpdateRefreshToken :exec
UPDATE refresh_tokens
SET updated_at = $1, revoked_at = $2
WHERE token = $3;

-- #nosec G101 -- false positive: SQL uses parameterized inputs, no hardcoded credentials
-- name: GetUserFromRefreshToken :one
SELECT users.*
FROM users
JOIN refresh_tokens ON users.id = refresh_tokens.user_id
WHERE refresh_tokens.token = $1
  AND refresh_tokens.expires_at > NOW()
  AND refresh_tokens.revoked_at IS NULL;
