package config

import (
	"database/sql"
	"fmt"
	"os"

	"github.com/iahta/feelix/internal/database"
	_ "github.com/lib/pq"
)

type ApiConfig struct {
	Database *database.Queries
}

func NewApiConfig() (*ApiConfig, error) {
	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		return nil, fmt.Errorf("error retrieving database")
	}
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		return nil, fmt.Errorf("unable to call database: %v", err)
	}

	dbQueries := database.New(db)
	return &ApiConfig{
		Database: dbQueries,
	}, nil
}
