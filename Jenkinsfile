pipeline {
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
        timeout(time: 20, unit: 'MINUTES')
        ansiColor('xterm')
    }

    environment {
        TARGET_BRANCH = 'solum'
        COMPOSE_FILE  = 'docker-compose.solum.yml'
        ENV_FILE      = '.env.solum'
    }

    stages {
        stage('Pre-flight Checks') {
            steps {
                echo "=== [1/5] Checking Environment & Tools ==="
                sh '''
                    echo "Validating Docker and Docker Compose..."
                    docker --version
                    docker compose version

                    # Ensure .env.solum exists on the server, create from example if missing
                    if [ ! -f "${ENV_FILE}" ]; then
                        echo "Warning: ${ENV_FILE} not found. Creating default from .env.solum.example..."
                        cp .env.solum.example "${ENV_FILE}"
                    fi
                '''
            }
        }

        stage('Build Docker Images') {
            steps {
                echo "=== [2/5] Building Docker Images for Solum ==="
                sh '''
                    docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" build
                '''
            }
        }

        stage('Deploy to On-Prem') {
            steps {
                echo "=== [3/5] Starting / Updating Solum Containers ==="
                sh '''
                    docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d --remove-orphans
                '''
            }
        }

        stage('Health & Readiness Check') {
            steps {
                echo "=== [4/5] Verifying Deployment Health ==="
                sh '''
                    # Extract configured port or default to 80
                    APP_PORT=$(grep -E "^SOLUM_PORT=" "${ENV_FILE}" | cut -d '=' -f2 | tr -d ' ' || echo "80")
                    if [ -z "$APP_PORT" ]; then APP_PORT="80"; fi

                    echo "Waiting for services to become healthy on port ${APP_PORT}..."
                    MAX_RETRIES=15
                    COUNT=0
                    SUCCESS=0

                    while [ $COUNT -lt $MAX_RETRIES ]; do
                        sleep 4
                        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${APP_PORT}/healthz" || true)
                        API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${APP_PORT}/api/health" || true)

                        echo "Attempt $((COUNT+1))/$MAX_RETRIES - Web: ${HTTP_STATUS}, API: ${API_STATUS}"

                        if [ "$HTTP_STATUS" = "200" ] && [ "$API_STATUS" = "200" ]; then
                            echo "Deployment is HEALTHY and accepting requests!"
                            SUCCESS=1
                            break
                        fi
                        COUNT=$((COUNT+1))
                    done

                    if [ $SUCCESS -ne 1 ]; then
                        echo "Error: Health check failed after $MAX_RETRIES attempts."
                        docker compose -f "${COMPOSE_FILE}" logs --tail=100
                        exit 1
                    fi
                '''
            }
        }

        stage('Maintenance & Cleanup') {
            steps {
                echo "=== [5/5] Pruning Dangling Docker Resources ==="
                sh '''
                    # Free up disk space on the on-prem server
                    docker image prune -f || true
                '''
            }
        }
    }

    post {
        success {
            echo "SUCCESS: Solum tenant application deployed successfully on on-prem server!"
        }
        failure {
            echo "FAILURE: Deployment failed. Please review the console logs above."
            sh '''
                echo "=== Dumping recent container logs ==="
                docker compose -f "${COMPOSE_FILE}" logs --tail=50 || true
            '''
        }
    }
}
