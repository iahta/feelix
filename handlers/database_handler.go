package handlers

import (
	"net/http"

	"github.com/iahta/feelix/config"
)

func ResetHandler(cfg *config.ApiConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if cfg.Platform != "dev" {
			w.WriteHeader(http.StatusForbidden)
			w.Write([]byte("Reset is only allowed in dev environment."))
			return
		}
		cfg.Database.DeleteUsers(r.Context())
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Database reset to inital state."))
	}
}
