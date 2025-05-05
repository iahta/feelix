package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/iahta/feelix/internal/database"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

type apiConfig struct {
	database *database.Queries
}

func main() {
	if err := godotenv.Load(); err != nil && !os.IsNotExist(err) {
		log.Fatal("error loading env")
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		log.Fatal("error loading database")
	}
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Unable to call database: %v", err)
	}

	dbQueries := database.New(db)
	ok := []byte("OK")
	apiCfg := apiConfig{
		database: dbQueries,
	}

	mux := http.NewServeMux()
	appHandler := http.StripPrefix("/app", http.FileServer(http.Dir("./frontend")))
	mux.Handle("/app/", appHandler)

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
