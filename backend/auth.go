package main

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"github.com/labstack/echo/v4"
	"google.golang.org/api/option"
)

var firebaseAuth *auth.Client

// InitFirebase initializes Firebase Admin SDK
func InitFirebase() error {
	ctx := context.Background()

	// Initialize Firebase with service account credentials
	// Set GOOGLE_APPLICATION_CREDENTIALS environment variable
	// or provide credentials file path
	opt := option.WithCredentialsFile("firebase-service-account.json")
	app, err := firebase.NewApp(ctx, nil, opt)
	if err != nil {
		// Try without credentials file (for development with emulator)
		app, err = firebase.NewApp(ctx, nil)
		if err != nil {
			return fmt.Errorf("error initializing firebase app: %v", err)
		}
	}

	firebaseAuth, err = app.Auth(ctx)
	if err != nil {
		return fmt.Errorf("error getting auth client: %v", err)
	}

	fmt.Println("Firebase Auth initialized successfully")
	return nil
}

// UserClaims represents authenticated user information
type UserClaims struct {
	UID         string `json:"uid"`
	Email       string `json:"email"`
	DisplayName string `json:"display_name"`
	Provider    string `json:"provider"`
}

// AuthMiddleware validates Firebase JWT tokens
func AuthMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		// Get Authorization header
		authHeader := c.Request().Header.Get("Authorization")
		if authHeader == "" {
			return c.JSON(http.StatusUnauthorized, map[string]string{
				"error": "Authorization header required",
			})
		}

		// Extract token from "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.JSON(http.StatusUnauthorized, map[string]string{
				"error": "Invalid authorization header format",
			})
		}
		idToken := parts[1]

		// Verify the ID token
		ctx := context.Background()
		token, err := firebaseAuth.VerifyIDToken(ctx, idToken)
		if err != nil {
			return c.JSON(http.StatusUnauthorized, map[string]string{
				"error": "Invalid or expired token",
			})
		}

		// Extract user claims
		claims := UserClaims{
			UID: token.UID,
		}

		// Get email from claims
		if email, ok := token.Claims["email"].(string); ok {
			claims.Email = email
		}

		// Get display name from claims
		if name, ok := token.Claims["name"].(string); ok {
			claims.DisplayName = name
		}

		// Get provider from Firebase sign-in info
		claims.Provider = token.Firebase.SignInProvider

		// Store user claims in context
		c.Set("user", claims)

		return next(c)
	}
}

// GetCurrentUser extracts user claims from context
func GetCurrentUser(c echo.Context) (*UserClaims, error) {
	user, ok := c.Get("user").(UserClaims)
	if !ok {
		return nil, fmt.Errorf("user not found in context")
	}
	return &user, nil
}

// OptionalAuthMiddleware allows requests without authentication but extracts user if present
func OptionalAuthMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		authHeader := c.Request().Header.Get("Authorization")
		if authHeader == "" {
			return next(c)
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return next(c)
		}
		idToken := parts[1]

		ctx := context.Background()
		token, err := firebaseAuth.VerifyIDToken(ctx, idToken)
		if err != nil {
			return next(c)
		}

		claims := UserClaims{
			UID: token.UID,
		}

		if email, ok := token.Claims["email"].(string); ok {
			claims.Email = email
		}

		if name, ok := token.Claims["name"].(string); ok {
			claims.DisplayName = name
		}

		claims.Provider = token.Firebase.SignInProvider

		c.Set("user", claims)

		return next(c)
	}
}
