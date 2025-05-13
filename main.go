package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"text/template"
	"time"

	"github.com/iahta/feelix/config"
	"github.com/iahta/feelix/handlers"
	"github.com/joho/godotenv"
)

var templates = template.Must(template.ParseGlob("./app/*.html"))

func main() {
	if err := godotenv.Load(); err != nil && !os.IsNotExist(err) {
		log.Fatal("error loading env")
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
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

	mux.HandleFunc("GET /api/healthz", func(w http.ResponseWriter, req *http.Request) {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		w.Write(ok)
	})

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	log.Println("Server running at http://localhost:" + port)
	log.Fatal(server.ListenAndServe())

}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "GET":
		templates.ExecuteTemplate(w, "login.html", nil)
	case "POST":
		email := r.FormValue("email")
		password := r.FormValue("password")
		// For now, just print values. Add logic here.
		fmt.Printf("Login attempt: %s / %s\n", email, password)
		http.Redirect(w, r, "/login", http.StatusSeeOther)
	}
}

func signupHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "GET":
		templates.ExecuteTemplate(w, "signup.html", nil)
	case "POST":
		email := r.FormValue("email")
		password := r.FormValue("password")
		confirm := r.FormValue("confirm_password")
		if password != confirm {
			fmt.Println("Passwords do not match")
		} else {
			// You would store the user in DB here.
			fmt.Printf("New signup: %s / %s\n", email, password)
		}
		http.Redirect(w, r, "/signup", http.StatusSeeOther)
	}
}

func nocacheMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		next.ServeHTTP(w, r)
	})
}
