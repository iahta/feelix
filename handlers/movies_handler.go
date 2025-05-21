package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"

	"github.com/iahta/feelix/config"
	"github.com/iahta/feelix/internal/auth"
	"github.com/iahta/feelix/internal/database"
	"github.com/iahta/feelix/utils"
)

type Movies struct {
	ID            int     `json:"id"`
	OriginalTitle string  `json:"original_title"`
	Title         string  `json:"title"`
	Overview      string  `json:"overview"`
	ReleaseDate   string  `json:"release_date"`
	PosterPath    string  `json:"poster_path"`
	VoteAverage   float64 `json:"vote_average"`
	Liked         bool    `json:"liked"`
}

type MovieID struct {
	Title string `json:"title"`
	Imdb  string `json:"imdb"`
	Tmdb  int    `json:"tmdb"`
}

type APIResponse struct {
	Movies []Movies `json:"movies"`
}

type EnrichedMovie struct {
	MovieID       int
	Title         string
	OriginalTitle string
	Overview      string
	ReleaseDate   string
	StreamingUS   []StreamingOption
}

func SearchMovies(query string) ([]Movies, error) {
	rapidKey := os.Getenv("RapidApiKey")
	if rapidKey == "" {
		return nil, fmt.Errorf("rapid key not retreived")
	}
	apiURL := "https://ai-movie-recommender.p.rapidapi.com/api/search"
	params := url.Values{}
	params.Add("q", query)

	req, err := http.NewRequest("GET", fmt.Sprintf("%s?%s", apiURL, params.Encode()), nil)
	if err != nil {
		return nil, err
	}

	req.Header.Add("x-rapidapi-key", rapidKey)
	req.Header.Add("x-rapidapi-host", "ai-movie-recommender.p.rapidapi.com")

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(res.Body)
		return nil, fmt.Errorf("API Error: %s - %s", res.Status, body)
	}

	var result APIResponse
	err = json.NewDecoder(res.Body).Decode(&result)
	if err != nil {
		return nil, err
	}

	return result.Movies, nil
}

func GetMovieId(title string) (MovieID, error) {
	rapidKey := os.Getenv("RapidApiKey")
	if rapidKey == "" {
		return MovieID{}, fmt.Errorf("rapid key not retreived")
	}
	apiURL := "https://ai-movie-recommender.p.rapidapi.com/api/getID"
	params := url.Values{}
	params.Add("title", title)

	req, err := http.NewRequest("GET", fmt.Sprintf("%s?%s", apiURL, params.Encode()), nil)
	if err != nil {
		return MovieID{}, err
	}

	req.Header.Add("x-rapidapi-key", rapidKey)
	req.Header.Add("x-rapidapi-host", "ai-movie-recommender.p.rapidapi.com")

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return MovieID{}, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(res.Body)
		return MovieID{}, fmt.Errorf("API Error: %s - %s", res.Status, body)
	}
	var ids []MovieID
	err = json.NewDecoder(res.Body).Decode(&ids)
	if err != nil {
		return MovieID{}, err
	}

	return ids[0], nil
}

func SearchMoviesHandler(cfg *config.ApiConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query().Get("q")
		if query == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Query parameter 'q' is required", fmt.Errorf("missing parameter"))
			return
		}

		movies, err := SearchMovies(query)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "unable to search movies", err)
			return
		}
		authHeader, err := auth.GetBearerToken(r.Header)
		if err == nil {
			userID, err := auth.ValidateJWT(authHeader, cfg.JWTSecret)
			if err != nil {
				utils.RespondWithError(w, http.StatusUnauthorized, "Invalid Credentials", err)
				return
			}
			likedMovies, err := cfg.Database.RetrieveMoviesByUser(r.Context(), userID)
			if err != nil {
				utils.RespondWithError(w, http.StatusInternalServerError, "Error returning liked movies", err)
				return
			}
			for i, movie := range movies {
				for _, likedMovie := range likedMovies {
					if movie.ID == int(likedMovie.MovieID) {
						movies[i].Liked = true
					}
				}
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(movies)
	}
}

func LikeMovie(cfg *config.ApiConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var movie Movies

		authHeader, err := auth.GetBearerToken(r.Header)
		if err != nil {
			utils.RespondWithError(w, http.StatusUnauthorized, "Missing Authorization", err)
			return
		}
		userID, err := auth.ValidateJWT(authHeader, cfg.JWTSecret)
		if err != nil {
			utils.RespondWithError(w, http.StatusUnauthorized, "Invalid Credentials", err)
			return
		}
		err = json.NewDecoder(r.Body).Decode(&movie)
		if err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid JSON Body", err)
			return
		}
		movieImdb, err := GetMovieId(movie.OriginalTitle)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Unable to retrieve ID", err)
			return
		}
		_, err = cfg.Database.LikedMovie(r.Context(), database.LikedMovieParams{
			MovieID:       int32(movie.ID),
			OriginalTitle: movie.OriginalTitle,
			Title:         movie.Title,
			Overview:      movie.Overview,
			ReleaseDate:   movie.ReleaseDate,
			PosterPath:    movie.PosterPath,
			VoteAverage:   movie.VoteAverage,
			Imdb:          movieImdb.Imdb,
			Tmdb:          int32(movieImdb.Tmdb),
			UserID:        userID,
		})
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Unable to save movie", err)
			return
		}

	}
}

func UnlikeMovie(cfg *config.ApiConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		type response struct {
			ID int `json:"id"`
		}
		authHeader, err := auth.GetBearerToken(r.Header)
		if err != nil {
			utils.RespondWithError(w, http.StatusUnauthorized, "Missing Authorization", err)
			return
		}
		userID, err := auth.ValidateJWT(authHeader, cfg.JWTSecret)
		if err != nil {
			utils.RespondWithError(w, http.StatusUnauthorized, "Invalid Credentials", err)
			return
		}
		if r.Body == nil {
			http.Error(w, "Empty body", http.StatusBadRequest)
			return
		}
		moviePayload := response{}
		if err := json.NewDecoder(r.Body).Decode(&moviePayload); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid JSON Body", err)
			return
		}

		err = cfg.Database.UnlikeMovie(r.Context(), database.UnlikeMovieParams{
			MovieID: int32(moviePayload.ID),
			UserID:  userID,
		})
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Unable to unlike movie", err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

func GetLikedMovies(cfg *config.ApiConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader, err := auth.GetBearerToken(r.Header)
		if err != nil {
			utils.RespondWithError(w, http.StatusUnauthorized, "Missing Authorization", err)
			return
		}
		userID, err := auth.ValidateJWT(authHeader, cfg.JWTSecret)
		if err != nil {
			utils.RespondWithError(w, http.StatusUnauthorized, "Invalid Credentials", err)
			return
		}
		movies, err := cfg.Database.RetrieveMoviesByUser(r.Context(), userID)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Unable to retrieve liked movies", err)
			return
		}

		var enriched []EnrichedMovie
		for _, movie := range movies {
			streaming, err := GetStreamingOptions(movie.Imdb)
			if err != nil {
				utils.RespondWithError(w, http.StatusInternalServerError, "Failed to get streaming options", err)
				continue
			}

			usOptions := streaming.StreamingOptions["us"]

			enriched = append(enriched, EnrichedMovie{
				MovieID:       int(movie.MovieID),
				Title:         movie.Title,
				OriginalTitle: movie.OriginalTitle,
				Overview:      movie.Overview,
				ReleaseDate:   movie.ReleaseDate,
				StreamingUS:   usOptions,
			})

		}
		//get each movie streaming options
		//build new struct that sends all info to populate streaming options on user
		//send new encoded struct

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(enriched)
	}
}

//make refresh tokens

//add handler, handler will be called by javascript, after search,
//create movie db items
//like button
//add movie to user
//user profile with liked movies
//show streaming options
//only show streaming options and like movies when locked in
