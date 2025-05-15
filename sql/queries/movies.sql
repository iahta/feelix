-- name: LikedMovie :one 
INSERT INTO movies (id, created_at, movie_id, original_title, title, overview, release_date, poster_path, vote_average, imdb, tmdb, user_id)
VALUES (
    gen_random_uuid(),
    NOW(),
    $1, 
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    $8,
    $9,
    $10
)
RETURNING *;

-- name: GrabMovie :one
SELECT id, created_at, movie_id, original_title, title, overview, release_date, poster_path, vote_average, imdb, tmdb, user_id FROM movies
WHERE original_title = $1;

-- name: UnlikeMovie :exec
DELETE FROM movies
WHERE movie_id = $1 AND user_id = $2;

-- name: RetrieveMoviesByUser :many
SELECT id, created_at, movie_id, original_title, title, overview, release_date, poster_path, vote_average, imdb, tmdb, user_id FROM movies
WHERE user_id = $1
ORDER BY created_at ASC;

