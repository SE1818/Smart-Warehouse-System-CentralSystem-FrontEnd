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
  }

  options {
    timeout(time: 1, unit: 'HOURS')
    buildDiscarder(logRotator(numToKeepStr: '10'))
    disableConcurrentBuilds()
  }

  stages {
    stage('Checkout') {
      steps {
        dir('Smart-Warehouse-System-CentralSystem-FrontEnd') {
          checkout scm
        }
      }
    }

    stage('Install Dependencies') {
      steps {
        dir('Smart-Warehouse-System-CentralSystem-FrontEnd') {
          sh 'npm ci'
        }
      }
    }

    stage('Lint & Type Check') {
      steps {
        dir('Smart-Warehouse-System-CentralSystem-FrontEnd') {
          sh 'npm run lint --if-present'
          sh 'npx tsc --noEmit'
        }
      }
    }

    stage('Test') {
      steps {
        dir('Smart-Warehouse-System-CentralSystem-FrontEnd') {
          sh 'npx vitest run --coverage'
        }
      }
    }

    stage('SonarQube & Build') {
      steps {
        dir('Smart-Warehouse-System-CentralSystem-FrontEnd') {
          try {
            withCredentials([string(credentialsId: 'SONAR_TOKEN', variable: 'SONAR_TOKEN_CRED')]) {
              sh """
                npx sonar-scanner \
                  -Dsonar.projectKey="${env.SONAR_PROJECT_KEY}" \
                  -Dsonar.organization="${env.SONAR_ORGANIZATION}" \
                  -Dsonar.token="\${SONAR_TOKEN_CRED}" \
                  -Dsonar.host.url="https://sonarcloud.io" \
                  -Dsonar.sources=src \
                  -Dsonar.exclusions="**/node_modules/**,**/dist/**,**/*.spec.ts,**/*.test.ts" \
                  -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
              """
            }
          } catch (Exception e) {
            echo "SonarQube analysis skipped or failed: ${e.getMessage()}. Proceeding with standard build."
          }
          sh 'npm run build'
        }
      }
    }

    stage('Build Docker Image') {
      steps {
        script {
          def imageTag = "${env.BUILD_NUMBER}"
          dir('Smart-Warehouse-System-CentralSystem-FrontEnd') {
            sh "docker build -t ${env.IMAGE_NAME}:${imageTag} -t ${env.IMAGE_NAME}:latest ."
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
          def imageTag = "${env.BUILD_NUMBER}"
          try {
            withCredentials([usernamePassword(credentialsId: 'DOCKER_HUB_CREDS', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
              sh "docker login -u \$DOCKER_USER -p \$DOCKER_PASS ${env.REGISTRY}"
              sh "docker tag ${env.IMAGE_NAME}:${imageTag} \$DOCKER_USER/${env.IMAGE_NAME}:${imageTag}"
              sh "docker tag ${env.IMAGE_NAME}:latest \$DOCKER_USER/${env.IMAGE_NAME}:latest"
              sh "docker push \$DOCKER_USER/${env.IMAGE_NAME}:${imageTag}"
              sh "docker push \$DOCKER_USER/${env.IMAGE_NAME}:latest"
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
