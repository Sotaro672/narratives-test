# SNS Backend Dockerfile
FROM golang:1.21 AS builder

WORKDIR /app
COPY . .

ENV CGO_ENABLED=0 GOOS=linux GOARCH=amd64
RUN go mod download
RUN go build -o server .

# 本番用の軽量イメージ
FROM debian:bullseye-slim

WORKDIR /app
COPY --from=builder /app/server /app/server
COPY --from=builder /app/narratives-test-00fc9efaa447.json /app/narratives-test-00fc9efaa447.json

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

# 環境変数を設定
ENV PORT=8080
ENV GCS_BUCKET_NAME=narratives-test-storage
ENV GCS_PROJECT_ID=narratives-test-64976
ENV GCS_CREDENTIAL_FILE=/app/narratives-test-00fc9efaa447.json
ENV GCS_GOOGLE_ACCESS_ID=765852113927-compute@developer.gserviceaccount.com

EXPOSE 8080

ENTRYPOINT ["/app/server"]
