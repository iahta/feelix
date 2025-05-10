package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"

	"github.com/iahta/feelix/config"
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
}

type MovieID struct {
	Title string `json:"title"`
	Imdb  string `json:"imdb"`
	Tmdb  string `json:"tmdb"`
}

type APIResponse struct {
	Movies []Movies `json:"movies"`
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

	movieID := MovieID{}
	err = json.NewDecoder(res.Body).Decode(&movieID)
	if err != nil {
		return MovieID{}, err
	}

	return movieID, nil
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

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(movies)
	}
}

//add handler, handler will be called by javascript, after search,
//create movie db items
//like button
//add movie to user
//user profile with liked movies
//show streaming options
//only show streaming options and like movies when locked in
