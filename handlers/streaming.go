package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

type Show struct {
	ID               string                       `json:"id"` //movie id
	IMDBID           string                       `json:"imdbId"`
	Title            string                       `json:"title"`
	ImageSet         ImageSet                     `json:"imageSet"`         //movie posters
	StreamingOptions map[string][]StreamingOption `json:"streamingOptions"` //struct of countries services
}

type ImageSet struct {
	VerticalPoster     map[string]string `json:"verticalPoster"`
	HorizontalPoster   map[string]string `json:"horizontalPoster"`
	VerticalBackdrop   map[string]string `json:"verticalBackdrop"`
	HorizontalBackdrop map[string]string `json:"horizontalBackdrop"`
}

type StreamingOption struct {
	Service     Service `json:"service"`         //service struct
	Type        string  `json:"type"`            //subscription, buy, rent
	Link        string  `json:"link"`            //link to service
	Price       *Price  `json:"price,omitempty"` //price if avaialable
	ExpiresSoon bool    `json:"expiresSoon"`
}

type Service struct {
	ID             string          `json:"id"`             //serivce owner, i.e. hbo
	Name           string          `json:"name"`           //service name- max
	ThemeColorCode string          `json:"themeColorCode"` //service logo color
	ImageSet       ServiceImageSet `json:"imageSet"`       //service logo image, hbo max in .svg
}

type ServiceImageSet struct {
	LightThemeImage string `json:"lightThemeImage"`
	DarkThemeImage  string `json:"darkThemeImage"`
	WhiteImage      string `json:"whiteImage"`
}

type Price struct {
	Amount    string `json:"amount"`
	Currency  string `json:"currency"`
	Formatted string `json:"formatted"`
}

type StreamingInfo struct {
	VerticalPoster map[string]string
	ID             string
	Name           string
	StreamingLogo  string
	Type           string
}

type StreamOptions struct {
	Options StreamingInfo
}

func GetStreamingOptions(id string) (Show, error) {
	rapidKey := os.Getenv("RapidApiKey")
	if rapidKey == "" {
		return Show{}, fmt.Errorf("rapid key not retreived")
	}

	apiURL := "https://streaming-availability.p.rapidapi.com/shows/"

	req, err := http.NewRequest("GET", fmt.Sprintf("%s%s", apiURL, id), nil)
	if err != nil {
		return Show{}, err
	}
	req.Header.Add("x-rapidapi-key", rapidKey)
	req.Header.Add("x-rapidapi-host", "streaming-availability.p.rapidapi.com")

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return Show{}, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(res.Body)
		return Show{}, fmt.Errorf("API Error: %s - %s", res.Status, body)
	}

	var result Show
	err = json.NewDecoder(res.Body).Decode(&result)
	if err != nil {
		return Show{}, err
	}
	//have to iterate over the options to get them.
	for _, option := range result.StreamingOptions["us"] {
		fmt.Println(option.Type)
		fmt.Println(option.Service.Name)
	}

	return result, nil
}
