package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/surrealdb/surrealdb.go"
	"github.com/surrealdb/surrealdb.go/pkg/models"
)

// Transaction represents a financial transaction (income or expense)
type Transaction struct {
	ID          *models.RecordID `json:"id,omitempty"`
	UserID      string           `json:"user_id,omitempty"`
	Type        string           `json:"type"` // "income" or "expense"
	Amount      float64          `json:"amount"`
	Category    string           `json:"category"`
	Description string           `json:"description"`
	Date        string           `json:"date"`
	CreatedAt   string           `json:"created_at,omitempty"`
}

// Category represents a transaction category
type Category struct {
	ID     *models.RecordID `json:"id,omitempty"`
	UserID string           `json:"user_id,omitempty"`
	Name   string           `json:"name"`
	Type   string           `json:"type"` // "income" or "expense"
	Icon   string           `json:"icon"`
	Color  string           `json:"color"`
}

// Summary represents monthly financial summary
type Summary struct {
	TotalIncome  float64            `json:"total_income"`
	TotalExpense float64            `json:"total_expense"`
	Balance      float64            `json:"balance"`
	ByCategory   map[string]float64 `json:"by_category"`
}

var db *surrealdb.DB

func main() {
	e := echo.New()

	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
	}))

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
	authData := &surrealdb.Auth{
		Username: "root",
		Password: "root",
	}

	// Signin
	if _, err = db.SignIn(context.Background(), authData); err != nil {
		e.Logger.Printf("Failed to signin to SurrealDB: %v", err)
	} else {
		fmt.Println("Signed in to SurrealDB as root")

		// Define Namespace
		if _, err := surrealdb.Query[any](context.Background(), db, "DEFINE NAMESPACE finance;", nil); err != nil {
			e.Logger.Printf("Note: namespace might already exist: %v", err)
		}

		// Use Namespace
		if err := db.Use(context.Background(), "finance", ""); err != nil {
			e.Logger.Printf("Failed to use namespace: %v", err)
		}

		// Define Database
		if _, err := surrealdb.Query[any](context.Background(), db, "DEFINE DATABASE finance;", nil); err != nil {
			e.Logger.Printf("Note: database might already exist: %v", err)
		}

		// Use both
		if err = db.Use(context.Background(), "finance", "finance"); err != nil {
			e.Logger.Fatal(err)
		}
		fmt.Println("Selected namespace 'finance' and database 'finance'")

		// Initialize default categories
		initDefaultCategories()

		// Initialize user table
		InitUserTable()
	}

	// Initialize Firebase Auth
	if err := InitFirebase(); err != nil {
		e.Logger.Printf("Warning: Firebase not initialized: %v", err)
		e.Logger.Printf("Authentication will not be available")
	}

	// Routes
	e.GET("/", func(c echo.Context) error {
		return c.String(http.StatusOK, "Personal Finance Manager API")
	})

	// Protected routes (require authentication)
	api := e.Group("/api")
	api.Use(AuthMiddleware)

	// Auth routes
	api.GET("/auth/me", getCurrentUserHandler)

	// Transaction routes
	api.GET("/transactions", getTransactions)
	api.POST("/transactions", createTransaction)
	api.PUT("/transactions/:id", updateTransaction)
	api.DELETE("/transactions/:id", deleteTransaction)

	// Category routes (GET is public, others require auth)
	e.GET("/api/categories", getCategories) // Public - no auth required
	api.POST("/categories", createCategory)
	api.DELETE("/categories/:id", deleteCategory)

	// Summary route
	api.GET("/summary", getSummary)

	e.Logger.Fatal(e.Start(":8084"))
}

func initDefaultCategories() {
	defaultCategories := []Category{
		{Name: "給与", Type: "income", Icon: "💼", Color: "#22c55e"},
		{Name: "副業", Type: "income", Icon: "💰", Color: "#10b981"},
		{Name: "投資", Type: "income", Icon: "📈", Color: "#14b8a6"},
		{Name: "その他収入", Type: "income", Icon: "🎁", Color: "#06b6d4"},
		{Name: "食費", Type: "expense", Icon: "🍔", Color: "#ef4444"},
		{Name: "交通費", Type: "expense", Icon: "🚃", Color: "#f97316"},
		{Name: "住居費", Type: "expense", Icon: "🏠", Color: "#eab308"},
		{Name: "光熱費", Type: "expense", Icon: "💡", Color: "#84cc16"},
		{Name: "通信費", Type: "expense", Icon: "📱", Color: "#06b6d4"},
		{Name: "娯楽", Type: "expense", Icon: "🎮", Color: "#8b5cf6"},
		{Name: "医療費", Type: "expense", Icon: "🏥", Color: "#ec4899"},
		{Name: "衣服", Type: "expense", Icon: "👕", Color: "#f43f5e"},
		{Name: "教育", Type: "expense", Icon: "📚", Color: "#6366f1"},
		{Name: "その他支出", Type: "expense", Icon: "📦", Color: "#64748b"},
	}

	// Check if categories already exist
	existing, err := surrealdb.Select[[]Category](context.Background(), db, "category")
	if err == nil && existing != nil && len(*existing) > 0 {
		fmt.Printf("Categories already exist (%d), skipping initialization\n", len(*existing))
		return
	}

	for _, cat := range defaultCategories {
		_, err := surrealdb.Create[Category](context.Background(), db, "category", cat)
		if err != nil {
			fmt.Printf("Failed to create category %s: %v\n", cat.Name, err)
		}
	}
	fmt.Println("Default categories initialized")
}

// getCurrentUserHandler returns the current authenticated user
func getCurrentUserHandler(c echo.Context) error {
	claims, err := GetCurrentUser(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Not authenticated"})
	}

	// Get or create user in database
	user, err := GetOrCreateUser(claims)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, user)
}

// Transaction handlers
func getTransactions(c echo.Context) error {
	claims, err := GetCurrentUser(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Not authenticated"})
	}

	// Get all transactions and filter by user_id
	data, err := surrealdb.Select[[]Transaction](context.Background(), db, "transaction")
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	var userTransactions []Transaction
	if data != nil {
		for _, tx := range *data {
			if tx.UserID == claims.UID {
				userTransactions = append(userTransactions, tx)
			}
		}
	}

	return c.JSON(http.StatusOK, userTransactions)
}

func createTransaction(c echo.Context) error {
	claims, err := GetCurrentUser(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Not authenticated"})
	}

	tx := new(Transaction)
	if err := c.Bind(tx); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	// Validate
	if tx.Type != "income" && tx.Type != "expense" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Type must be 'income' or 'expense'"})
	}
	if tx.Amount <= 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Amount must be positive"})
	}

	// Set user_id and created_at
	tx.UserID = claims.UID
	tx.CreatedAt = time.Now().Format(time.RFC3339)

	created, err := surrealdb.Create[Transaction](context.Background(), db, "transaction", tx)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusCreated, created)
}

func updateTransaction(c echo.Context) error {
	idParam := c.Param("id")

	tx := new(Transaction)
	if err := c.Bind(tx); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	// Build record ID
	var recordID string
	if strings.HasPrefix(idParam, "transaction:") {
		recordID = idParam
	} else {
		recordID = "transaction:" + idParam
	}

	// Use Merge to update
	query := fmt.Sprintf("UPDATE %s MERGE $data", recordID)
	updateData := map[string]interface{}{
		"type":        tx.Type,
		"amount":      tx.Amount,
		"category":    tx.Category,
		"description": tx.Description,
		"date":        tx.Date,
	}

	_, err := surrealdb.Query[any](context.Background(), db, query, map[string]interface{}{"data": updateData})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Transaction updated"})
}

func deleteTransaction(c echo.Context) error {
	idParam := c.Param("id")

	var recordID string
	if strings.HasPrefix(idParam, "transaction:") {
		recordID = idParam
	} else {
		recordID = "transaction:" + idParam
	}

	query := fmt.Sprintf("DELETE %s", recordID)
	_, err := surrealdb.Query[any](context.Background(), db, query, nil)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Transaction deleted"})
}

// Category handlers
func getCategories(c echo.Context) error {
	data, err := surrealdb.Select[[]Category](context.Background(), db, "category")
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	if data == nil {
		return c.JSON(http.StatusOK, []Category{})
	}
	return c.JSON(http.StatusOK, data)
}

func createCategory(c echo.Context) error {
	cat := new(Category)
	if err := c.Bind(cat); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	if cat.Type != "income" && cat.Type != "expense" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Type must be 'income' or 'expense'"})
	}

	created, err := surrealdb.Create[Category](context.Background(), db, "category", cat)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	return c.JSON(http.StatusCreated, created)
}

func deleteCategory(c echo.Context) error {
	idParam := c.Param("id")

	var recordID string
	if strings.HasPrefix(idParam, "category:") {
		recordID = idParam
	} else {
		recordID = "category:" + idParam
	}

	query := fmt.Sprintf("DELETE %s", recordID)
	_, err := surrealdb.Query[any](context.Background(), db, query, nil)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Category deleted"})
}

// Summary handler
func getSummary(c echo.Context) error {
	claims, err := GetCurrentUser(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Not authenticated"})
	}

	// Get all transactions and filter by user_id
	data, err := surrealdb.Select[[]Transaction](context.Background(), db, "transaction")
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	summary := Summary{
		ByCategory: make(map[string]float64),
	}

	if data != nil {
		for _, tx := range *data {
			if tx.UserID == claims.UID {
				if tx.Type == "income" {
					summary.TotalIncome += tx.Amount
				} else {
					summary.TotalExpense += tx.Amount
					summary.ByCategory[tx.Category] += tx.Amount
				}
			}
		}
	}

	summary.Balance = summary.TotalIncome - summary.TotalExpense

	return c.JSON(http.StatusOK, summary)
}
