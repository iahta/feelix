package config

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/iahta/feelix/internal/database"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

type ApiConfig struct {
	Database         *database.Queries
	JWTSecret        string
	Platform         string
	FilepathRoot     string
	AssetsRoot       string
	S3Bucket         string
	S3Region         string
	S3CfDistribution string
	S3Client         *s3.Client
	Port             string
}

func NewApiConfig() (*ApiConfig, error) {
	if err := godotenv.Load(); err != nil && !os.IsNotExist(err) {
		log.Fatal("error loading env")
	}
	dbURL := os.Getenv("DB_URL")
	JWT_Secret := os.Getenv("JWT_SECRET")
	Platform := os.Getenv("PLATFORM")
	filePathRoot := os.Getenv("FILEPATH_ROOT")
	s3Bucket := os.Getenv("S3_BUCKET")
	s3Region := os.Getenv("S3_REGION")
	s3CfDistribution := os.Getenv("S3_CF_DISTRO")
	port := os.Getenv("PORT")
	if dbURL == "" {
		return nil, fmt.Errorf("error retrieving database")
	}
	if JWT_Secret == "" {
		return nil, fmt.Errorf("JWT_SECRET must be set")
	}
	if Platform == "" {
		return nil, fmt.Errorf("Platform must be set")
	}
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		return nil, fmt.Errorf("unable to call database: %v", err)
	}
	if port == "" {
		log.Fatal("PORT environment variable is not set")
	}
	if filePathRoot == "" {
		log.Fatal("FILEPATH_ROOT environment variable is not set")
	}
	if s3Bucket == "" {
		log.Fatal("S3_BUCKET environment variable is not set")
	}
	if s3Region == "" {
		log.Fatal("S3_REGION environment variable is not set")
	}
	if s3CfDistribution == "" {
		log.Fatal("S3_CF_DISTRO environment variable is not set")
	}
	s3Client, err := config.LoadDefaultConfig(context.TODO(), config.WithRegion(s3Region))
	if err != nil {
		log.Fatal("S3Client unable to be configured")
	}
	newS3Client := s3.NewFromConfig(s3Client)

	dbQueries := database.New(db) //newclient?
	return &ApiConfig{
		Database:         dbQueries,
		JWTSecret:        JWT_Secret,
		Platform:         Platform,
		FilepathRoot:     filePathRoot,
		S3Bucket:         s3Bucket,
		S3Region:         s3Region,
		S3CfDistribution: s3CfDistribution,
		S3Client:         newS3Client,
		Port:             port,
	}, nil
}
