package model

type SignedUrlPayload struct {
	SignedUrl string `json:"signedUrl"`
	PublicUrl string `json:"publicUrl"`
}
