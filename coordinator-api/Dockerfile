# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install kubectl, Azure CLI, and kubelogin for AKS authentication
RUN apk add --no-cache curl python3 py3-pip bash && \
    # Install kubectl
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/ && \
    # Install Azure CLI
    pip3 install --break-system-packages azure-cli && \
    # Install kubelogin for Azure AD auth
    curl -LO "https://github.com/Azure/kubelogin/releases/download/v0.1.0/kubelogin-linux-amd64.zip" && \
    unzip kubelogin-linux-amd64.zip -d /usr/local/bin/ && \
    chmod +x /usr/local/bin/bin/linux_amd64/kubelogin && \
    mv /usr/local/bin/bin/linux_amd64/kubelogin /usr/local/bin/kubelogin && \
    rm -rf kubelogin-linux-amd64.zip /usr/local/bin/bin && \
    # Cleanup
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 coordinator

# Copy package files and install production deps only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Create kube config directory and azure config directory
RUN mkdir -p /home/coordinator/.kube /home/coordinator/.azure && \
    chown -R coordinator:nodejs /home/coordinator/.kube /home/coordinator/.azure

# Copy built files
COPY --from=builder /app/dist ./dist

# Create data directory
RUN mkdir -p /app/data && chown -R coordinator:nodejs /app/data

# Switch to non-root user
USER coordinator

# Expose port
EXPOSE 3001

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Start server
CMD ["node", "dist/index.js"]

