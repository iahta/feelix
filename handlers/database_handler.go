package handlers

import (
	"log"
	"net/http"

	"github.com/iahta/feelix/config"
)

func ResetHandler(cfg *config.ApiConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if cfg.Platform != "dev" {
			w.WriteHeader(http.StatusForbidden)
			_, err := w.Write([]byte("Reset is only allowed in dev environment."))
			if err != nil {
				log.Fatalf("Reset is only allowed in dev: %v", err)
				return
			}
			return
		}
		err := cfg.Database.DeleteUsers(r.Context())
		if err != nil {
			log.Fatalf("Error deleting user database: %v", err)
			return
		}
		w.WriteHeader(http.StatusOK)
		_, err = w.Write([]byte("Database reset to inital state."))
		if err != nil {
			log.Fatalf("Error resetting database: %v", err)
			return
		}
	}
}
