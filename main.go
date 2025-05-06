package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/iahta/feelix/config"
	"github.com/iahta/feelix/handlers"
	"github.com/joho/godotenv"
)

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
	appHandler := http.StripPrefix("/app", http.FileServer(http.Dir("./frontend")))
	mux.Handle("/app/", appHandler)
	mux.HandleFunc("POST /api/users", handlers.CreateUser(cfg))

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
