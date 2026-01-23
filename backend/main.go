package main

import (
	"fmt"
	"net/http"
	"os"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/surrealdb/surrealdb.go"
)

type Message struct {
	ID      string `json:"id,omitempty"`
	Content string `json:"content"`
}

var db *surrealdb.DB

func main() {
	e := echo.New()

	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	// Connect to SurrealDB
	// defined in docker-compose, address will be "ws://surrealdb:8000/rpc"
	// but might fail if db is not up yet, so in production use a retry mechanism or wait-for-it
	var err error
	surrealURL := os.Getenv("SURREAL_URL")
	if surrealURL == "" {
		surrealURL = "ws://localhost:8000/rpc"
	}

	fmt.Printf("Connecting to SurrealDB at %s\n", surrealURL)
	db, err = surrealdb.New(surrealURL)
	if err != nil {
		e.Logger.Fatal(err)
	}

	// Auth
	authData := &surrealdb.Auth{
		Namespace: "test",
		Database:  "test",
		Username:  "root",
		Password:  "root",
	}
	if _, err = db.Signin(authData); err != nil {
		// Try using wait-for approach in reallife, for now just log
		e.Logger.Printf("Failed to signin to SurrealDB: %v", err)
	} else {
		// Select namespace/db
		if _, err = db.Use(authData.Namespace, authData.Database); err != nil {
			e.Logger.Fatal(err)
		}
	}

	e.GET("/", func(c echo.Context) error {
		return c.String(http.StatusOK, "Hello, World!")
	})

	e.GET("/api/messages", func(c echo.Context) error {
		// Example query
		data, err := db.Select("message")
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
		}

		// data is interface{}, need to be careful about marshalling
		return c.JSON(http.StatusOK, data)
	})

	e.POST("/api/messages", func(c echo.Context) error {
		msg := new(Message)
		if err := c.Bind(msg); err != nil {
			return err
		}

		data, err := db.Create("message", msg)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusCreated, data)
	})

	e.Logger.Fatal(e.Start(":8080"))
}
