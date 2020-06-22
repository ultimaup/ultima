package main

import (
	"fmt"
	"net/http"
	"os"
)

func main() {
	fmt.Println("listening on port", os.Getenv("PORT"))
	http.HandleFunc("/", HelloServer)
	http.ListenAndServe(":"+os.Getenv("PORT"), nil)
}

// HelloServer used by main()
func HelloServer(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "hello from go, %s!", r.URL.Path[1:])
}
