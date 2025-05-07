package config

import (
	"database/sql"
	"fmt"
	"os"

	"github.com/iahta/feelix/internal/database"
	_ "github.com/lib/pq"
)

type ApiConfig struct {
	Database  *database.Queries
	JWTSecret string
}

func NewApiConfig() (*ApiConfig, error) {
	dbURL := os.Getenv("DB_URL")
	JWT_Secret := os.Getenv("JWT_SECRET")
	if dbURL == "" {
		return nil, fmt.Errorf("error retrieving database")
	}
	if JWT_Secret == "" {
		return nil, fmt.Errorf("JWT_SECRET must be set")
	}
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		return nil, fmt.Errorf("unable to call database: %v", err)
	}

	dbQueries := database.New(db)
	return &ApiConfig{
		Database:  dbQueries,
		JWTSecret: JWT_Secret,
	}, nil
}
