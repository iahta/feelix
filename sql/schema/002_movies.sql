-- +goose Up
CREATE TABLE movies (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP NOT NULL,
    movie_id INT NOT NULL,
    original_title TEXT NOT NULL,
    title TEXT NOT NULL,
    overview TEXT,
    release_date TEXT,
    poster_path TEXT,
    vote_average FLOAT,
    imdb TEXT,
    tmdb TEXT,
    user_id UUID NOT NULL,
    CONSTRAINT users_id
    FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE 
)

-- +goose Down
DROP TABLE movies;