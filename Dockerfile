# Multi-stage build for CRM and SNS backends
FROM golang:1.21-alpine AS go-builder

# Install build dependencies
RUN apk add --no-cache git

# CRM Backend
WORKDIR /app/crm
COPY crm/backend/go.mod crm/backend/go.sum ./
RUN go mod download

COPY crm/backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# SNS Backend  
WORKDIR /app/sns
COPY sns/backend/go.mod sns/backend/go.sum ./
RUN go mod download

COPY sns/backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Runtime image
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

# Copy binaries
COPY --from=go-builder /app/crm/main ./crm-main
COPY --from=go-builder /app/sns/main ./sns-main

# Expose ports
EXPOSE 8080 8081

# Default command (can be overridden)
CMD ["./crm-main"]
