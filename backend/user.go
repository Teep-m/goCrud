package main

import (
	"context"
	"fmt"
	"time"

	"github.com/surrealdb/surrealdb.go"
	"github.com/surrealdb/surrealdb.go/pkg/models"
)

// User represents a user in the database
type User struct {
	ID          *models.RecordID `json:"id,omitempty"`
	FirebaseUID string           `json:"firebase_uid"`
	Email       string           `json:"email"`
	DisplayName string           `json:"display_name"`
	Provider    string           `json:"provider"`
	CreatedAt   string           `json:"created_at,omitempty"`
	UpdatedAt   string           `json:"updated_at,omitempty"`
}

// GetOrCreateUser finds an existing user by Firebase UID or creates a new one
func GetOrCreateUser(claims *UserClaims) (*User, error) {
	ctx := context.Background()

	// Try to find existing user by Firebase UID using Select with filter
	allUsers, err := surrealdb.Select[[]User](ctx, db, "user")
	if err == nil && allUsers != nil {
		for _, user := range *allUsers {
			if user.FirebaseUID == claims.UID {
				// Update user info if changed
				if user.Email != claims.Email || user.DisplayName != claims.DisplayName {
					updateQuery := fmt.Sprintf("UPDATE user:%s SET email = $email, display_name = $name, updated_at = $updated", user.ID.ID)
					_, _ = surrealdb.Query[any](ctx, db, updateQuery, map[string]interface{}{
						"email":   claims.Email,
						"name":    claims.DisplayName,
						"updated": time.Now().Format(time.RFC3339),
					})
					user.Email = claims.Email
					user.DisplayName = claims.DisplayName
				}
				return &user, nil
			}
		}
	}

	// Create new user
	newUser := User{
		FirebaseUID: claims.UID,
		Email:       claims.Email,
		DisplayName: claims.DisplayName,
		Provider:    claims.Provider,
		CreatedAt:   time.Now().Format(time.RFC3339),
		UpdatedAt:   time.Now().Format(time.RFC3339),
	}

	created, err := surrealdb.Create[User](ctx, db, "user", newUser)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %v", err)
	}

	fmt.Printf("Created new user: %s (%s)\n", claims.Email, claims.UID)
	return created, nil
}

// InitUserTable initializes the user table schema
func InitUserTable() {
	ctx := context.Background()

	// Define user table
	queries := []string{
		"DEFINE TABLE user SCHEMAFULL",
		"DEFINE FIELD firebase_uid ON user TYPE string",
		"DEFINE FIELD email ON user TYPE string",
		"DEFINE FIELD display_name ON user TYPE string",
		"DEFINE FIELD provider ON user TYPE string",
		"DEFINE FIELD created_at ON user TYPE string",
		"DEFINE FIELD updated_at ON user TYPE string",
		"DEFINE INDEX user_firebase_uid ON user FIELDS firebase_uid UNIQUE",
	}

	for _, q := range queries {
		_, err := surrealdb.Query[any](ctx, db, q, nil)
		if err != nil {
			fmt.Printf("Note (user table): %v\n", err)
		}
	}

	fmt.Println("User table initialized")
}
