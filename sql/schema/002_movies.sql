-- +goose Up
CREATE TABLE movies (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP NOT NULL,
    movie_id INTEGER NOT NULL,
    original_title TEXT NOT NULL,
    title TEXT NOT NULL,
    overview TEXT NOT NULL,
    release_date TEXT NOT NULL,
    poster_path TEXT NOT NULL,
    vote_average FLOAT NOT NULL,
    imdb TEXT NOT NULL,
    tmdb INTEGER NOT NULL,
    user_id UUID NOT NULL,
    CONSTRAINT users_id
    FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE 
);

-- +goose Down
DROP TABLE movies;