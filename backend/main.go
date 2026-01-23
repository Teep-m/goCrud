package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/surrealdb/surrealdb.go"
	"github.com/surrealdb/surrealdb.go/pkg/models"
)

type Message struct {
	ID      *models.RecordID `json:"id,omitempty"`
	Content string           `json:"content"`
}

var db *surrealdb.DB

func main() {
	e := echo.New()

	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	// Connect to SurrealDB
	var err error
	surrealURL := os.Getenv("SURREAL_URL")
	if surrealURL == "" {
		surrealURL = "ws://localhost:8000/rpc"
	}

	fmt.Printf("Connecting to SurrealDB at %s\n", surrealURL)

	// Retry connection loop
	for i := 0; i < 30; i++ {
		db, err = surrealdb.New(surrealURL)
		if err == nil {
			break
		}
		fmt.Printf("Failed to connect to SurrealDB (attempt %d/30): %v\n", i+1, err)
		time.Sleep(1 * time.Second)
	}

	if err != nil {
		e.Logger.Fatal(err)
	}

	// Auth with Root user
	// We don't specify Namespace/Database here to avoid "authentication failed" if they don't exist
	authData := &surrealdb.Auth{
		Username: "root",
		Password: "root",
	}

	// Signin
	if _, err = db.SignIn(context.Background(), authData); err != nil {
		e.Logger.Printf("Failed to signin to SurrealDB: %v", err)
	} else {
		fmt.Println("Signed in to SurrealDB as root")

		// Create Namespace and Database if they don't exist
		// Since we are root, we can define them.

		// 1. Define Namespace
		if _, err := surrealdb.Query[any](context.Background(), db, "DEFINE NAMESPACE test;", nil); err != nil {
			e.Logger.Printf("Failed to define namespace: %v", err)
		}

		// 2. Use Namespace (to define database inside it)
		// We technically only need to switch to the NS to define a DB in it.
		if err := db.Use(context.Background(), "test", ""); err != nil {
			e.Logger.Printf("Failed to use namespace: %v", err)
		}

		// 3. Define Database
		if _, err := surrealdb.Query[any](context.Background(), db, "DEFINE DATABASE test;", nil); err != nil {
			e.Logger.Printf("Failed to define database: %v", err)
		}

		// 4. Use both
		if err = db.Use(context.Background(), "test", "test"); err != nil {
			e.Logger.Fatal(err)
		}
		fmt.Println("Selected namespace 'test' and database 'test'")
	}

	e.GET("/", func(c echo.Context) error {
		return c.String(http.StatusOK, "Hello, World!")
	})

	e.GET("/api/messages", func(c echo.Context) error {
		// Select all messages
		data, err := surrealdb.Select[[]Message](context.Background(), db, "message")
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusOK, data)
	})

	e.POST("/api/messages", func(c echo.Context) error {
		msg := new(Message)
		if err := c.Bind(msg); err != nil {
			return err
		}

		// Create message
		created, err := surrealdb.Create[Message](context.Background(), db, "message", msg)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusCreated, created)
	})

	e.Logger.Fatal(e.Start(":8084"))
}
