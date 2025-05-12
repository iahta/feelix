package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/iahta/feelix/config"
	"github.com/iahta/feelix/internal/auth"
	"github.com/iahta/feelix/internal/database"
	"github.com/iahta/feelix/utils"
)

type User struct {
	ID        uuid.UUID `json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Email     string    `json:"email"`
}

func CreateUser(cfg *config.ApiConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		type parameters struct {
			Password        string `json:"password"`
			Email           string `json:"email"`
			ConfirmPassword string `json:"confirm_password"`
		}
		type response struct {
			User
		}

		decoder := json.NewDecoder(r.Body)
		params := parameters{}
		err := decoder.Decode(&params)
		if err != nil {
			log.Printf("Error decoding json: %s", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Something Went Wrong", err)
			return
		}
		if !isValidEmail(params.Email) {
			log.Printf("Invalid email: %s", params.Email)
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid Email", fmt.Errorf("invalid email"))
			return
		}
		if params.Password != params.ConfirmPassword {
			log.Printf("Passwords do not match:")
			utils.RespondWithError(w, http.StatusBadRequest, "Passwords do not match", fmt.Errorf("passwords do not match"))
			return
		}
		hashedPassword, err := auth.HashPassword(params.Password)
		if err != nil {
			log.Printf("failed to hash password %v", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Something went wrong", err)
			return
		}

		user, err := cfg.Database.CreateUser(r.Context(), database.CreateUserParams{
			Email:        params.Email,
			PasswordHash: hashedPassword,
		})
		if err != nil {
			log.Printf("failed to create user: %v", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Something went wrong", err)
			return
		}

		utils.RespondWithJSON(w, http.StatusCreated, response{
			User: User{
				ID:        user.ID,
				CreatedAt: user.CreatedAt,
				UpdatedAt: user.UpdatedAt,
				Email:     user.Email,
			},
		})

	}

}

func isValidEmail(email string) bool {
	return strings.Contains(email, "@")
}

func LoginHandler(cfg *config.ApiConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		type parameters struct {
			Password string `json:"password"`
			Email    string `json:"email"`
		}
		type response struct {
			ID           uuid.UUID `json:"id"`
			CreatedAt    time.Time `json:"created_at"`
			UpdatedAt    time.Time `json:"updated_at"`
			Email        string    `json:"email"`
			Token        string    `json:"token"`
			RefreshToken string    `json:"refresh_token"`
		}
		decoder := json.NewDecoder(r.Body)
		params := parameters{}
		err := decoder.Decode(&params)
		if err != nil {
			log.Printf("Error decdoing json: %s", err)
			utils.RespondWithError(w, http.StatusInternalServerError, "error decoding json", err)
			return
		}
		if !isValidEmail(params.Email) {
			log.Printf("Invalid email: %s", params.Email)
			utils.RespondWithError(w, http.StatusUnauthorized, "Incorrect email or password", fmt.Errorf("incorrect email or password"))
			return
		}
		user, err := cfg.Database.GetUserByEmail(r.Context(), params.Email)
		if err != nil {
			utils.RespondWithError(w, http.StatusUnauthorized, "Incorrect email or password", fmt.Errorf("incorrect email or password"))
			return
		}
		err = auth.CheckPasswordHash(user.PasswordHash, params.Password)
		if err != nil {
			utils.RespondWithError(w, http.StatusUnauthorized, "Incorrect email or password", fmt.Errorf("incorrect email or password"))
			return
		}
		exp := time.Duration(3600) * time.Second
		token, err := auth.MakeJWT(user.ID, cfg.JWTSecret, exp)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Access Token failed", err)
			return
		}

		refresh_token, err := auth.MakeRefreshToken()
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Access Token failed", err)
			return
		}

		_, err = cfg.Database.CreateRefreshToken(r.Context(), database.CreateRefreshTokenParams{
			Token:     refresh_token,
			UserID:    user.ID,
			ExpiresAt: time.Now().AddDate(0, 0, 60),
		})
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Access Token failed", err)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, response{
			ID:           user.ID,
			CreatedAt:    user.CreatedAt,
			UpdatedAt:    user.UpdatedAt,
			Email:        user.Email,
			Token:        token,
			RefreshToken: refresh_token,
		})

	}
}

//update main go with handlers
// revoke handler creation

func RefreshHandler(cfg *config.ApiConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader, err := auth.GetBearerToken(r.Header)
		if err != nil {
			utils.RespondWithError(w, http.StatusUnauthorized, "Invalid credentials", err)
			return
		}
		user, err := cfg.Database.GetUserFromRefreshToken(r.Context(), authHeader)
		if err != nil {
			utils.RespondWithError(w, http.StatusUnauthorized, "Invalid credentials", err)
			return
		}

		exp := time.Duration(3600 * time.Second)
		token, err := auth.MakeJWT(user.ID, cfg.JWTSecret, exp)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Unable to create new token", err)
			return
		}
		type response struct {
			Token string `json:"token"`
		}
		utils.RespondWithJSON(w, http.StatusOK, response{
			Token: token,
		})

	}

}

func RevokeHandler(cfg *config.ApiConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader, err := auth.GetBearerToken(r.Header)
		if err != nil {
			utils.RespondWithError(w, http.StatusUnauthorized, "Invalid credentials", err)
			return
		}
		_, err = cfg.Database.GetUserFromRefreshToken(r.Context(), authHeader)
		if err != nil {
			utils.RespondWithError(w, http.StatusUnauthorized, "Invalid credentials", err)
			return
		}
		err = cfg.Database.UpdateRefreshToken(r.Context(), database.UpdateRefreshTokenParams{
			UpdatedAt: time.Now(),
			RevokedAt: sql.NullTime{
				Time:  time.Now(),
				Valid: true,
			},
			Token: authHeader,
		})
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to revoke refresh token", err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}
