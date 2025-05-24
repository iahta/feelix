package main

import (
	"log"
	"net/http"
	"time"

	"github.com/iahta/feelix/config"
	"github.com/iahta/feelix/handlers"
)

func main() {
	cfg, err := config.NewApiConfig()
	if err != nil {
		log.Fatal(err)
	}

	ok := []byte("OK")

	mux := http.NewServeMux()
	appHandler := http.StripPrefix("/app", http.FileServer(http.Dir("./app")))
	mux.Handle("/app/", appHandler)
	mux.HandleFunc("POST /api/users", handlers.CreateUser(cfg))
	mux.HandleFunc("POST /api/login", handlers.LoginHandler(cfg))
	mux.HandleFunc("GET /api/search", handlers.SearchMoviesHandler(cfg))
	mux.HandleFunc("POST /api/like", handlers.LikeMovie(cfg))
	mux.HandleFunc("POST /api/refresh", handlers.RefreshHandler(cfg))
	mux.HandleFunc("POST /api/revoke", handlers.RevokeHandler(cfg))
	mux.HandleFunc("POST /api/reset", handlers.ResetHandler(cfg))
	mux.HandleFunc("GET /api/user/likes", handlers.GetLikedMovies(cfg))
	mux.HandleFunc("DELETE /api/unlike", handlers.UnlikeMovie(cfg))

	mux.HandleFunc("GET /api/healthz", func(w http.ResponseWriter, req *http.Request) {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		w.Write(ok)
	})

	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	log.Printf("Server running at http://localhost:%s/app/\n", cfg.Port)
	log.Fatal(server.ListenAndServe())

}

/*
func nocacheMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		next.ServeHTTP(w, r)
	})
}
*/
