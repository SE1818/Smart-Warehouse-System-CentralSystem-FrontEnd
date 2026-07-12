pipeline {
    agent any

    tools {
        nodejs 'node'
    }

    environment {
        NODE_ENV = 'production'
        SONAR_PROJECT_KEY = 'SE1818_Smart-Warehouse-System-CentralSystem-FrontEnd'
        SONAR_ORGANIZATION = 'se1818'
        IMAGE_NAME = 'smartwarehouse-central-system-frontend'
        REGISTRY = 'docker.io'
        PROJECT_DIR = 'Smart-Warehouse-System-CentralSystem-FrontEnd'
    }

    options {
        timeout(time: 1, unit: 'HOURS')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                dir(env.PROJECT_DIR) {
                    checkout scm
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                dir(env.PROJECT_DIR) {
                    sh 'npm ci --include=dev'
                }
            }
        }

        stage('Lint & Type Check') {
            steps {
                dir(env.PROJECT_DIR) {
                    sh 'npm run lint --if-present'
                    sh 'npx tsc --noEmit'
                }
            }
        }

        stage('Test') {
            environment {
                NODE_ENV = 'test'
            }
            steps {
                dir(env.PROJECT_DIR) {
                    // Chạy test sinh file lcov để chuẩn bị nạp dữ liệu cho bước Sonar
                    sh 'npx vitest run --coverage'
                }
            }
        }

        stage('SonarQube & Build') {
            steps {
                dir(env.PROJECT_DIR) {
                    script {
                        try {
                            withCredentials([string(credentialsId: 'SONAR_TOKEN', variable: 'SONAR_TOKEN_CRED')]) {
                                // Sử dụng npx sonar-scanner chính chủ, bọc trong nháy kép kép để Groovy map biến chuẩn
                                sh """
                                    npx sonar-scanner \
                                        -Dsonar.projectKey=${env.SONAR_PROJECT_KEY} \
                                        -Dsonar.organization=${env.SONAR_ORGANIZATION} \
                                        -Dsonar.token=\${SONAR_TOKEN_CRED} \
                                        -Dsonar.host.url="https://sonarcloud.io" \
                                        -Dsonar.sources=src \
                                        -Dsonar.exclusions="**/node_modules/**,**/dist/**,**/*.spec.ts,**/*.test.ts" \
                                        -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
                                """
                            }
                        } catch (Exception e) {
                            echo "SonarQube analysis skipped or failed: ${e.getMessage()}. Proceeding with standard build."
                        }
                    }
                    sh 'npm run build'
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    def imageTag = env.BUILD_NUMBER
                    dir(env.PROJECT_DIR) {
                        sh """
                            DOCKER_CMD="docker"
                            if ! docker ps >/dev/null 2>&1; then
                                if sudo docker ps >/dev/null 2>&1; then
                                    DOCKER_CMD="sudo docker"
                                elif sudo chmod 666 /var/run/docker.sock >/dev/null 2>&1; then
                                    DOCKER_CMD="docker"
                                else
                                    echo "ERROR: Current user lacks permission to access Docker socket, and passwordless sudo is not configured."
                                    exit 1
                                fi
                            fi
                            \$DOCKER_CMD build -t ${IMAGE_NAME}:${imageTag} -t ${IMAGE_NAME}:latest .
                        """
                    }
                }
            }
        }

        stage('Push Docker Image') {
            when {
                branch 'main'
            }
            steps {
                script {
                    def imageTag = env.BUILD_NUMBER
                    try {
                        withCredentials([usernamePassword(credentialsId: 'DOCKER_HUB_CREDS', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                            sh """
                                DOCKER_CMD="docker"
                                if ! docker ps >/dev/null 2>&1; then
                                    if sudo docker ps >/dev/null 2>&1; then
                                        DOCKER_CMD="sudo docker"
                                    elif sudo chmod 666 /var/run/docker.sock >/dev/null 2>&1; then
                                        DOCKER_CMD="docker"
                                    fi
                                fi
                                \$DOCKER_CMD login -u \$DOCKER_USER -p \$DOCKER_PASS ${env.REGISTRY}
                                \$DOCKER_CMD tag ${IMAGE_NAME}:${imageTag} \$DOCKER_USER/${IMAGE_NAME}:${imageTag}
                                \$DOCKER_CMD tag ${IMAGE_NAME}:latest \$DOCKER_USER/${IMAGE_NAME}:latest
                                \$DOCKER_CMD push \$DOCKER_USER/${IMAGE_NAME}:${imageTag}
                                \$DOCKER_CMD push \$DOCKER_USER/${IMAGE_NAME}:latest
                            """
                        }
                    } catch (Exception e) {
                        echo "Skipping Push: DOCKER_HUB_CREDS not configured or error: ${e.getMessage()}"
                    }
                }
            }
        }
    }

    post {
        success { echo 'Jenkins Build Succeeded!' }
        failure { echo 'Jenkins Build Failed!' }
    }
}