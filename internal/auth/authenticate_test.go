package auth

import (
	"fmt"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

func TestMakeJWT(t *testing.T) {
	tokenSecret := "supersecretkey"
	userID := uuid.New()
	expiresIn := time.Hour

	token, err := MakeJWT(userID, tokenSecret, expiresIn)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var claims jwt.RegisteredClaims
	parsedToken, err := jwt.ParseWithClaims(token, &claims, func(token *jwt.Token) (interface{}, error) {
		//Ensure the signing method is as expected
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(tokenSecret), nil
	})
	if err != nil {
		t.Fatalf("error parsing token: %v", err)
	}
	if !parsedToken.Valid {
		t.Fatalf("token is not valid")
	}
	if claims.Issuer != "feelix" {
		t.Errorf("unexpected issuer, got %v, want %v", claims.Issuer, "feelix")
	}

	if claims.Subject != userID.String() {
		t.Errorf("unexpected subject, got %v, want %v", claims.Subject, userID.String())
	}

	if !claims.IssuedAt.Time.Before(time.Now().UTC()) {
		t.Errorf("IssuedAt is in the future: %v", claims.IssuedAt.Time)
	}

	if !claims.ExpiresAt.Time.After(time.Now().UTC()) {
		t.Errorf("ExpiresAt is in the past: %v", claims.ExpiresAt.Time)
	}
}

func TestValidateJWT(t *testing.T) {
	// Arrange: Set up common variables
	tokenSecret := "supersecretkey"
	userID := uuid.New()
	expiration := time.Minute // Token lasts for 1 minute

	// Create a valid JWT using MakeJWT
	validToken, err := MakeJWT(userID, tokenSecret, expiration)
	if err != nil {
		t.Fatalf("failed to create valid JWT: %v", err)
	}

	// Act & Assert: Validate a valid token
	returnedID, err := ValidateJWT(validToken, tokenSecret)
	if err != nil {
		t.Fatalf("unexpected error during valid token validation: %v", err)
	}
	if returnedID != userID {
		t.Errorf("unexpected user ID, got %v, want %v", returnedID, userID)
	}

	// Arrange: Create an expired token
	expiredToken, _ := MakeJWT(userID, tokenSecret, -time.Minute) // Expiration in the past

	// Act & Assert: Validate an expired token
	_, err = ValidateJWT(expiredToken, tokenSecret)
	if err == nil {
		t.Error("expected error for expired token, got nil")
	}

	// Arrange: Create a token signed with a different secret
	badSecret := "differentsecret"
	_, err = ValidateJWT(validToken, badSecret)
	if err == nil {
		t.Error("expected error for token with invalid signature, got nil")
	}
}
